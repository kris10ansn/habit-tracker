#!/usr/bin/env python3
"""Host integration tests; every output lives in TemporaryDirectory, never on a tablet."""
import json
import os
from pathlib import Path
import socket
import struct
import subprocess
import tempfile
import time
import unittest
import urllib.error
import urllib.request
import zlib

APP = Path(__file__).resolve().parents[1]
BINARY = APP / "tools/suspend-writer/build/suspend-writer"


def original_png():
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(b"\0\xff\xff\xff")) + chunk(b"IEND", b""))


def snapshot(name="Read", private=False):
    return {"date": "2026-08-17", "rendererSignature": name,
            "roster": {"habits": [{"id": "one", "name": name, "polarity": "Positive",
                "isPrivate": private, "createdAt": 1750000000000, "editedAt": 1750000000000}]},
            "month": {"month": "2026-08", "entries": []}}


class Helper:
    def __init__(self, root, profile="stable", gated=False):
        self.root = root
        self.images = root / "images"
        self.images.mkdir()
        self.app = root / "app"
        self.app.mkdir()
        for name in ("suspended", "poweroff", "batteryempty"):
            (self.images / (name + ".png")).write_bytes(original_png())
        with socket.socket() as reservation:
            reservation.bind(("127.0.0.1", 0))
            self.port = reservation.getsockname()[1]
        environment = dict(os.environ)
        if gated:
            self.gate = root / "worker-gate"
            os.mkfifo(self.gate)
            environment["HABIT_TRACKER_TEST_GATE"] = str(self.gate)
        self.log = (root / "helper.log").open("w+")
        self.process = subprocess.Popen([str(BINARY), "--serve", "--profile", profile,
            "--app-dir", str(self.app), "--image-dir", str(self.images),
            "--js-dir", str(APP / "src/js"), "--port", str(self.port)], env=environment,
            stdout=self.log, stderr=self.log)
        deadline = time.monotonic() + 5
        while not (self.app / "power-image-token.json").exists():
            if self.process.poll() is not None or time.monotonic() > deadline:
                self.close()
                raise RuntimeError("Helper did not start")
            time.sleep(.01)
        self.token = json.loads((self.app / "power-image-token.json").read_text())

    def request(self, operation, payload=None, token=None):
        request = urllib.request.Request(f"http://127.0.0.1:{self.port}/{operation}",
            data=json.dumps(payload or {}).encode(), headers={"Content-Type": "application/json",
                "Authorization": "Bearer " + (self.token if token is None else token)})
        with urllib.request.urlopen(request, timeout=5) as response:
            return json.load(response)

    def wait(self, accepted):
        if not accepted.get("accepted"):
            return accepted
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            result = self.request("status", {"jobId": accepted["jobId"]})
            if not result.get("pending"):
                return result
            time.sleep(.02)
        raise AssertionError("Worker did not finish")

    def run(self, operation, payload=None):
        return self.wait(self.request(operation, payload))

    def close(self):
        if self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()
        self.log.close()


