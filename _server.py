import os
import sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

class RangeHTTPRequestHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        f = None
        if os.path.isdir(path):
            parts = sys.version_info
            for index in "index.html", "index.htm":
                index_path = os.path.join(path, index)
                if os.path.exists(index_path):
                    path = index_path
                    break
            else:
                return super().send_head()
        
        ctype = self.guess_type(path)
        try:
            f = open(path, 'rb')
        except OSError:
            self.send_error(404, "File not found")
            return None

        fs = os.fstat(f.fileno())
        total_length = fs[6]
        
        range_header = self.headers.get('Range')
        if range_header and range_header.startswith('bytes='):
            ranges = range_header[6:].split('-')
            start = int(ranges[0]) if ranges[0] else 0
            end = int(ranges[1]) if len(ranges) > 1 and ranges[1] else total_length - 1
            if start >= total_length or end >= total_length or start > end:
                self.send_error(416, "Requested Range Not Satisfiable")
                f.close()
                return None

            length = end - start + 1
            self.send_response(206)
            self.send_header("Content-Type", ctype)
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Range", f"bytes {start}-{end}/{total_length}")
            self.send_header("Content-Length", str(length))
            self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
            self.end_headers()
            f.seek(start)
            self.range_end = end
            return f

        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(total_length))
        self.send_header("Last-Modified", self.date_time_string(fs.st_mtime))
        self.end_headers()
        self.range_end = total_length - 1
        return f

    def copyfile(self, source, outputfile):
        if not hasattr(self, 'range_end'):
            return super().copyfile(source, outputfile)
        
        start = source.tell()
        remaining = self.range_end - start + 1
        buffer_size = 64 * 1024
        while remaining > 0:
            to_read = min(buffer_size, remaining)
            buf = source.read(to_read)
            if not buf:
                break
            try:
                outputfile.write(buf)
            except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
                break
            remaining -= len(buf)

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server_address = ('', port)
    httpd = ThreadingHTTPServer(server_address, RangeHTTPRequestHandler)
    print(f"Serving HTTP on 0.0.0.0 port {port} with Range/Video Streaming support...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
