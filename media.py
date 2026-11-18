"""Index and stream local media with a system Python (SteamOS, Linux or Windows)."""
from datetime import datetime
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
import os
from pathlib import Path
import re
import secrets
import shutil
import stat
import subprocess
import sys
import tempfile
import threading
from xml.etree import ElementTree as ET


PICTURES = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".bmp"}
VIDEOS = {".mp4", ".m4v", ".mov", ".webm", ".mkv", ".ogv"}
DASH_NS = "urn:mpeg:dash:schema:mpd:2011"
ET.register_namespace("", DASH_NS)


def desktop_folder(home, key, fallback):
    try:
        config = (home / ".config/user-dirs.dirs").read_text()
        match = re.search(r'^XDG_' + key + r'_DIR="([^"\n]+)"', config, re.M)
        if match:
            value = Path(match[1].replace("$HOME", str(home)))
            if value.is_absolute() and value.resolve() not in (home.resolve(), Path("/")):
                return value.resolve()
    except OSError:
        pass
    return home / fallback


def windows_steam_roots():
    """Steam's install folder on Windows: registry first, then the usual locations."""
    roots = []
    try:
        import winreg
        for hive, key, value in ((winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam", "SteamPath"),
                                 (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Valve\Steam", "InstallPath"),
                                 (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Valve\Steam", "InstallPath")):
            try:
                with winreg.OpenKey(hive, key) as handle:
                    roots.append(Path(winreg.QueryValueEx(handle, value)[0]))
            except OSError:
                pass
    except ImportError:
        pass
    for variable in ("ProgramFiles(x86)", "ProgramFiles"):
        if os.environ.get(variable):
            roots.append(Path(os.environ[variable]) / "Steam")
    return roots


def windows_folder(home, value, fallback):
    """Pictures/Videos may be redirected (for example to OneDrive) on Windows."""
    try:
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders") as handle:
            folder = Path(os.path.expandvars(winreg.QueryValueEx(handle, value)[0]))
            if folder.is_absolute() and folder.is_dir():
                return folder
    except (ImportError, OSError):
        pass
    return home / fallback


def media_time(path, modified):
    match = re.search(r'(?:^|_)(\d{8})_?(\d{6})(?:_|\.|$)', path.name)
    if match:
        try:
            return int(datetime.strptime("".join(match.groups()), "%Y%m%d%H%M%S").timestamp())
        except ValueError:
            pass
    return int(modified)


def regular_file(path):
    try:
        return stat.S_ISREG(path.lstat().st_mode) and path.resolve() == path
    except (OSError, RuntimeError):
        return False


def recording_manifest(directories):
    """A saved Steam clip can span multiple static DASH periods."""
    tag = lambda name: f"{{{DASH_NS}}}{name}"
    result = ET.Element(tag("MPD"), type="static", minBufferTime="PT2S", profiles="urn:mpeg:dash:profile:isoff-live:2011")
    parts = []
    elapsed = 0
    for directory in sorted(directories):
        file = directory / "session.mpd"
        if not regular_file(file):
            continue
        try:
            if file.stat().st_size > 1024 * 1024:
                continue
            manifest = ET.parse(file).getroot()
            period = manifest.find(tag("Period"))
            duration = re.fullmatch(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?', manifest.get("mediaPresentationDuration", ""))
            if manifest.get("type", "static") != "static" or period is None or not duration:
                continue
            hours, minutes, seconds = (float(v or 0) for v in duration.groups())
            ms = round((hours * 3600 + minutes * 60 + seconds) * 1000)
        except (ET.ParseError, OSError, ValueError, OverflowError):
            continue
        tracks = period.findall(tag("AdaptationSet"))
        if ms <= 0 or not tracks:
            continue
        index = len(parts)
        out = ET.SubElement(result, tag("Period"), id=str(index), start=f"PT{elapsed / 1000:.3f}S", duration=f"PT{ms / 1000:.3f}S")
        ET.SubElement(out, tag("BaseURL")).text = f"p{index}/"
        out.extend(tracks)
        elapsed += ms
        parts.append(directory)
    if parts:
        result.set("mediaPresentationDuration", f"PT{elapsed / 1000:.3f}S")
        return parts, ET.tostring(result, encoding="utf-8", xml_declaration=True)


def scan_media(home, kind, extra_steam_roots=(), shell_folders=False):
    albums, assets = {}, {}
    extensions = PICTURES if kind == "photo" else VIDEOS

    def add(path, source, name="", app_id="", thumb=None, recording=None):
        if not recording and not regular_file(path):
            return
        try:
            info = path.stat()
        except OSError:
            return
        if not info.st_size and not recording:
            return
        ident = hashlib.sha256(os.fsencode(path)).hexdigest()[:24]
        if ident in assets:
            return
        thumb = thumb if thumb and regular_file(thumb) else None
        assets[ident] = (path, thumb, recording)
        key = f"{source}/{app_id}/{name}"
        album = albums.setdefault(key, {"id": key, "source": source, "name": name, "appId": app_id, "entries": []})
        album["entries"].append({"id": ident, "title": path.stem, "time": media_time(path, info.st_mtime),
                                 "format": "DASH" if recording else path.suffix[1:].upper()})

    def scan_recordings(root):
        for clip in (root / "clips").glob("clip_*"):
            recording = recording_manifest((clip / "video").glob("*"))
            if recording:
                bits = clip.name.split("_")
                add(clip, "recordings", app_id=bits[1] if len(bits) > 1 else "", thumb=clip / "thumbnail.jpg", recording=recording)
        for directory in (root / "video").glob("*"):
            recording = recording_manifest([directory])
            if recording:
                bits = directory.name.split("_")
                add(directory, "recordings", app_id=bits[1] if len(bits) > 1 else "", thumb=directory / "thumbnail.jpg", recording=recording)

    def walk(root, source):
        root = root.resolve()
        for folder, dirs, files in os.walk(root):
            base = Path(folder)
            dirs[:] = [d for d in dirs if not d.startswith(".") and d.lower() not in ("thumbnails", "thumbs") and not (base / d).is_symlink()]
            if kind == "video" and (base.name == "gamerecordings" or "gamerecording.pb" in files or {"clips", "video"}.issubset(dirs)):
                scan_recordings(base)
                dirs[:] = [d for d in dirs if d not in ("clips", "video")]
            for filename in files:
                path = base / filename
                if not filename.startswith(".") and path.suffix.lower() in extensions:
                    add(path, source, "" if base == root else str(base.relative_to(root)))

    candidates = [home / ".local/share/Steam", home / ".steam/steam", home / ".steam/root",
                  home / ".var/app/com.valvesoftware.Steam/.local/share/Steam"]
    candidates += list(extra_steam_roots)
    roots = {p.resolve() for p in candidates if p.is_dir()}
    for steam in sorted(roots):
        for user in (steam / "userdata").glob("*"):
            if not user.name.isdecimal() or user.is_symlink():
                continue
            if kind == "photo":
                for shots in (user / "760/remote").glob("*/screenshots"):
                    for path in shots.glob("*"):
                        if path.suffix.lower() in extensions:
                            add(path, "screenshots", app_id=shots.parent.name, thumb=shots / "thumbnails" / path.name)
            else:
                walk(user / "gamerecordings", "recordings")
    if kind == "photo":
        walk(windows_folder(home, "My Pictures", "Pictures") if shell_folders else desktop_folder(home, "PICTURES", "Pictures"), "pictures")
        walk(home / "Screenshots", "screenshots")
    else:
        walk(windows_folder(home, "My Video", "Videos") if shell_folders else desktop_folder(home, "VIDEOS", "Videos"), "videos")
    for album in albums.values():
        album["entries"].sort(key=lambda f: (-f["time"], f["title"].casefold(), f["id"]))
    return sorted(albums.values(), key=lambda a: (-a["entries"][0]["time"], a["id"])), assets


class MediaServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, player=None):
        self.player = player
        super().__init__(("127.0.0.1", 0), MediaRequest)
        self.token = secrets.token_urlsafe(24)
        self.assets = {}
        self.cache = tempfile.TemporaryDirectory(prefix="ps3-xmb-media-", dir=Path(tempfile.gettempdir()).resolve())
        self.thumbnail_slots = threading.BoundedSemaphore(2)
        self.thread = threading.Thread(target=self.serve_forever, daemon=True)
        self.thread.start()

    def close(self):
        self.shutdown()
        self.server_close()
        self.thread.join()
        self.cache.cleanup()

    def thumbnail(self, ident, path, thumb, recording):
        if thumb and regular_file(thumb):
            return thumb
        source = path if not recording else recording[0][0] / "session.mpd"
        if not regular_file(source):
            return None
        # Only visible rows request a thumbnail. Steam's existing JPEGs need no decoding here.
        target = Path(self.cache.name) / f"{ident}-{source.stat().st_mtime_ns}.jpg"
        if target.is_file():
            return target
        fallback = path if path.suffix.lower() in PICTURES else None
        if not shutil.which("ffmpeg"):
            return fallback
        with self.thumbnail_slots:
            if target.is_file():
                return target
            try:
                with tempfile.TemporaryDirectory(dir=self.cache.name) as staging:
                    temp = Path(staging) / "frame.jpg"
                    subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-protocol_whitelist", "file",
                                    "-threads", "1", "-i", str(source), "-frames:v", "1", "-vf",
                                    "scale=300:168:force_original_aspect_ratio=decrease", "-threads", "1", str(temp)],
                                   check=True, timeout=12, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    if temp.stat().st_size:
                        temp.replace(target)
                        return target
            except (OSError, subprocess.SubprocessError):
                pass
        return fallback


class MediaRequest(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def do_HEAD(self):
        self.serve()

    def do_GET(self):
        self.serve()

    def serve(self):
        try:
            self.serve_asset()
        except (BrokenPipeError, ConnectionResetError):
            pass
        except OSError:
            self.send_error(404)

    def serve_asset(self):
        parts = self.path.split("?", 1)[0].split("/")
        if len(parts) < 3 or not secrets.compare_digest(parts[1], self.server.token):
            return self.send_error(404)
        if parts[2:] == ["dash.mjs"] and self.server.player:
            return self.send_file(self.server.player, "text/javascript")
        asset = next((group[parts[2]] for group in self.server.assets.values() if parts[2] in group), None)
        if not asset or len(parts) not in (4, 5):
            return self.send_error(404)
        path, thumb, recording = asset
        if len(parts) == 4:
            if parts[3] == "thumb":
                file = self.server.thumbnail(parts[2], path, thumb, recording)
                if file and regular_file(file):
                    return self.send_file(file)
            elif parts[3] == "file" and not recording and regular_file(path):
                return self.send_file(path)
            elif parts[3] == "clip.mpd" and recording:
                data = recording[1]
                self.send_response(200)
                self.send_header("Content-Type", "application/dash+xml")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                if self.command == "GET":
                    self.wfile.write(data)
                return
        elif recording and re.fullmatch(r"p\d{1,4}", parts[3]) and re.fullmatch(r"(?:init-stream\d+|chunk-stream\d+-\d+)\.m4s", parts[4]):
            index = int(parts[3][1:])
            if index < len(recording[0]):
                file = recording[0][index] / parts[4]
                if regular_file(file):
                    return self.send_file(file, "video/iso.segment")
        self.send_error(404)

    def send_file(self, path, content_type=None):
        with path.open("rb") as stream:
            size = os.fstat(stream.fileno()).st_size
            start, end = 0, size - 1
            header = self.headers.get("Range")
            if header:
                match = re.fullmatch(r"bytes=(\d*)-(\d*)", header)
                if match and any(match.groups()):
                    a, b = match.groups()
                    start = int(a) if a else max(0, size - int(b))
                    end = min(int(b), end) if a and b else end
                else:
                    start = size
                if start > end:
                    self.send_response(416)
                    self.send_header("Content-Range", f"bytes */{size}")
                    self.end_headers()
                    return
            self.send_response(206 if header else 200)
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Type", content_type or mimetypes.guess_type(str(path))[0] or "application/octet-stream")
            self.send_header("Content-Length", str(end - start + 1))
            if header:
                self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.end_headers()
            if self.command == "GET":
                stream.seek(start)
                remaining = end - start + 1
                while remaining > 0:
                    block = stream.read(min(128 * 1024, remaining))
                    if not block:
                        break
                    self.wfile.write(block)
                    remaining -= len(block)


def run_worker(player):
    home = Path(os.environ.get("DECKY_USER_HOME") or Path.home()).resolve()
    server = MediaServer(player)
    try:
        for request in sys.stdin:
            kind = request.strip()
            try:
                if kind not in ("photo", "video"):
                    raise ValueError("Unknown category")
                albums, assets = scan_media(home, kind, *((windows_steam_roots(), True) if sys.platform == "win32" else ()))
                server.assets = {**server.assets, kind: assets}
                result = {"albums": albums, "base": f"http://127.0.0.1:{server.server_port}/{server.token}"}
            except (OSError, ValueError):
                result = {"error": "Could not read local media"}
            data = json.dumps(result, separators=(",", ":")).encode()
            sys.stdout.buffer.write(str(len(data)).encode() + b"\n" + data)
            sys.stdout.buffer.flush()
    finally:
        server.close()


if __name__ == "__main__":
    run_worker(Path(sys.argv[1]))
