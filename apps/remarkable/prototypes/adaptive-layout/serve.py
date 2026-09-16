#!/usr/bin/env python3
"""Serve only this prototype and its two existing app dependencies on localhost."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import argparse

root = Path(__file__).resolve().parents[2]
allowed = {
    "/prototypes/adaptive-layout/index.html",
    "/prototypes/adaptive-layout/demo.css",
    "/prototypes/adaptive-layout/demo.js",
    "/src/js/Scroll.js",
    "/src/js/vendor/qrcode-generator.js",
}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(root), **kwargs)

    def do_GET(self):
        if urlsplit(self.path).path == "/":
            self.send_response(302)
            self.send_header("Location", "/prototypes/adaptive-layout/index.html")
            self.end_headers()
        elif urlsplit(self.path).path in allowed:
            super().do_GET()
        else:
            self.send_error(404)

    def do_HEAD(self):
        if urlsplit(self.path).path in allowed:
            super().do_HEAD()
        else:
            self.send_error(404)


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--port", type=int, default=8768)
arguments = parser.parse_args()
print(f"Open http://127.0.0.1:{arguments.port} · Ctrl+C to stop", flush=True)
ThreadingHTTPServer(("127.0.0.1", arguments.port), Handler).serve_forever()
