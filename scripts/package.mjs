import { mkdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { createHash } from 'node:crypto';

const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const root = path.resolve('release/ps3-xmb');
await mkdir(path.join(root, 'dist'), { recursive: true });
const files = ['plugin.json', 'package.json', 'main.py', 'README.md', 'LICENSE'];
for (const file of files) await copyFile(file, path.join(root, file));
await copyFile('src/fonts/OFL.txt', path.join(root, 'OFL.txt'));
const player = 'node_modules/dashjs/dist/modern/esm/dash.mediaplayer.min.js';
const notices = 'dist/dash.mediaplayer.min.js.LICENSE.txt';
await copyFile(player, 'dist/dash.mjs');
await copyFile('media.py', 'dist/media.py');
await writeFile(notices, (await readFile('node_modules/dashjs/LICENSE.md', 'utf8')) + '\n' + (await readFile(player + '.LICENSE.txt', 'utf8')));
const assets = ['dist/index.js', 'dist/media.py', 'dist/dash.mjs', notices];
for (const file of assets) await copyFile(file, path.join(root, file));
const archive = path.resolve(`release/ps3-xmb-${version}.zip`);
execFileSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', `import pathlib, zipfile, sys
root=pathlib.Path(sys.argv[1])
with zipfile.ZipFile(sys.argv[2], 'w', zipfile.ZIP_DEFLATED) as z:
    for name in sorted(sys.argv[3:]):
        z.write(root / name, root.name + '/' + name)
`, root, archive, ...files, 'OFL.txt', ...assets]);
const sum = createHash('sha256').update(await readFile(archive)).digest('hex');
await writeFile(`${archive}.sha256`, `${sum}  ${path.basename(archive)}\n`);
console.log(`Packaged ${archive}\nSHA-256 ${sum}`);
