#!/usr/bin/env python3
"""Exercise the shipped worker and AppLoad framing against disposable host files."""
import json
import os
from pathlib import Path
import shutil
import socket
import struct
import subprocess
import tempfile
import time
import unittest

APP = Path(__file__).resolve().parents[1]
BINARY = APP / "tools/image-worker/build/image-worker"
SNAPSHOT = [{"name": "Walk", "isPrivate": False, "polarity": "Positive",
             "entries": {"2026-09-01": "x"}}]


def boot_image():
    data = bytearray(1078 + 1872 * 1404)
    struct.pack_into("<2sI4xIIiiHHII", data, 0, b"BM", len(data), 1078,
                     40, 1872, 1404, 1, 8, 0, 1872 * 1404)
    return bytes(data)


class Worker:
    def __init__(self, directory, resource, lock):
        self.listener = socket.socket(socket.AF_UNIX, socket.SOCK_SEQPACKET)
        self.listener.bind(str(directory / "socket"))
        self.listener.listen(1)
        self.listener.settimeout(10)
        self.log = (directory / "worker.log").open("w+")
        self.process = subprocess.Popen([str(BINARY), str(directory / "socket"),
                                         str(resource), str(lock), str(directory / "environment.json")], stderr=self.log,
                                        env=dict(os.environ, QT_FORCE_STDERR_LOGGING="1"))
        self.connection, _ = self.listener.accept()
        self.connection.settimeout(15)
        self.sequence = 0
        for _ in range(100):
            self.send({"operation": "hello"})
            response = self.receive()
            if response.get("ready"):
                return
            time.sleep(0.05)
        raise AssertionError("Worker never became ready")

    def send(self, message, kind=1):
        body = json.dumps(message).encode() if kind == 1 else str(message).encode()
        self.connection.send(struct.pack("=ii", kind, len(body)))
        self.connection.send(body)

    def receive(self):
        header = self.connection.recv(8)
        if len(header) != 8:
            self.log.flush()
            self.log.seek(0)
            raise AssertionError("Worker disconnected: " + self.log.read())
        kind, size = struct.unpack("=ii", header)
        assert kind == 2
        body = self.connection.recv(size)
        assert len(body) == size
        return json.loads(body)

    def start(self, operation, **payload):
        self.sequence += 1
        identifier = str(self.sequence)
        self.send(dict(version=1, id=identifier, operation=operation, **payload))
        return identifier

    def done(self, identifier):
        while True:
            message = self.receive()
            if message.get("kind") == "done" and message.get("id") == identifier:
                return message

    def run(self, operation, **payload):
        return self.done(self.start(operation, **payload))

    def close(self):
        self.connection.close()
        self.listener.close()
        try:
            self.process.wait(10)
        except subprocess.TimeoutExpired:
            self.process.kill()
            self.process.wait()
        self.log.close()


