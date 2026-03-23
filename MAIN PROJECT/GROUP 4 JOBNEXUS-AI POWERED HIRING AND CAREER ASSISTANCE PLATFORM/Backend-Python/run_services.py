import os
import subprocess
import sys


def run():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    python_exe = sys.executable

    services = [
        os.path.join(base_dir, "interview.py"),
        os.path.join(base_dir, "pdf_links.py"),
    ]

    procs = []
    for service in services:
        procs.append(subprocess.Popen([python_exe, service]))

    try:
        for proc in procs:
            proc.wait()
    except KeyboardInterrupt:
        for proc in procs:
            proc.terminate()


if __name__ == "__main__":
    run()
