#!/usr/bin/env python3
"""Compare committed AppLoad workers with temporary files only; no device access."""
import argparse
import copy
import hashlib
import json
import os
from pathlib import Path
import random
import shutil
import socket
import statistics
import struct
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[3]
DATE = '2026-09-09'
PNG_NAMES = ['suspended', 'poweroff', 'batteryempty', 'starting', 'rebooting', 'overheating', 'restart-crashed']


def run(args, **kwargs):
    return subprocess.run(args, check=True, stdout=subprocess.DEVNULL, **kwargs)


def boot_image():
    contents = bytearray(1078 + 1872 * 1404)
    struct.pack_into('<2sI4xIIiiHHII', contents, 0, b'BM', len(contents), 1078, 40, 1872, 1404, 1, 8, 0, 1872 * 1404)
    return contents


def dataset(fixture, habits_count):
    if habits_count == 5:
        habits = copy.deepcopy(fixture['habits'])
        entries = copy.deepcopy(fixture['entries'])
    else:
        habits = [dict(id=f'habit-{index}', name=f'Habit {index + 1:02d}', polarity='Negative' if index % 5 == 0 else 'Positive',
                       isPrivate=False, createdAt=1, editedAt=1, deletedAt=None) for index in range(habits_count)]
        entries = [dict(habitId=habit['id'], date=f'2026-09-{day:02d}', outcome='Success' if (index + day) % 4 else 'Failure',
                        editedAt=1, deletedAt=None) for index, habit in enumerate(habits) for day in range(1, 10)]
    for entry in entries:
        entry['outcome'] = 'x' if entry['outcome'] == 'Success' else 'o'
    return {'habits': habits}, {'month': '2026-09', 'entries': entries}


def stage_resources(old_app, directory, profile):
    shutil.copytree(old_app / 'src', directory / 'src')
    run(['node', 'scripts/stage-profile.mjs', profile, str(directory)], cwd=old_app)
    for source in (directory / 'src/js').glob('*.js'):
        source.write_text('.pragma library\n' + source.read_text())
    run(['rcc-qt5', '--binary', '-o', 'resources.rcc', 'application.qrc'], cwd=directory)


class Worker:
    def __init__(self, root, version, binary, case, roster, month):
        self.version = version
        self.directory = root / f'{version}-{case}'
        self.directory.mkdir()
        (self.directory / 'data').mkdir()
        self.roster = roster
        self.month = month
        self.identifier = 0
        self.system = self.directory / 'system'
        self.uboot = self.directory / 'uboot'
        (self.system / 'splash').mkdir(parents=True)
        self.uboot.mkdir()
        for name in PNG_NAMES:
            (self.system / f'{name}.png').write_bytes(f'original-{name}'.encode())
        for output in [self.system / 'splash/splash.bmp', self.uboot / 'splash.bmp']:
            output.write_bytes(boot_image())
        self.single = case == 'single_5'
        self.prepare(0)
        configuration = dict(appDirectory=str(self.directory), imageDirectory=str(self.system),
                             bootImageDirectory=str(self.uboot), deviceModel='reMarkable 1.0', testProfile=self.single)
        (self.directory / 'environment.json').write_text(json.dumps(configuration))
        (self.directory / 'settings.json').write_text('{"suspendImageEnabled":true}')
        (self.directory / 'writer-profile.json').write_text(json.dumps({'testProfile': self.single}))
        resource = root / ('resource-test' if self.single else 'resource-stable') / 'resources.rcc'
        self.listener = socket.socket(socket.AF_UNIX, socket.SOCK_SEQPACKET)
        endpoint = self.directory / 'socket'
        self.listener.bind(str(endpoint))
        self.listener.listen(1)
        self.listener.settimeout(30)
        self.log = (self.directory / 'worker.log').open('w+')
        args = [str(binary), str(endpoint)]
        if version == 'qml_pr53':
            args += [str(resource), str(self.directory / 'images.lock'), str(self.directory / 'environment.json')]
        else:
            args += [str(self.directory / 'environment.json'), str(self.directory / 'images.lock')]
        start = time.perf_counter_ns()
        self.process = subprocess.Popen(args, cwd=self.directory, stdout=self.log, stderr=self.log)
        self.connection, _ = self.listener.accept()
        self.connection.settimeout(90)
        for _ in range(400):
            self.send({'operation': 'hello', 'version': 1 if version == 'qml_pr53' else 2})
            response = self.receive()
            if response.get('ready'):
                self.startup_ms = (time.perf_counter_ns() - start) / 1e6
                break
            time.sleep(0.005)
        else:
            raise RuntimeError('Worker never became ready')

    def prepare(self, revision):
        month = copy.deepcopy(self.month)
        first_id = self.roster['habits'][0]['id']
        for entry in month['entries']:
            if entry['habitId'] == first_id and entry['date'] == DATE:
                entry['outcome'] = 'x' if revision % 2 else 'o'
        roster_bytes = json.dumps(self.roster).encode()
        month_bytes = json.dumps(month).encode()
        (self.directory / 'data/roster.json').write_bytes(roster_bytes)
        (self.directory / 'data/2026-09.json').write_bytes(month_bytes)
        self.expected = dict(roster=hashlib.md5(roster_bytes).hexdigest(), month=hashlib.md5(month_bytes).hexdigest())
        self.snapshot = [dict(name=habit['name'], polarity=habit['polarity'], isPrivate=habit['isPrivate'],
                              entries={entry['date']: entry['outcome'] for entry in month['entries']
                                       if entry['habitId'] == habit['id'] and not entry['deletedAt']})
                         for habit in self.roster['habits'] if not habit['deletedAt']]

    def send(self, message):
        body = json.dumps(message).encode()
        assert len(body) <= 65536
        self.connection.sendall(struct.pack('=ii', 1, len(body)))
        self.connection.sendall(body)

    def receive(self):
        header = self.connection.recv(8)
        if len(header) != 8:
            self.log.seek(0)
            raise RuntimeError(self.log.read())
        kind, length = struct.unpack('=ii', header)
        assert kind == 2
        body = self.connection.recv(length)
        assert len(body) == length
        return json.loads(body)

    def render(self):
        self.identifier += 1
        payload = dict(version=1, snapshot=self.snapshot) if self.version == 'qml_pr53' else dict(version=2, expected=self.expected)
        start = time.perf_counter_ns()
        self.send(dict(id=str(self.identifier), operation='render', date=DATE, **payload))
        images_started = 0
        while True:
            response = self.receive()
            if response.get('imageProgress'):
                images_started += 1
            if response.get('kind') == 'done' and response.get('id') == str(self.identifier):
                elapsed = (time.perf_counter_ns() - start) / 1e6
                if not response.get('ok'):
                    raise RuntimeError(response)
                return elapsed, images_started

    def verify(self):
        outputs = [self.directory / 'suspend-preview.png'] if self.single else [self.system / f'{name}.png' for name in PNG_NAMES] + [self.system / 'splash/splash.bmp', self.uboot / 'splash.bmp']
        for output in outputs:
            contents = output.read_bytes()
            assert contents.startswith(b'BM' if output.suffix == '.bmp' else b'\x89PNG'), output
        return {str(output.relative_to(self.directory)): output.stat().st_size for output in outputs}

    def close(self):
        self.connection.close()
        self.listener.close()
        try:
            self.process.wait(10)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait()
        assert self.process.returncode == 0
        self.log.close()


