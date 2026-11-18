import asyncio
from pathlib import Path
import tempfile
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from xml.etree import ElementTree as ET

from main import Plugin
from media import DASH_NS, MediaServer, scan_media


class MediaTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.home = Path(temporary.name).resolve()

    def put(self, name, data=b'0123456789'):
        file = self.home / name
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(data)
        return file

    def test_localized_albums_and_steam_thumbs_without_duplicates(self):
        self.put('.config/user-dirs.dirs', b'XDG_PICTURES_DIR="$HOME/Fotos"\nXDG_VIDEOS_DIR="$HOME/Filme"')
        self.put('Fotos/Trip/a.BMP')
        self.put('Fotos/.private/skip.jpg')
        try:
            (self.home / 'Fotos/Trip/link.jpg').symlink_to(self.put('elsewhere.jpg'))
        except OSError:
            self.skipTest('Creating symlinks needs Developer Mode or admin rights on Windows')
        self.put('Filme/vacation.mp4')
        steam = '.local/share/Steam'
        shots = steam + '/userdata/1/760/remote/42/screenshots/'
        self.put(shots + '20260305145301_1.jpg')
        thumb = self.put(shots + 'thumbnails/20260305145301_1.jpg')
        (self.home / '.steam').mkdir()
        (self.home / '.steam/steam').symlink_to(self.home / steam)
        albums, assets = scan_media(self.home, 'photo')
        self.assertEqual(len(assets), 2)
        self.assertEqual({a['name'] for a in albums}, {'Trip', ''})
        steam_album = next(a for a in albums if a['source'] == 'screenshots')
        self.assertEqual(steam_album['appId'], '42')
        self.assertEqual(assets[steam_album['entries'][0]['id']][1], thumb)
        self.assertEqual(scan_media(self.home, 'video')[0][0]['entries'][0]['title'], 'vacation')
        self.assertEqual(set(scan_media(self.home, 'photo')[1]), set(assets))

    def test_multipart_clip_streams_only_its_segments_and_supports_ranges(self):
        clip = '.local/share/Steam/userdata/1/gamerecordings/clips/clip_42_20260305_145301/video/'
        for part in ('fg_1', 'fg_2'):
            self.put(clip + part + '/session.mpd',
                     f'<MPD xmlns="{DASH_NS}" type="static" mediaPresentationDuration="PT2S"><Period><AdaptationSet/></Period></MPD>'.encode())
            self.put(clip + part + '/chunk-stream0-00001.m4s', part.encode())
        self.put('Videos/Local.webm')
        albums, assets = scan_media(self.home, 'video')
        server = MediaServer()
        self.addCleanup(server.close)
        server.assets = {'video': assets}
        base = f'http://127.0.0.1:{server.server_port}/{server.token}'
        native = next(a for a in albums if a['source'] == 'recordings')['entries'][0]
        prefix = base + '/' + native['id']
        with urlopen(prefix + '/clip.mpd') as response:
            root = ET.fromstring(response.read())
            self.assertEqual(root.get('mediaPresentationDuration'), 'PT4.000S')
            self.assertEqual([p.text for p in root.iter(f'{{{DASH_NS}}}BaseURL')], ['p0/', 'p1/'])
        with urlopen(prefix + '/p1/chunk-stream0-00001.m4s') as response:
            self.assertEqual(response.read(), b'fg_2')
        file = next(a for a in albums if a['source'] == 'videos')['entries'][0]
        url = base + '/' + file['id'] + '/file'
        with urlopen(Request(url, headers={'Range': 'bytes=3-6'})) as response:
            self.assertEqual((response.status, response.headers['Content-Range'], response.read()), (206, 'bytes 3-6/10', b'3456'))
        with urlopen(Request(url, headers={'Range': 'bytes=-2'})) as response:
            self.assertEqual(response.read(), b'89')
        for bad in (prefix + '/p0/session.mpd', prefix + '/p2/chunk-stream0-00001.m4s', base + '/unknown/file', url.replace(server.token, 'invalid')):
            with self.assertRaises(HTTPError) as error:
                urlopen(bad)
            self.assertEqual(error.exception.code, 404)
        with self.assertRaises(HTTPError) as error:
            urlopen(Request(url, headers={'Range': 'bytes=90-'}))
        self.assertEqual(error.exception.code, 416)

    def test_invalid_category_does_not_start_server(self):
        plugin = Plugin()
        with self.assertRaises(ValueError):
            asyncio.run(plugin.get_media('anything'))
        self.assertIsNone(plugin._worker)
