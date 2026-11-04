# Run: python server.py  ->  opens http://localhost:8000
import http.server, socketserver, webbrowser
PORT = 8000
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), http.server.SimpleHTTPRequestHandler) as s:
    print(f"Smart City Planner running at http://localhost:{PORT}  (Ctrl+C to stop)")
    webbrowser.open(f"http://localhost:{PORT}")
    s.serve_forever()
