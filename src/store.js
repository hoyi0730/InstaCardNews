import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', 'data');

// Keep each source's history bounded so the JSON files don't grow forever.
const MAX_ITEMS_PER_SOURCE = 500;

function storeFile(sourceId) {
  return path.join(DATA_DIR, `${sourceId}.json`);
}

export function loadStore(sourceId) {
  const file = storeFile(sourceId);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return [];
  }
}

export function saveStore(sourceId, items) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(storeFile(sourceId), JSON.stringify(items, null, 2) + '\n', 'utf-8');
}

// Merges freshly-fetched items into the existing history, de-duplicating by id
// (RSS guid, falling back to link) and sorting newest-first.
export function mergeItems(existing, incoming) {
  const byId = new Map(existing.map((item) => [item.id, item]));
  let addedCount = 0;

  for (const item of incoming) {
    if (!byId.has(item.id)) {
      addedCount++;
    }
    byId.set(item.id, item);
  }

  const merged = Array.from(byId.values()).sort(
    (a, b) => new Date(b.pubDate) - new Date(a.pubDate)
  );

  return { merged: merged.slice(0, MAX_ITEMS_PER_SOURCE), addedCount };
}
