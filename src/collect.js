import Parser from 'rss-parser';
import { sources } from './sources.js';
import { loadStore, saveStore, mergeItems } from './store.js';

const parser = new Parser({
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; InstaCardNewsBot/1.0)' },
  timeout: 15000,
});

function firstImage(html) {
  const match = html?.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function toArticle(entry, source, fetchedAt) {
  return {
    id: entry.guid || entry.link,
    source: source.id,
    sourceName: source.name,
    title: entry.title?.trim() ?? '',
    link: entry.link,
    pubDate: entry.isoDate || entry.pubDate || fetchedAt,
    creator: entry.creator || null,
    categories: entry.categories || [],
    excerpt: (entry.contentSnippet || '').trim().slice(0, 300),
    thumbnail: firstImage(entry['content:encoded'] || entry.content),
    fetchedAt,
  };
}

async function collectSource(source, fetchedAt) {
  const feed = await parser.parseURL(source.feedUrl);
  const items = (feed.items || []).map((entry) => toArticle(entry, source, fetchedAt));

  const existing = loadStore(source.id);
  const { merged, addedCount } = mergeItems(existing, items);
  saveStore(source.id, merged);

  return { sourceId: source.id, fetched: items.length, added: addedCount, total: merged.length };
}

async function main() {
  const fetchedAt = new Date().toISOString();
  const results = [];

  for (const source of sources) {
    try {
      const result = await collectSource(source, fetchedAt);
      results.push(result);
      console.log(`[${source.id}] fetched=${result.fetched} added=${result.added} total=${result.total}`);
    } catch (err) {
      console.error(`[${source.id}] FAILED: ${err.message}`);
    }
  }

  const totalAdded = results.reduce((sum, r) => sum + r.added, 0);
  console.log(`\nDone. ${totalAdded} new article(s) across ${results.length}/${sources.length} source(s).`);

  if (results.length === 0) {
    process.exitCode = 1;
  }
}

main();
