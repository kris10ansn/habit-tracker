#!/usr/bin/env python3
"""Host-only black-box tests: launch the writer and act as AppLoad using disposable files."""
import hashlib
import json
import os
from pathlib import Path
import socket
import struct
import subprocess
import tempfile
import unittest

APP = Path(__file__).resolve().parents[1]
BINARY = Path(os.environ.get("POWER_IMAGE_WRITER_BINARY", APP / "build/host/power-image-writer"))
CONTRACT = json.loads((APP / "tests/habit-contract.json").read_text())


def boot_image():
    data = bytearray(1078 + 1872 * 1404)
    struct.pack_into("<2sI4xIIiiHHII", data, 0, b"BM", len(data), 1078,
                     40, 1872, 1404, 1, 8, 0, 1872 * 1404)
    return bytes(data)


class Worker:
    def __init__(self, directory, lock):
        self.directory = directory
        self.listener = socket.socket(socket.AF_UNIX, socket.SOCK_SEQPACKET)
        self.listener.bind(str(directory / "socket"))
        self.listener.listen(1)
        self.listener.settimeout(10)
        self.log = (directory / "worker.log").open("w+")
        self.process = subprocess.Popen([str(BINARY), str(directory / "socket"),
                                         str(directory / "environment.json"), str(lock)],
                                        cwd=directory, stderr=self.log)
        self.connection, _ = self.listener.accept()
        self.connection.settimeout(15)
        self.sequence = 0
        self.send({"operation": "hello", "version": 2})
        response = self.receive()
        assert response["ready"] and response["version"] == 2, response

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
        defaults = {
            "date": CONTRACT["date"],
            "expected": {
                "roster": hashlib.md5((self.directory / "data/roster.json").read_bytes()).hexdigest(),
                "month": hashlib.md5((self.directory / "data/2026-08.json").read_bytes()).hexdigest(),
            },
        }
        defaults.update(payload)
        self.send(dict(version=2, id=identifier, operation=operation, **defaults))
        return identifier

    def done(self, identifier):
        progress = []
        while True:
            message = self.receive()
            if message.get("kind") == "done" and message.get("id") == identifier:
                return message, progress
            progress.append(message)

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


