import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const WIDTH = 1080;
const HEIGHT = 1350;

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
];

function findChrome() {
  const found = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error('Could not find a local Chrome install. Set CHROME_PATH env var.');
  }
  return found;
}

export async function renderCardsToPng(htmlPages, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const executablePath = process.env.CHROME_PATH || findChrome();
  const browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });

  const paths = [];
  for (let i = 0; i < htmlPages.length; i++) {
    await page.setContent(htmlPages[i], { waitUntil: 'networkidle' });
    const outPath = path.join(outDir, `card-${String(i + 1).padStart(2, '0')}.png`);
    await page.screenshot({ path: outPath });
    paths.push(outPath);
  }

  await browser.close();
  return paths;
}
