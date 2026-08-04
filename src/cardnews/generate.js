import fs from 'node:fs';
import path from 'node:path';
import { selectWinner } from './select.js';
import { generateCardCopy } from './copy.js';
import { buildCardHtmlPages } from './template.js';
import { renderCardsToPng } from './render.js';

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

async function main() {
  const result = await selectWinner();
  if (!result) {
    console.log('No candidates available to build card news from.');
    return;
  }

  const { winner, reason } = result;
  console.log(`Selected: [${winner.sourceName}] ${winner.title}`);
  console.log(`Reason: ${reason}`);

  console.log('Generating Korean card copy...');
  const cards = await generateCardCopy(winner);
  console.log(`Generated ${cards.length} content card(s) + 1 finish card.`);

  const htmlPages = await buildCardHtmlPages(cards);

  const outDir = path.resolve(
    import.meta.dirname,
    '..',
    '..',
    'output',
    'cardnews',
    `${new Date().toISOString().slice(0, 10)}-${slugify(winner.title)}`
  );

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'cards.json'),
    JSON.stringify({ source: winner, selectionReason: reason, cards }, null, 2)
  );

  console.log(`Rendering to ${outDir} ...`);
  const files = await renderCardsToPng(htmlPages, outDir);
  console.log(`Done. ${files.length} image(s) saved:`);
  for (const f of files) console.log(` - ${f}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