class Integration(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="native-power-writer-")
        self.directory = Path(self.temporary.name)
        self.system = self.directory / "system"
        self.uboot = self.directory / "uboot"
        (self.system / "splash").mkdir(parents=True)
        self.uboot.mkdir()
        self.originals = {}
        for name in ["suspended", "poweroff", "batteryempty", "starting", "rebooting", "restart-crashed"]:
            self.originals[self.system / (name + ".png")] = ("original-" + name).encode()
        for path in [self.system / "splash/splash.bmp", self.uboot / "splash.bmp"]:
            self.originals[path] = boot_image()
        for path, data in self.originals.items():
            path.write_bytes(data)
        self.workers = []
        self.count = 0

    def tearDown(self):
        for worker in self.workers:
            worker.close()
        self.temporary.cleanup()

    def prepare(self, testing=False, model="reMarkable 1.0"):
        directory = self.directory / ("app" + str(self.count))
        self.count += 1
        (directory / "data").mkdir(parents=True)
        (directory / "data/roster.json").write_text(json.dumps(CONTRACT["roster"]))
        (directory / "data/2026-08.json").write_text(json.dumps(CONTRACT["month"]))
        (directory / "settings.json").write_text(json.dumps({"suspendImageEnabled": True}))
        (directory / "writer-profile.json").write_text(json.dumps({"testProfile": testing}))
        (directory / "environment.json").write_text(json.dumps({
            "appDirectory": str(directory), "imageDirectory": str(self.system),
            "bootImageDirectory": str(self.uboot), "deviceModel": model, "testProfile": testing,
        }))
        return directory

    def worker(self, testing=False, model="reMarkable 1.0"):
        directory = self.prepare(testing, model)
        worker = Worker(directory, self.directory / "images.lock")
        self.workers.append(worker)
        return worker, directory

    def cli(self, directory, *arguments):
        return subprocess.run([str(BINARY), *arguments, "--environment", str(directory / "environment.json"),
                               "--lock-file", str(self.directory / "images.lock")],
                              capture_output=True, timeout=15)

    def success(self, result):
        self.assertTrue(result["ok"], result)

    def test_backup_render_progress_restore_without_frontend_resources(self):
        worker, directory = self.worker()
        self.assertFalse((directory / "resources.rcc").exists())
        self.success(worker.run("backup")[0])
        result, messages = worker.run("render")
        self.success(result)
        progress = [message["imageProgress"] for message in messages if message.get("imageProgress")]
        selected = list(self.originals)
        self.assertEqual(progress, [{"path": str(path), "remainingImages": len(selected) - index - 1}
                                    for index, path in enumerate(selected)])
        for path, original in self.originals.items():
            rendered = path.read_bytes()
            self.assertNotEqual(rendered, original)
            self.assertTrue(rendered.startswith(b"BM" if path.suffix == ".bmp" else b"\x89PNG"))
        (directory / "settings.json").write_text('{"suspendImageEnabled":false,"powerImageRestorePending":true}')
        self.success(worker.run("restore")[0])
        for path, original in self.originals.items():
            self.assertEqual(path.read_bytes(), original)
        self.assertFalse(worker.run("render")[0]["ok"])

    def test_stale_capture_fails_before_any_image_changes(self):
        worker, _ = self.worker()
        result, messages = worker.run("render", expected={"roster": "0" * 32, "month": "missing"})
        self.assertTrue(result["superseded"])
        self.assertFalse(any(message.get("kind") == "captured" for message in messages))
        for path, original in self.originals.items():
            self.assertEqual(path.read_bytes(), original)

    def test_detach_finishes_the_accepted_batch(self):
        worker, _ = self.worker()
        identifier = worker.start("render")
        worker.send(0, -3)
        self.success(worker.done(identifier)[0])
        self.assertEqual(worker.process.wait(5), 0)
        for path, original in self.originals.items():
            self.assertNotEqual(path.read_bytes(), original)

    def test_disconnect_finishes_the_accepted_batch(self):
        worker, _ = self.worker()
        worker.start("render")
        while worker.receive().get("kind") != "captured":
            pass
        worker.connection.close()
        self.assertEqual(worker.process.wait(10), 0)
        for path, original in self.originals.items():
            self.assertNotEqual(path.read_bytes(), original)

    def test_standalone_policy_refuses_an_active_app_session(self):
        _, directory = self.worker()
        result = self.cli(directory, "render", "--date", CONTRACT["date"])
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(b"Close the habit app", result.stderr)

    def test_standalone_preview_and_opt_in_enforcement(self):
        directory = self.prepare()
        (directory / "settings.json").write_text('{"suspendImageEnabled":false}')
        result = self.cli(directory, "render", "--date", CONTRACT["date"])
        self.assertNotEqual(result.returncode, 0)
        output = directory / "preview.png"
        result = self.cli(directory, "preview", "--date", CONTRACT["date"], "--out", str(output), "--state", "off")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(output.read_bytes().startswith(b"\x89PNG"))
        result = self.cli(directory, "preview", "--out", str(self.system / "suspended.png"))
        self.assertNotEqual(result.returncode, 0)
        for path, original in self.originals.items():
            self.assertEqual(path.read_bytes(), original)

    def test_preview_cannot_write_device_images_through_directory_alias(self):
        directory = self.prepare()
        alias = directory / "image-alias"
        alias.symlink_to(self.system, target_is_directory=True)
        result = self.cli(directory, "preview", "--date", CONTRACT["date"],
                          "--out", str(alias / "suspended.png"))
        self.assertNotEqual(result.returncode, 0)
        for path, original in self.originals.items():
            self.assertEqual(path.read_bytes(), original)

    def test_cli_automatically_respects_installed_test_profile(self):
        directory = self.prepare(testing=True)
        result = subprocess.run([str(BINARY), "render", "--app-dir", str(directory),
                                 "--date", CONTRACT["date"], "--lock-file", str(self.directory / "images.lock")],
                                capture_output=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue((directory / "suspend-preview.png").exists())

    def test_profile_isolation_and_explicit_developer_operations(self):
        worker, directory = self.worker(testing=True)
        self.success(worker.run("render")[0])
        self.assertTrue((directory / "suspend-preview.png").exists())
        for path, original in self.originals.items():
            self.assertEqual(path.read_bytes(), original)
        for operation in ["developer-preview", "developer-write", "developer-restore", "developer-write-all", "developer-restore-all"]:
            self.success(worker.run(operation)[0])
        for name in ["developer-preview.png", "developer-poweroff.png", "developer-batteryempty.png",
                     "developer-starting.png", "developer-rebooting.png",
                     "developer-restart-crashed.png", "developer-boot-splash.bmp"]:
            self.assertTrue((directory / name).exists(), name)
        for path, original in self.originals.items():
            self.assertEqual(path.read_bytes(), original)

    def test_stable_rejects_developer_commands_and_input_paths(self):
        worker, _ = self.worker()
        self.assertFalse(worker.run("developer-write")[0]["ok"])
        self.success(worker.run("render", appDirectory="/untrusted", imageDirectory="/untrusted", snapshot=[])[0])
        for path, original in self.originals.items():
            self.assertNotEqual(path.read_bytes(), original)

    def test_global_lock_excludes_two_profiles(self):
        stable, _ = self.worker()
        testing, _ = self.worker(testing=True)
        identifier = stable.start("render")
        while stable.receive().get("kind") != "captured":
            pass
        self.assertFalse(testing.run("developer-write")[0]["ok"])
        self.success(stable.done(identifier)[0])
        self.success(testing.run("developer-preview")[0])

    def test_runtime_check_has_no_write_side_effects(self):
        directory = self.prepare()
        result = self.cli(directory, "check-runtime")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(b"runtime ready", result.stdout)
        self.assertFalse((directory / ".writer-session.lock").exists())
        for path, original in self.originals.items():
            self.assertEqual(path.read_bytes(), original)


if __name__ == "__main__":
    unittest.main(verbosity=2)
