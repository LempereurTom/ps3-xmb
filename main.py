"""Decky preferences, battery status and the on-demand media worker (SteamOS, Linux and Windows)."""
import asyncio
import json
import os
import shutil
from pathlib import Path
import sys
import tempfile
import time

DEFAULTS = {"enabled": False, "palette": "original", "language": "fr", "glyphs": "playstation", "panels": "glass", "accent": "game", "sounds": True, "motion": True, "installedOnly": False, "gameBackground": True, "groupByFolders": True, "recentCount": 5}
PALETTES = ("original", "silver", "gold", "lime", "pink", "green", "purple", "teal", "sky", "blue", "violet", "brown", "red", "black")
LANGUAGES = ("fr", "en", "ru")
GLYPHS = ("playstation", "xbox")
PANELS = ("glass", "classic")
ACCENTS = ("game", "ps3")
WINDOWS = sys.platform == "win32"


def is_steamos():
    try:
        return any(line.strip() in ("ID=steamos", 'ID="steamos"') for line in Path("/etc/os-release").read_text().splitlines())
    except OSError:
        return False


def media_interpreter():
    """The media worker runs in its own Python process.

    SteamOS ships /usr/bin/python3. Decky's Windows build is a frozen executable,
    so on Windows we use a Python 3 installed on the PC (python.org or the py launcher).
    """
    if not WINDOWS:
        return ["/usr/bin/python3"] if Path("/usr/bin/python3").is_file() else [shutil.which("python3") or "python3"]
    if not getattr(sys, "frozen", False) and sys.executable:
        return [sys.executable]
    for name, extra in (("py", ["-3"]), ("python", []), ("python3", [])):
        found = shutil.which(name)
        # The Microsoft Store alias in WindowsApps only opens the Store; skip it.
        if found and "WindowsApps" not in found:
            return [found, *extra]
    raise RuntimeError("Python 3 is required on Windows for Photo and Video (https://www.python.org/downloads/)")


def windows_battery():
    import ctypes

    class SystemPowerStatus(ctypes.Structure):
        _fields_ = [("ACLineStatus", ctypes.c_ubyte), ("BatteryFlag", ctypes.c_ubyte), ("BatteryLifePercent", ctypes.c_ubyte),
                    ("SystemStatusFlag", ctypes.c_ubyte), ("BatteryLifeTime", ctypes.c_ulong), ("BatteryFullLifeTime", ctypes.c_ulong)]

    status = SystemPowerStatus()
    if not ctypes.windll.kernel32.GetSystemPowerStatus(ctypes.byref(status)):
        return {"battery": None, "charging": False}
    # 128 = no system battery (desktop PC), 255 = unknown.
    if status.BatteryFlag & 128 or status.BatteryFlag == 255 or status.BatteryLifePercent > 100:
        return {"battery": None, "charging": False}
    return {"battery": int(status.BatteryLifePercent), "charging": bool(status.BatteryFlag & 8)}


def sanitize(value):
    result = dict(DEFAULTS)
    if not isinstance(value, dict):
        return result
    for key in ("enabled", "sounds", "motion", "installedOnly", "gameBackground", "groupByFolders"):
        if type(value.get(key)) is bool:
            result[key] = value[key]
    for key, choices in (("palette", PALETTES), ("language", LANGUAGES), ("glyphs", GLYPHS), ("panels", PANELS), ("accent", ACCENTS), ("recentCount", (5, 10, 20))):
        if value.get(key) in choices:
            result[key] = value[key]
    return result


