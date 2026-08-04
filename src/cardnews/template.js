import fs from 'node:fs';
import path from 'node:path';
import { BRAND } from './brand.js';

const WIDTH = 1080;
const HEIGHT = 1350;

function toDataUri(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1);
  return `data:image/${ext};base64,${buf.toString('base64')}`;
}

const remoteImageCache = new Map();

async function fetchRemoteImageAsDataUri(url) {
  if (remoteImageCache.has(url)) return remoteImageCache.get(url);

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; InstaCardNewsBot/1.0)' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const dataUri = `data:${contentType};base64,${buf.toString('base64')}`;
    remoteImageCache.set(url, dataUri);
    return dataUri;
  } catch (err) {
    console.warn(`Could not fetch source image ${url}: ${err.message}`);
    remoteImageCache.set(url, null);
    return null;
  }
}

const CHARACTER_DIR = path.resolve(import.meta.dirname, '..', '..', 'character');
const LOGO_URI = toDataUri(path.join(CHARACTER_DIR, 'logo.png'));
const FINISH_URI = toDataUri(path.join(CHARACTER_DIR, 'CardNews_Finish.png'));
const CHARACTER_URIS = {
  classroom: toDataUri(path.join(CHARACTER_DIR, '교실의자에서앉은이미지.png')),
  selfie: toDataUri(
    path.join(
      CHARACTER_DIR,
      '이미지_속_주인공이_핸드폰_셀카모드로_위에서_...확대하고_상반_신만_나온_이미지_였으면_좋겠어_3.png'
    )
  ),
  oliveyoung: toDataUri(path.join(CHARACTER_DIR, '주인공_속_이미지가_올리브영에서_쇼핑을_하고_있는_모습_4.png')),
};

// Each card type renders on one of three surfaces. Alternating light/dark by
// type (rather than a strict index alternation) gives visual rhythm without
// two adjacent same-type cards ever sharing a background.
const SURFACES = {
  light: {
    bg: BRAND.lightBg,
    text: '#1A1A1A',
    body: '#4A4A4A',
    tagBg: BRAND.primary,
    tagText: '#FFFFFF',
    accent: BRAND.primary,
    rowBg: '#FFFFFF',
    rowBorder: BRAND.lightBorder,
    progressTrack: 'rgba(0,0,0,0.08)',
    progressFill: BRAND.primary,
    progressLabel: 'rgba(0,0,0,0.32)',
    arrowBg: 'rgba(0,0,0,0.05)',
    arrowStroke: 'rgba(0,0,0,0.28)',
    shadow: '0 20px 50px rgba(0,0,0,0.15)',
  },
  dark: {
    bg: BRAND.darkBg,
    text: '#FFFFFF',
    body: 'rgba(255,255,255,0.68)',
    tagBg: BRAND.light,
    tagText: BRAND.dark,
    accent: BRAND.light,
    rowBg: 'rgba(255,255,255,0.07)',
    rowBorder: 'rgba(255,255,255,0.12)',
    progressTrack: 'rgba(255,255,255,0.14)',
    progressFill: '#FFFFFF',
    progressLabel: 'rgba(255,255,255,0.45)',
    arrowBg: 'rgba(255,255,255,0.08)',
    arrowStroke: 'rgba(255,255,255,0.4)',
    shadow: '0 20px 50px rgba(0,0,0,0.4)',
  },
  gradient: {
    bg: BRAND.gradient,
    text: '#FFFFFF',
    body: 'rgba(255,255,255,0.8)',
    tagBg: 'rgba(255,255,255,0.18)',
    tagText: '#FFFFFF',
    accent: '#FFFFFF',
    rowBg: 'rgba(255,255,255,0.14)',
    rowBorder: 'rgba(255,255,255,0.22)',
    progressTrack: 'rgba(255,255,255,0.22)',
    progressFill: '#FFFFFF',
    progressLabel: 'rgba(255,255,255,0.65)',
    arrowBg: 'rgba(255,255,255,0.14)',
    arrowStroke: 'rgba(255,255,255,0.5)',
    shadow: '0 20px 50px rgba(0,0,0,0.3)',
  },
};

