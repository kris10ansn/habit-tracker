#!/usr/bin/env python3
"""Report real seven-image UI latency after the initial store load. Optional --max-gap-ms makes a dedicated perf run a gate."""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile

suite_path = Path(__file__).resolve().parents[1] / "power-image-service-test.py"
specification = importlib.util.spec_from_file_location("helper_tests", suite_path)
module = importlib.util.module_from_spec(specification)
specification.loader.exec_module(module)
parser = argparse.ArgumentParser()
parser.add_argument("--max-gap-ms", type=float)
args = parser.parse_args()
with tempfile.TemporaryDirectory(prefix="power-image-benchmark-") as directory:
    helper = module.Helper(Path(directory))
    try:
        for name in ("starting", "rebooting", "overheating", "restart-crashed"):
            (helper.images / (name + ".png")).write_bytes(module.original_png())
        template = (module.APP / "tests/performance/responsiveness.qml.in").read_text()
        qml = template.replace("__APP_URL__", module.APP.as_uri())
        qml = qml.replace("__ENDPOINT__", f"http://127.0.0.1:{helper.port}")
        qml = qml.replace("__TOKEN_PATH__", str(helper.app / "power-image-token.json"))
        test_file = Path(directory) / "tst_performance.qml"
        test_file.write_text(qml)
        result = subprocess.run([os.environ.get("QMLTESTRUNNER", "qmltestrunner-qt5"), "-input", str(test_file)], text=True,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=30,
            env=dict(os.environ, QT_QPA_PLATFORM="offscreen", QT_QUICK_BACKEND="software",
                QML_XHR_ALLOW_FILE_READ="1", QML_XHR_ALLOW_FILE_WRITE="1"))
        if result.returncode:
            raise SystemExit(result.stdout)
        metrics = json.loads(result.stdout.split("PERFORMANCE ")[-1].splitlines()[0])
        print(json.dumps(metrics, indent=2))
        if args.max_gap_ms is not None and metrics["maxEventLoopGapMs"] > args.max_gap_ms:
            raise SystemExit("UI event-loop gap exceeded the requested budget")
    finally:
        helper.close()
