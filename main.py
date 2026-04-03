import http.server
import socketserver

PORT = 8001
DIRECTORY = "docs"


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
  def end_headers(self):
    # Send the headers that tell the browser NOT to cache
    self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
    self.send_header("Pragma", "no-cache")
    self.send_header("Expires", "0")
    super().end_headers()

  def __init__(self, *args, **kwargs):
    super().__init__(*args, directory=DIRECTORY, **kwargs)


with socketserver.TCPServer(("", PORT), NoCacheHandler) as httpd:
  print(f"Serving {DIRECTORY} at http://localhost:{PORT} (No-Cache enabled)")
  httpd.serve_forever()
