"""Throwaway local preview: python3 apps/remarkable/tools/screen-design-prototype/serve.py."""
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

fragment = Path(__file__).with_name("prototype.html").read_text()
page = """<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>reMarkable · screen design prototype</title>
<style>
body { margin: 0; padding: 24px; background: #e9e9e7; font: 14px Arial, sans-serif; color: #222; }
main { max-width: 1248px; margin: auto; }
button, select { border: 1px solid #bbb; background: #fff; color: #111; padding: 10px 14px; border-radius: 6px; font: inherit; }
button { cursor: pointer; }
#remarkable-screen-ideas .prototype-controls { background: #e9e9e7; padding: 8px; border-radius: 8px; }
</style><main>""" + fragment + "</main></html>"

class Preview(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(page.encode())

print("Prototype: http://localhost:8765/?variant=A&state=sleep", flush=True)
HTTPServer(("127.0.0.1", 8765), Preview).serve_forever()
