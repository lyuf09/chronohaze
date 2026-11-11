#!/usr/bin/env python3
from __future__ import annotations

import argparse
import http.server
import ssl
from functools import partial
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Serve the smoke-test site over local HTTPS")
    parser.add_argument("--port", type=int, required=True)
    parser.add_argument("--directory", type=Path, required=True)
    parser.add_argument("--cert", type=Path, required=True)
    parser.add_argument("--key", type=Path, required=True)
    args = parser.parse_args()

    handler = partial(http.server.SimpleHTTPRequestHandler, directory=str(args.directory))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.load_cert_chain(certfile=args.cert, keyfile=args.key)
    server.socket = context.wrap_socket(server.socket, server_side=True)
    server.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