// Type → surface. "insight" upgrades to the brand gradient when it's a quote
// card (headline wrapped in quotation marks) — the emotional high point of
// the deck reads best on the boldest surface.
function surfaceFor(card) {
  if (card.type === 'insight' && /^["“]/.test(card.headline.trim())) return 'gradient';
  return { cover: 'light', stat: 'dark', ranking: 'light', list: 'dark', insight: 'light' }[card.type] || 'light';
}

const BASE_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    font-family: 'Noto Sans KR', sans-serif;
    overflow: hidden;
  }
  .card { position: relative; width: ${WIDTH}px; height: ${HEIGHT}px; display: flex; flex-direction: column; padding: 64px 72px 96px; }
  .logo { height: 44px; width: auto; display: block; }
  .logo-chip { display: inline-block; background: #FFFFFF; padding: 10px 20px; border-radius: 999px; align-self: flex-start; }
  .logo-chip .logo { height: 32px; }
  .tag { display: inline-block; font-weight: 700; font-size: 24px; letter-spacing: 2px; text-transform: uppercase; padding: 10px 26px; border-radius: 999px; align-self: flex-start; }
  .headline { font-weight: 900; font-size: 62px; line-height: 1.32; letter-spacing: -1px; white-space: pre-line; }
  .body-text { font-weight: 500; font-size: 32px; line-height: 1.6; white-space: pre-line; }
  .char-image { border-radius: 32px; object-fit: cover; }
  .source-image { width: 100%; height: 320px; object-fit: cover; border-radius: 24px; }
  .source-caption { font-size: 20px; align-self: flex-end; margin-top: 8px; }
  .row-list { display: flex; flex-direction: column; gap: 26px; }
  .row { display: flex; align-items: center; gap: 26px; border-radius: 24px; padding: 26px 34px; border: 1px solid; }
  .badge { flex-shrink: 0; width: 60px; height: 60px; border-radius: 50%; font-weight: 900; font-size: 28px; display: flex; align-items: center; justify-content: center; }
  .row-value { font-weight: 700; font-size: 36px; }
  .quote-box { padding: 40px; border-radius: 24px; border: 1px solid; }
`;

function progressBar(index, total, surface) {
  const pct = ((index + 1) / total) * 100;
  return `
    <div style="position:absolute; bottom:0; left:0; right:0; padding:0 72px 44px; z-index:10; display:flex; align-items:center; gap:20px;">
      <div style="flex:1; height:8px; background:${surface.progressTrack}; border-radius:4px; overflow:hidden;">
        <div style="height:100%; width:${pct}%; background:${surface.progressFill}; border-radius:4px;"></div>
      </div>
      <span style="font-size:26px; font-weight:600; color:${surface.progressLabel};">${index + 1}/${total}</span>
    </div>
  `;
}

function swipeArrow(surface) {
  return `
    <div style="position:absolute; right:0; top:0; bottom:0; width:100px; z-index:9; display:flex; align-items:center; justify-content:center; background:linear-gradient(to right, transparent, ${surface.arrowBg});">
      <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
        <path d="M9 6l6 6-6 6" stroke="${surface.arrowStroke}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
  `;
}

function logoLockup(surface, surfaceName) {
  if (surfaceName === 'light') return `<img class="logo" src="${LOGO_URI}" alt="logo" />`;
  return `<div class="logo-chip"><img class="logo" src="${LOGO_URI}" alt="logo" /></div>`;
}

function tag(text, surface) {
  if (!text) return '';
  return `<div class="tag" style="background:${surface.tagBg}; color:${surface.tagText};">${escapeHtml(text)}</div>`;
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function headlineBlock(headline, emphasis, surface) {
  const parts = [];
  if (headline) parts.push(`<div class="headline" style="color:${surface.text};">${escapeHtml(headline)}</div>`);
  if (emphasis) parts.push(`<div class="headline" style="color:${surface.accent};">${escapeHtml(emphasis)}</div>`);
  return parts.join('\n');
}

function shell(bodyHtml, { index, total, surfaceName }) {
  const surface = SURFACES[surfaceName];
  const isLast = index === total - 1; // total counts the finish card too
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>${BASE_STYLE}</style></head>
<body style="background:${surface.bg};">
  <div class="card">
    ${logoLockup(surface, surfaceName)}
    ${bodyHtml}
  </div>
  ${progressBar(index, total, surface)}
  ${isLast ? '' : swipeArrow(surface)}
</body></html>`;
}

// Resolves a card's sourceImage (if any) to a data URI. Falls back to null on
// fetch failure so callers can fall back to the default character art.
async function resolveSourceImage(card) {
  if (!card.sourceImage?.src) return null;
  const dataUri = await fetchRemoteImageAsDataUri(card.sourceImage.src);
  if (!dataUri) return null;
  return { dataUri, alt: card.sourceImage.alt, domain: card.sourceImage.domain };
}

function sourceImageBlock(resolved, surface) {
  if (!resolved) return '';
  return `
    <div style="display:flex; flex-direction:column;">
      <img class="source-image" src="${resolved.dataUri}" alt="${escapeHtml(resolved.alt)}" style="box-shadow:${surface.shadow};" />
      <div class="source-caption" style="color:${surface.body};">출처: ${escapeHtml(resolved.domain)}</div>
    </div>
  `;
}

function characterImageUri(pose) {
  if (!pose || pose === 'none') return null;
  return CHARACTER_URIS[pose] || null;
}

function characterInlineBlock(charUri, surface) {
  if (!charUri) return '';
  return `
    <div style="display:flex; justify-content:center; margin-top:32px;">
      <img class="char-image" src="${charUri}" style="width:280px; height:350px; object-fit:cover; box-shadow:${surface.shadow};" />
    </div>
  `;
}

function rowList(items, surface) {
  return (items || [])
    .map(
      (item, i) => `
      <div class="row" style="background:${surface.rowBg}; border-color:${surface.rowBorder};">
        <div class="badge" style="background:${surface.accent}; color:${surface.bg};">${i + 1}</div>
        <div class="row-value" style="color:${surface.text};">${escapeHtml(item.value)}</div>
      </div>`
    )
    .join('\n');
}

function comparisonRowList(items, surface) {
  return (items || [])
    .map(
      (item) => `
      <div class="row" style="justify-content:space-between; background:${surface.rowBg}; border-color:${surface.rowBorder};">
        <div class="row-value" style="color:${surface.text}; font-size:34px;">${escapeHtml(item.label)}</div>
        <div class="row-value" style="color:${surface.accent};">${escapeHtml(item.value)}</div>
      </div>`
    )
    .join('\n');
}

async function coverCard(card, ctx) {
  const surfaceName = 'light';
  const surface = SURFACES[surfaceName];
  const resolved = await resolveSourceImage(card);
  const charUri = characterImageUri(card.characterPose) || CHARACTER_URIS.classroom;
  const image = resolved
    ? `<img class="char-image" src="${resolved.dataUri}" alt="${escapeHtml(resolved.alt)}" style="width:640px; height:760px; object-fit:cover; box-shadow:${surface.shadow};" />`
    : `<img class="char-image" src="${charUri}" style="width:640px; height:760px; box-shadow:${surface.shadow};" />`;
  const body = `
    <div style="display:flex; flex-direction:column; gap:32px; margin-top:56px;">
      ${tag(card.kicker, surface)}
      ${headlineBlock(card.headline, card.emphasis, surface)}
    </div>
    <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; margin-top:32px;">
      ${image}
      ${resolved ? `<div class="source-caption" style="color:${surface.body}; margin-top:12px;">출처: ${escapeHtml(resolved.domain)}</div>` : ''}
    </div>
  `;
  return shell(body, { ...ctx, surfaceName });
}

async function statCard(card, ctx) {
  const surfaceName = 'dark';
  const surface = SURFACES[surfaceName];
  const charUri = characterImageUri(card.characterPose);
  const body = `
    <div style="display:flex; flex-direction:column; gap:28px; margin-top:48px;">
      ${tag(card.kicker, surface)}
      <div class="headline" style="color:${surface.text}; font-size:52px;">${escapeHtml(card.headline)}</div>
    </div>
    <div style="flex:1; display:flex; align-items:center; justify-content:center; gap:32px;">
      <div class="headline" style="color:${surface.accent}; font-size:${charUri ? 130 : 168}px; line-height:1;">${escapeHtml(card.emphasis)}</div>
      ${charUri ? `<img class="char-image" src="${charUri}" style="width:250px; height:330px; object-fit:cover; box-shadow:${surface.shadow}; flex-shrink:0;" />` : ''}
    </div>
    <div class="body-text" style="text-align:center; color:${surface.body};">${escapeHtml(card.body)}</div>
  `;
  return shell(body, { ...ctx, surfaceName });
}

async function rankingCard(card, ctx) {
  const surfaceName = 'light';
  const surface = SURFACES[surfaceName];
  const resolved = await resolveSourceImage(card);
  const charUri = resolved ? null : characterImageUri(card.characterPose);
  const body = `
    <div style="display:flex; flex-direction:column; gap:24px; margin-top:48px;">
      ${tag(card.kicker, surface)}
      <div class="headline" style="color:${surface.text}; font-size:50px;">${escapeHtml(card.headline)}</div>
    </div>
    ${resolved ? `<div style="margin-top:28px;">${sourceImageBlock(resolved, surface)}</div>` : characterInlineBlock(charUri, surface)}
    <div class="row-list" style="margin-top:28px;">${rowList(card.items, surface)}</div>
    <div class="body-text" style="margin-top:auto; padding-right:110px; color:${surface.body};">${escapeHtml(card.body)}</div>
  `;
  return shell(body, { ...ctx, surfaceName });
}

async function listCard(card, ctx) {
  const surfaceName = 'dark';
  const surface = SURFACES[surfaceName];
  const resolved = await resolveSourceImage(card);
  const charUri = resolved ? null : characterImageUri(card.characterPose);
  const body = `
    <div style="display:flex; flex-direction:column; gap:24px; margin-top:48px;">
      ${tag(card.kicker, surface)}
      <div class="headline" style="color:${surface.text}; font-size:50px;">${escapeHtml(card.headline)}</div>
    </div>
    ${resolved ? `<div style="margin-top:28px;">${sourceImageBlock(resolved, surface)}</div>` : characterInlineBlock(charUri, surface)}
    <div class="row-list" style="margin-top:28px;">${comparisonRowList(card.items, surface)}</div>
    <div class="body-text" style="margin-top:auto; padding-right:110px; color:${surface.body};">${escapeHtml(card.body)}</div>
  `;
  return shell(body, { ...ctx, surfaceName });
}

async function insightCard(card, ctx) {
  const surfaceName = surfaceFor(card);
  const surface = SURFACES[surfaceName];
  const resolved = await resolveSourceImage(card);
  const charUri = characterImageUri(card.characterPose) || (resolved ? null : CHARACTER_URIS.selfie);

  const isQuote = surfaceName === 'gradient';
  const textBlock = isQuote
    ? `<div class="quote-box" style="border-color:${surface.rowBorder}; background:${surface.rowBg};">
         <div class="headline" style="color:${surface.text}; font-size:48px;">${escapeHtml(card.headline)}</div>
         ${card.body ? `<div class="body-text" style="color:${surface.body}; margin-top:16px;">${escapeHtml(card.body)}</div>` : ''}
       </div>`
    : `${headlineBlock(card.headline, card.emphasis, surface)}
       ${card.body ? `<div class="body-text" style="color:${surface.body};">${escapeHtml(card.body)}</div>` : ''}`;

  const image = resolved
    ? `<img class="char-image" src="${resolved.dataUri}" alt="${escapeHtml(resolved.alt)}" style="width:540px; height:670px; object-fit:cover; box-shadow:${surface.shadow};" />`
    : charUri
      ? `<img class="char-image" src="${charUri}" style="width:540px; height:670px; box-shadow:${surface.shadow};" />`
      : '';

  const body = `
    <div style="display:flex; flex-direction:column; gap:28px; margin-top:64px;">
      ${tag(card.kicker, surface)}
      ${textBlock}
    </div>
    <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end;">
      ${image}
      ${resolved ? `<div class="source-caption" style="color:${surface.body}; margin-top:12px;">출처: ${escapeHtml(resolved.domain)}</div>` : ''}
    </div>
  `;
  return shell(body, { ...ctx, surfaceName });
}

function finishCard(ctx) {
  const surface = SURFACES.gradient;
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:${WIDTH}px; height:${HEIGHT}px; overflow:hidden; background:${BRAND.primary}; display:flex; align-items:center; justify-content:center; position:relative; }
  img { width:${WIDTH}px; height:${WIDTH}px; object-fit:contain; }
</style></head>
<body>
  <img src="${FINISH_URI}" />
  ${progressBar(ctx.index, ctx.total, surface)}
</body></html>`;
}

const RENDERERS = {
  cover: coverCard,
  stat: statCard,
  ranking: rankingCard,
  list: listCard,
  insight: insightCard,
};

export async function buildCardHtmlPages(cards) {
  const total = cards.length + 1; // +1 for the finish card
  const pages = [];
  for (let i = 0; i < cards.length; i++) {
    const renderer = RENDERERS[cards[i].type] || insightCard;
    pages.push(await renderer(cards[i], { index: i, total }));
  }
  pages.push(finishCard({ index: cards.length, total }));
  return pages;
}
