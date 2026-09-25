// Renders scene.html frame by frame (deterministic time) and encodes an mp4.
// Usage: node render.mjs [out.mp4]            full video, 1080x1080 @ 60 fps
//        node render.mjs --stills 1,5.2,12     PNG stills for preview
import { createRequire } from 'module';
import { spawn, execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const dir = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.join(dir, 'scene.html');
const FPS = 60, SIZE = 1080;
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const args = process.argv.slice(2);

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 });
  await page.goto(url);
  await page.evaluate(() => window.ready);
  return page;
}

const browser = await chromium.launch();

if (args[0] === '--stills') {
  const page = await openPage(browser);
  const outDir = args[2] || path.join(dir, 'stills');
  fs.mkdirSync(outDir, { recursive: true });
  for (const t of args[1].split(',').map(Number)) {
    await page.evaluate(t => window.render(t), t);
    await page.screenshot({ path: path.join(outDir, `t${t.toFixed(2)}.png`) });
  }
  await browser.close();
  process.exit(0);
}

const out = path.resolve(args[0] || path.join(dir, 'refbot-miniapp.mp4'));
const page0 = await openPage(browser);
const duration = await page0.evaluate(() => window.DURATION);
await page0.close();
const total = Math.round(duration * FPS);
const WORKERS = Number(process.env.WORKERS || 4);
const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'refbot-'));

async function renderSegment(k) {
  const from = Math.floor(total * k / WORKERS), to = Math.floor(total * (k + 1) / WORKERS);
  const page = await openPage(browser);
  const seg = path.join(tmp, `seg${k}.mp4`);
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(FPS), seg],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = from; f < to; f++) {
    await page.evaluate(t => window.render(t), f / FPS);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (k === 0 && f % 60 === 0) process.stdout.write(`\r${Math.round((f - from) / (to - from) * 100)}%`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => c ? rej(new Error('ffmpeg ' + c)) : res()));
  await page.close();
  return seg;
}

const segs = await Promise.all([...Array(WORKERS).keys()].map(renderSegment));
await browser.close();
const list = path.join(tmp, 'list.txt');
fs.writeFileSync(list, segs.map(s => `file '${s}'`).join('\n'));
execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nDone: ${out} (${total} frames @ ${FPS} fps)`);