class WorkerIntegration(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="habit-image-worker-")
        self.directory = Path(self.temporary.name)
        self.system = self.directory / "system"
        self.uboot = self.directory / "uboot"
        (self.system / "splash").mkdir(parents=True)
        self.uboot.mkdir()
        self.originals = {}
        for name in ["suspended", "poweroff", "batteryempty", "starting", "rebooting",
                     "overheating", "restart-crashed"]:
            self.originals[self.system / (name + ".png")] = ("original-" + name).encode()
        for path in [self.system / "splash/splash.bmp", self.uboot / "splash.bmp"]:
            self.originals[path] = boot_image()
        for path, data in self.originals.items():
            path.write_bytes(data)
        self.workers = []

    def tearDown(self):
        for worker in self.workers:
            worker.close()
        self.temporary.cleanup()

    def worker(self, profile="stable", device_model="reMarkable 1.0"):
        directory = self.directory / ("worker" + str(len(self.workers)))
        directory.mkdir()
        shutil.copytree(APP / "src", directory / "src")
        subprocess.run(["node", "scripts/stage-profile.mjs", profile, str(directory)],
                       cwd=APP, check=True)
        (directory / "environment.json").write_text(json.dumps({
            "appDirectory": str(directory),
            "imageDirectory": str(self.system),
            "bootImageDirectory": str(self.uboot),
            "deviceModel": device_model,
        }))
        # Apply the same staging transform as make; execution source stays unchanged.
        for path in (directory / "src/js").glob("*.js"):
            path.write_text(".pragma library\n" + path.read_text())
        subprocess.run(["rcc-qt5", "--binary", "-o", "resources.rcc", "application.qrc"],
                       cwd=directory, check=True)
        worker = Worker(directory, directory / "resources.rcc", self.directory / "images.lock")
        self.workers.append(worker)
        return worker, directory

    def assert_success(self, result):
        self.assertTrue(result["ok"], result)

    def test_backup_render_restore_and_no_client_paths(self):
        worker, directory = self.worker()
        self.assert_success(worker.run("backup", path=str(self.directory / "untrusted"),
                                              configuration={"imageDirectory": "/untrusted", "deviceModel": "wrong"}))
        for path, original in self.originals.items():
            self.assertEqual(path.read_bytes(), original)
        self.assert_success(worker.run("render", snapshot=SNAPSHOT, date="2026-09-22"))
        for path, original in self.originals.items():
            rendered = path.read_bytes()
            self.assertNotEqual(rendered, original, str(path))
            self.assertTrue(rendered.startswith(b"BM" if path.suffix == ".bmp" else b"\x89PNG"))
        rendered_images = {path: path.read_bytes() for path in self.originals}
        (self.system / "suspended.png").write_bytes(b"replaced by another app")
        self.assert_success(worker.run("render", snapshot=SNAPSHOT, date="2026-09-22"))
        for path, rendered in rendered_images.items():
            self.assertEqual(path.read_bytes(), rendered)
        self.assertFalse((self.directory / "untrusted").exists())
        self.assert_success(worker.run("restore"))
        for path, original in self.originals.items():
            self.assertEqual(path.read_bytes(), original)
        self.assertEqual(json.loads((directory / ".sleep-sig").read_text()), "")

    def test_runtime_check_loads_packaged_resources_without_writing_images(self):
        for profile in ["stable", "test"]:
            _, directory = self.worker(profile)
            result = subprocess.run(
                [str(BINARY), "--check-runtime", str(directory / "resources.rcc"),
                 str(self.directory / "unused.lock"), str(directory / "environment.json")],
                capture_output=True, text=True, timeout=10,
                env=dict(os.environ, QT_FORCE_STDERR_LOGGING="1"))
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("runtime ready", result.stderr)
        for path, original in self.originals.items():
            self.assertEqual(path.read_bytes(), original)
        self.assertFalse((self.directory / "unused.lock").exists())

    def test_bootstrap_device_guard_rejects_before_writing(self):
        worker, _ = self.worker(device_model="reMarkable 2.0")
        result = worker.run("render", snapshot=SNAPSHOT, date="2026-09-22",
                            configuration={"deviceModel": "reMarkable 1.0"})
        self.assertFalse(result["ok"], result)
        for path, original in self.originals.items():
            self.assertEqual(path.read_bytes(), original)

    def test_rejects_invalid_snapshot_and_stable_developer_commands(self):
        worker, _ = self.worker()
        worker.send(None)
        for operation, payload in [
            ("unknown", {}),
            ("render", {"snapshot": SNAPSHOT, "date": "2026-02-30"}),
            ("render", {"snapshot": [{}], "date": "2026-09-22"}),
            ("developer-write", {"snapshot": SNAPSHOT, "date": "2026-09-22"}),
        ]:
            self.assertFalse(worker.run(operation, **payload)["ok"])
        for path, original in self.originals.items():
            self.assertEqual(path.read_bytes(), original)

    def test_detached_worker_finishes_render_then_exits(self):
        worker, _ = self.worker()
        identifier = worker.start("render", snapshot=SNAPSHOT, date="2026-09-22")
        worker.send(0, -3)
        self.assert_success(worker.done(identifier))
        self.assertEqual(worker.process.wait(5), 0)
        for path, original in self.originals.items():
            self.assertNotEqual(path.read_bytes(), original)

    def test_handoff_accepts_latest_snapshot_before_detach_and_finishes_it(self):
        worker, directory = self.worker()
        first = worker.start("render", snapshot=SNAPSHOT, date="2026-09-22")
        while worker.receive().get("kind") != "progress":
            pass
        latest = [dict(SNAPSHOT[0], name="Latest before closing")]
        final = worker.start("handoff", snapshot=latest, date="2026-09-22")
        while True:
            message = worker.receive()
            self.assertNotEqual(message.get("kind"), "done", message)
            if message.get("kind") == "accepted":
                self.assertEqual(message["id"], final)
                break
        worker.send(0, -3)
        self.assertTrue(worker.done(first)["busy"])
        self.assert_success(worker.done(final))
        self.assertEqual(worker.process.wait(5), 0)
        signature = json.loads((directory / ".sleep-sig").read_text())
        self.assertIn("Latest before closing", signature)
        for path, original in self.originals.items():
            self.assertNotEqual(path.read_bytes(), original)

    def test_identical_handoff_does_not_render_twice_and_keeps_lock(self):
        worker, _ = self.worker()
        other, _ = self.worker("test")
        first = worker.start("render", snapshot=SNAPSHOT, date="2026-09-22")
        while worker.receive().get("kind") != "progress":
            pass
        final = worker.start("handoff", snapshot=SNAPSHOT, date="2026-09-22")
        while worker.receive().get("kind") != "accepted":
            pass
        rejected = other.run("handoff", snapshot=SNAPSHOT, date="2026-09-22")
        self.assertFalse(rejected["ok"])
        worker.send(0, -3)
        result = worker.done(first)
        self.assert_success(result)
        self.assertFalse(result["busy"])
        self.assertEqual(worker.process.wait(5), 0)

    def test_disconnected_worker_finishes_render(self):
        worker, _ = self.worker()
        worker.start("render", snapshot=SNAPSHOT, date="2026-09-22")
        while worker.receive().get("kind") != "progress":
            pass
        worker.connection.close()
        self.assertEqual(worker.process.wait(15), 0)
        for path, original in self.originals.items():
            self.assertNotEqual(path.read_bytes(), original)

    def test_stable_and_test_processes_cannot_write_concurrently(self):
        stable, _ = self.worker()
        testing, _ = self.worker("test")
        identifier = stable.start("render", snapshot=SNAPSHOT, date="2026-09-22")
        while stable.receive().get("kind") != "progress":
            pass
        result = testing.run("developer-preview", snapshot=SNAPSHOT, date="2026-09-22")
        self.assertFalse(result["ok"], result)
        self.assert_success(stable.done(identifier))
        self.assert_success(testing.run("developer-preview", snapshot=SNAPSHOT, date="2026-09-22"))

    def test_test_profile_preview_one_shot_and_restore(self):
        worker, directory = self.worker("test")
        self.assert_success(worker.run("developer-preview", snapshot=SNAPSHOT, date="2026-09-22"))
        self.assertTrue((directory / "developer-preview.png").read_bytes().startswith(b"\x89PNG"))
        path = self.system / "suspended.png"
        self.assertEqual(path.read_bytes(), self.originals[path])
        self.assert_success(worker.run("developer-write", snapshot=SNAPSHOT, date="2026-09-22"))
        self.assert_success(worker.run("developer-restore"))
        self.assert_success(worker.run("developer-write-all", snapshot=SNAPSHOT, date="2026-09-22"))
        for path, original in self.originals.items():
            self.assertNotEqual(path.read_bytes(), original)
        self.assert_success(worker.run("developer-restore-all"))
        for path, original in self.originals.items():
            self.assertEqual(path.read_bytes(), original)


if __name__ == "__main__":
    unittest.main(verbosity=2)