class Plugin:
    _worker = None
    _worker_lock = None

    async def get_media(self, kind):
        if kind not in ("photo", "video"):
            raise ValueError("Unknown media category")
        if self._worker_lock is None:
            self._worker_lock = asyncio.Lock()
        async with self._worker_lock:
            if self._worker is None or self._worker.returncode is not None:
                root = Path(__file__).resolve().parent
                source = root / "media.py"
                worker = source if source.is_file() else root / "dist/media.py"
                env = dict(os.environ)
                if getattr(sys, "frozen", False) and not WINDOWS:
                    # The system interpreter and ffmpeg use SteamOS's shared libraries.
                    orig = env.pop("LD_LIBRARY_PATH_ORIG", None)
                    if orig is None:
                        env.pop("LD_LIBRARY_PATH", None)
                    else:
                        env["LD_LIBRARY_PATH"] = orig
                flags = {"creationflags": 0x08000000} if WINDOWS else {}  # CREATE_NO_WINDOW
                self._worker = await asyncio.create_subprocess_exec(
                    *media_interpreter(), "-I", "-u", str(worker), str(root / "dist/dash.mjs"),
                    stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE, env=env, **flags)
            try:
                self._worker.stdin.write(kind.encode() + b"\n")
                await self._worker.stdin.drain()
                length = await self._worker.stdout.readline()
                if not length:
                    raise RuntimeError("Media worker stopped")
                result = json.loads(await self._worker.stdout.readexactly(int(length)))
            except (Exception, asyncio.CancelledError):
                await self._stop_media_worker()
                raise
            if "error" in result:
                raise RuntimeError(result["error"])
            return result

    async def _stop_media_worker(self):
        worker, self._worker = self._worker, None
        if worker is None or worker.returncode is not None:
            return
        worker.stdin.close()
        try:
            await asyncio.wait_for(worker.wait(), 3)
        except asyncio.TimeoutError:
            if worker.returncode is None:
                worker.terminate()
            await worker.wait()

    def settings_path(self):
        directory = os.environ.get("DECKY_PLUGIN_SETTINGS_DIR")
        if not directory:
            raise RuntimeError("DECKY_PLUGIN_SETTINGS_DIR is not set by Decky")
        return Path(directory) / "settings.json"

    async def get_settings(self):
        path = self.settings_path()
        try:
            return sanitize(json.loads(path.read_text(encoding="utf-8")))
        except FileNotFoundError:
            return dict(DEFAULTS)
        except (ValueError, OSError):
            # A damaged preferences file must never force a Home replacement.
            return {**DEFAULTS, "enabled": False}

    async def save_settings(self, value):
        settings = sanitize(value)
        path = self.settings_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        fd, temporary = tempfile.mkstemp(dir=path.parent, prefix=".settings-")
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as stream:
                json.dump(settings, stream)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, path)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
        return settings

    async def get_status(self):
        # "pc" enables PC-only entries such as Exit Big Picture; never on a Steam Deck in Game Mode.
        pc = WINDOWS or not is_steamos()
        if WINDOWS:
            try:
                return {**windows_battery(), "pc": True}
            except (OSError, AttributeError, ValueError):
                return {"battery": None, "charging": False, "pc": True}
        for battery in Path("/sys/class/power_supply").glob("*"):
            try:
                if (battery / "type").read_text().strip() != "Battery":
                    continue
                level = max(0, min(100, int((battery / "capacity").read_text().strip())))
                charging = (battery / "status").read_text().strip() == "Charging"
                return {"battery": level, "charging": charging, "pc": pc}
            except (OSError, ValueError):
                continue
        return {"battery": None, "charging": False, "pc": pc}

    async def report_health(self, event, value):
        # Only plugin readiness/input diagnostics; no game titles, account data or credentials.
        if event not in ("frontend", "screen", "library_count", "library_error", "last_input"):
            return
        if not isinstance(value, (str, int)):
            return
        path = self.settings_path().parent / "health.json"
        try:
            health = json.loads(path.read_text())
        except (FileNotFoundError, ValueError):
            health = {}
        health[event] = {"value": str(value)[:40], "at": int(time.time())}
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(health, indent=2))

    async def _main(self):
        pass

    async def _unload(self):
        if self._worker_lock:
            async with self._worker_lock:
                await self._stop_media_worker()
