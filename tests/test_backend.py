import asyncio
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from main import Plugin, DEFAULTS


class PreferencesTest(unittest.TestCase):
    def test_roundtrip_and_safe_corruption_fallback(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {"DECKY_PLUGIN_SETTINGS_DIR": directory}):
            plugin = Plugin()
            self.assertEqual(asyncio.run(plugin.get_settings()), DEFAULTS)
            self.assertFalse(asyncio.run(plugin.get_settings())["enabled"])
            saved = asyncio.run(plugin.save_settings({"enabled": False, "language": "ru", "palette": "violet", "glyphs": "xbox", "panels": "classic", "accent": "ps3", "gameBackground": False, "groupByFolders": False}))
            self.assertEqual(asyncio.run(plugin.get_settings()), saved)
            self.assertEqual(saved["language"], "ru")
            self.assertEqual(saved["glyphs"], "xbox")
            self.assertEqual((saved["panels"], saved["accent"]), ("classic", "ps3"))
            self.assertEqual(asyncio.run(plugin.save_settings({"panels": "x", "accent": None}))["panels"], "glass")
            self.assertFalse(saved["enabled"])
            self.assertFalse(saved["gameBackground"])
            self.assertFalse(saved["groupByFolders"])
            self.assertEqual(list(Path(directory).glob('.settings-*')), [])
            Path(directory, 'settings.json').write_text('{broken')
            self.assertFalse(asyncio.run(plugin.get_settings())["enabled"])

    def test_missing_decky_environment_never_writes_elsewhere(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(RuntimeError):
                asyncio.run(Plugin().save_settings({}))

    def test_expanded_palettes_persist_after_plugin_reload(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(os.environ, {"DECKY_PLUGIN_SETTINGS_DIR": directory}):
            for palette in ("original", "silver", "gold", "lime", "pink", "purple", "teal", "sky", "violet", "brown", "black"):
                asyncio.run(Plugin().save_settings({"palette": palette, "language": "ru"}))
                loaded = asyncio.run(Plugin().get_settings())
                self.assertEqual(loaded["palette"], palette)
                self.assertEqual(loaded["language"], "ru")


if __name__ == '__main__':
    unittest.main()
