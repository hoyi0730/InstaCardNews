import fs from 'node:fs';
import path from 'node:path';
import { buildCardHtmlPages } from './template.js';
import { renderCardsToPng } from './render.js';

const outDir = process.argv[2];
if (!outDir) {
  console.error('Usage: node src/cardnews/rerender.js <output-dir-containing-cards.json>');
  process.exit(1);
}

const { cards } = JSON.parse(fs.readFileSync(path.join(outDir, 'cards.json'), 'utf-8'));
const htmlPages = buildCardHtmlPages(cards);
const files = await renderCardsToPng(htmlPages, outDir);
console.log(`Re-rendered ${files.length} image(s) in ${outDir}`);