def summary(values):
    ordered = sorted(values)
    return dict(median_ms=statistics.median(values), minimum_ms=min(values), maximum_ms=max(values),
                q1_ms=ordered[len(ordered)//4], q3_ms=ordered[3*len(ordered)//4], samples_ms=values)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--baseline-tree', type=Path, required=True,
                        help='Extracted PR #53 repository with an optimized tools/image-worker build')
    parser.add_argument('--initial-binary', type=Path, required=True)
    parser.add_argument('--current-binary', type=Path, required=True)
    parser.add_argument('--fixture', type=Path, default=ROOT / 'tools/readme-screenshots/fixture.json')
    parser.add_argument('--samples', type=int, default=12)
    parser.add_argument('--warmup', type=int, default=2)
    parser.add_argument('--out', type=Path, required=True)
    arguments = parser.parse_args()
    if arguments.samples < 1 or arguments.warmup < 0:
        parser.error('Use at least one sample and a nonnegative warmup count')
    old_app = arguments.baseline_tree.resolve() / 'apps/remarkable'
    versions = {
        'qml_pr53': old_app / 'tools/image-worker/build/image-worker',
        'native_initial': arguments.initial_binary.resolve(),
        'native_current': arguments.current_binary.resolve(),
    }
    fixture = json.loads(arguments.fixture.read_text())
    affinity = sorted(os.sched_getaffinity(0))
    cpu = affinity[-1]
    os.sched_setaffinity(0, {cpu})
    report = dict(samples=arguments.samples, warmup=arguments.warmup, cpu=cpu, date=DATE,
                  platform=dict(system=os.uname().sysname, release=os.uname().release, architecture=os.uname().machine), cases={})
    randomizer = random.Random(20260927)
    with tempfile.TemporaryDirectory(prefix='pwbench-') as temporary:
        root = Path(temporary)
        for profile in ['stable', 'test']:
            directory = root / f'resource-{profile}'
            directory.mkdir()
            stage_resources(old_app, directory, profile)
        for case, habit_count in [('single_5', 5), ('batch_5', 5), ('batch_30', 30)]:
            workers = []
            records = {version: {'changed': [], 'unchanged': []} for version in versions}
            try:
                roster, month = dataset(fixture, habit_count)
                for version in versions:
                    worker = Worker(root, version, versions[version], case, roster, month)
                    workers.append(worker)
                    first_ms, image_count = worker.render()
                    assert image_count == (1 if worker.single else 9), (case, version, image_count)
                    records[version].update(startup_ms=worker.startup_ms, first_batch_ms=first_ms)
                    print(case, version, 'first', round(first_ms, 2), 'ms', flush=True)
                for iteration in range(arguments.warmup + arguments.samples):
                    order = workers.copy()
                    randomizer.shuffle(order)
                    for worker in order:
                        worker.prepare(iteration + 1)
                        elapsed, count = worker.render()
                        assert count == (1 if worker.single else 9), (case, worker.version, count)
                        unchanged, unchanged_count = worker.render()
                        assert unchanged_count == (count if worker.version == 'qml_pr53' else 0)
                        if iteration >= arguments.warmup:
                            records[worker.version]['changed'].append(elapsed)
                            records[worker.version]['unchanged'].append(unchanged)
                    print(case, 'round', iteration + 1, flush=True)
                for worker in workers:
                    records[worker.version]['outputs'] = worker.verify()
                for version in records:
                    records[version]['changed'] = summary(records[version]['changed'])
                    records[version]['unchanged'] = summary(records[version]['unchanged'])
                report['cases'][case] = records
                arguments.out.write_text(json.dumps(report, indent=2) + '\n')
            finally:
                for worker in workers:
                    worker.close()
    print('Saved', arguments.out, flush=True)


if __name__ == '__main__':
    main()