class PowerImageServiceTests(unittest.TestCase):
    def helper(self, profile="stable", gated=False):
        directory = tempfile.TemporaryDirectory(prefix="power-image-test-")
        self.addCleanup(directory.cleanup)
        helper = Helper(Path(directory.name), profile, gated)
        self.addCleanup(helper.close)
        return helper

    def test_render_backup_dedup_restore_and_optional_targets(self):
        helper = self.helper()
        self.assertTrue(helper.run("render", snapshot())["ok"])
        path = helper.images / "suspended.png"
        self.assertNotEqual(path.read_bytes(), original_png())
        self.assertEqual((helper.images / "suspended.png.bak").read_bytes(), original_png())
        modified = path.stat().st_mtime_ns
        self.assertTrue(helper.run("render", snapshot())["ok"])
        self.assertEqual(path.stat().st_mtime_ns, modified)
        self.assertFalse((helper.images / "starting.png").exists())
        (helper.images / "starting.png").write_bytes(original_png())
        self.assertTrue(helper.run("render", snapshot())["ok"])
        self.assertNotEqual((helper.images / "starting.png").read_bytes(), original_png())
        self.assertTrue(helper.run("restore")["ok"])
        self.assertEqual(path.read_bytes(), original_png())
        self.assertEqual((helper.app / ".power-image-signature").read_bytes(), b"")
        self.assertFalse(helper.run("render", snapshot())["ok"])
        self.assertTrue(helper.run("backup")["ok"])
        self.assertTrue(helper.run("render", snapshot())["ok"])
        self.assertNotEqual(path.read_bytes(), original_png())

    def test_invalid_original_prevents_every_replacement(self):
        helper = self.helper()
        (helper.images / "batteryempty.png").write_bytes(b"corrupt")
        self.assertFalse(helper.run("render", snapshot())["ok"])
        self.assertEqual((helper.images / "suspended.png").read_bytes(), original_png())
        self.assertFalse((helper.app / ".power-image-signature").exists())

    def test_failed_partial_batch_invalidates_old_signature(self):
        helper = self.helper()
        self.assertTrue(helper.run("render", snapshot("Old"))["ok"])
        original_render = (helper.images / "suspended.png").read_bytes()
        blocked = helper.images / "poweroff.png"
        blocked.unlink()
        blocked.mkdir()
        self.assertFalse(helper.run("render", snapshot("New"))["ok"])
        self.assertEqual((helper.app / ".power-image-signature").read_bytes(), b"")
        self.assertNotEqual((helper.images / "suspended.png").read_bytes(), original_render)
        blocked.rmdir()
        self.assertTrue(helper.run("render", snapshot("Old"))["ok"])
        self.assertEqual((helper.images / "suspended.png").read_bytes(), original_render)

    def test_failed_restore_validates_all_backups_first(self):
        helper = self.helper()
        self.assertTrue(helper.run("render", snapshot())["ok"])
        rendered = (helper.images / "suspended.png").read_bytes()
        (helper.images / "poweroff.png.bak").write_bytes(b"corrupt")
        self.assertFalse(helper.run("restore")["ok"])
        self.assertEqual((helper.images / "suspended.png").read_bytes(), rendered)

    def test_symlink_survives_render_and_restore(self):
        helper = self.helper()
        (helper.images / "rebooting.png").write_bytes(original_png())
        alias = helper.images / "restart-crashed.png"
        alias.symlink_to("rebooting.png")
        self.assertTrue(helper.run("render", snapshot())["ok"])
        self.assertTrue(alias.is_symlink())
        self.assertTrue(helper.run("restore")["ok"])
        self.assertTrue(alias.is_symlink())
        self.assertEqual(alias.read_bytes(), original_png())

    def test_private_habits_are_never_rendered(self):
        helper = self.helper("test")
        self.assertTrue(helper.run("preview", snapshot(private=True))["ok"])
        hidden = (helper.app / "suspend-preview.png").read_bytes()
        empty = snapshot()
        empty["roster"]["habits"] = []
        self.assertTrue(helper.run("preview", empty)["ok"])
        self.assertEqual((helper.app / "suspend-preview.png").read_bytes(), hidden)

    def test_test_profile_isolated_and_explicit_write_preserves_original(self):
        helper = self.helper("test")
        self.assertTrue(helper.run("render", snapshot())["ok"])
        self.assertEqual((helper.images / "suspended.png").read_bytes(), original_png())
        self.assertTrue(helper.run("test-write")["ok"])
        self.assertNotEqual((helper.images / "suspended.png").read_bytes(), original_png())
        self.assertTrue(helper.run("preview", snapshot("New"))["ok"])
        self.assertTrue(helper.run("test-write")["ok"])
        self.assertEqual((helper.app / "device-suspend-original.png").read_bytes(), original_png())
        self.assertTrue(helper.run("test-restore")["ok"])
        self.assertEqual((helper.images / "suspended.png").read_bytes(), original_png())

    def test_invalid_snapshot_and_unauthorized_request_never_write(self):
        helper = self.helper()
        self.assertFalse(helper.run("render", {"roster": {}})["ok"])
        with self.assertRaises(urllib.error.HTTPError) as error:
            helper.request("render", snapshot(), token="wrong")
        self.assertEqual(error.exception.code, 403)
        error.exception.close()
        self.assertEqual((helper.images / "suspended.png").read_bytes(), original_png())
        self.assertFalse(helper.run("test-write")["ok"])

    def test_blocked_worker_does_not_block_acceptance_status_or_cancellation(self):
        helper = self.helper(gated=True)
        active = helper.request("render", snapshot("First"))
        second = helper.request("render", snapshot("Second"))
        newest = helper.request("render", snapshot("Newest"))
        self.assertTrue(helper.request("status", {"jobId": active["jobId"]})["pending"])
        self.assertTrue(helper.wait(second)["cancelled"])
        self.assertTrue(helper.request("cancel")["ok"])
        self.assertTrue(helper.wait(active)["cancelled"])
        self.assertTrue(helper.wait(newest)["cancelled"])
        self.assertEqual((helper.images / "suspended.png").read_bytes(), original_png())

    def test_qml_input_remains_live_with_a_blocked_native_worker(self):
        helper = self.helper(gated=True)
        template = (APP / "tests/performance/responsiveness.qml.in").read_text()
        qml = template.replace("__APP_URL__", APP.as_uri()).replace("__ENDPOINT__", f"http://127.0.0.1:{helper.port}")
        qml = qml.replace("__TOKEN_PATH__", str(helper.app / "power-image-token.json"))
        test_file = helper.root / "tst_live.qml"
        test_file.write_text(qml)
        log_path = helper.root / "qml.log"
        with log_path.open("w") as output:
            process = subprocess.Popen([os.environ.get("QMLTESTRUNNER", "qmltestrunner-qt5"), "-input", str(test_file)], stdout=output, stderr=output,
                env=dict(os.environ, QT_QPA_PLATFORM="offscreen", QT_QUICK_BACKEND="software",
                    QML_XHR_ALLOW_FILE_READ="1", QML_XHR_ALLOW_FILE_WRITE="1"))
            try:
                deadline = time.monotonic() + 10
                while "UI_INPUT_WHILE_PENDING" not in log_path.read_text():
                    if process.poll() is not None or time.monotonic() > deadline:
                        self.fail(log_path.read_text())
                    time.sleep(.02)
                # Input reached QML before the native worker is allowed to render or write.
                descriptor = os.open(helper.gate, os.O_WRONLY | os.O_NONBLOCK)
                os.write(descriptor, b"1")
                os.close(descriptor)
                self.assertEqual(process.wait(timeout=20), 0, log_path.read_text())
                print(log_path.read_text().split("PERFORMANCE ")[-1].splitlines()[0])
            finally:
                if process.poll() is None:
                    process.kill()
                    process.wait()

    def test_worker_error_is_terminal_and_next_job_can_run(self):
        helper = self.helper()
        # Valid snapshot with renderer unavailable: an accepted job must still become terminal.
        request = snapshot()
        request["date"] = "invalid"
        self.assertFalse(helper.run("render", request)["ok"])
        self.assertTrue(helper.run("render", snapshot())["ok"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
