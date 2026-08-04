import fs from 'node:fs';
import path from 'node:path';

const BRAND_BLUE = '#448AFF';
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

const BASE_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    font-family: 'Noto Sans KR', sans-serif;
    background: #FFFFFF;
    color: #1A1A1A;
    overflow: hidden;
  }
  .card {
    position: relative;
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    display: flex;
    flex-direction: column;
    padding: 64px 72px;
  }
  .logo {
    height: 44px;
    width: auto;
    display: block;
    align-self: flex-start;
    flex-shrink: 0;
  }
  .page-count {
    position: absolute;
    bottom: 48px;
    right: 72px;
    font-size: 24px;
    font-weight: 500;
    color: #B0B0B0;
    letter-spacing: 1px;
  }
  .kicker {
    display: inline-block;
    background: ${BRAND_BLUE};
    color: #FFFFFF;
    font-weight: 700;
    font-size: 26px;
    padding: 10px 28px;
    border-radius: 999px;
    align-self: flex-start;
  }
  .emphasis { color: ${BRAND_BLUE}; }
  .headline {
    font-weight: 900;
    font-size: 64px;
    line-height: 1.35;
    letter-spacing: -1px;
    white-space: pre-line;
  }
  .body {
    font-weight: 500;
    font-size: 32px;
    line-height: 1.6;
    color: #4A4A4A;
    white-space: pre-line;
  }
  .char-image {
    border-radius: 32px;
    object-fit: cover;
    box-shadow: 0 20px 50px rgba(0,0,0,0.18);
  }
  .source-image { width: 100%; height: 320px; object-fit: cover; border-radius: 24px; box-shadow: 0 12px 30px rgba(0,0,0,0.12); }
  .source-caption { font-size: 20px; color: #B0B0B0; align-self: flex-end; margin-top: 8px; }
  .rank-list { display: flex; flex-direction: column; gap: 28px; }
  .rank-row {
    display: flex;
    align-items: center;
    gap: 28px;
    background: #F7F9FC;
    border-radius: 24px;
    padding: 28px 36px;
  }
  .rank-badge {
    flex-shrink: 0;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: ${BRAND_BLUE};
    color: #FFFFFF;
    font-weight: 900;
    font-size: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .rank-value {
    font-weight: 700;
    font-size: 38px;
  }
`;

function shell(bodyHtml, pageLabel) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>${BASE_STYLE}</style></head>
<body>
  <div class="card">
    <img class="logo" src="${LOGO_URI}" alt="logo" />
    ${bodyHtml}
    ${pageLabel ? `<div class="page-count">${pageLabel}</div>` : ''}
  </div>
</body></html>`;
}

function renderHeadline(headline, emphasis) {
  const parts = [];
  if (headline) parts.push(`<div class="headline">${escapeHtml(headline)}</div>`);
  if (emphasis) parts.push(`<div class="headline emphasis">${escapeHtml(emphasis)}</div>`);
  return parts.join('\n');
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Resolves a card's sourceImage (if any) to a data URI. Falls back to null on
// fetch failure so callers can fall back to the default character art.
async function resolveSourceImage(card) {
  if (!card.sourceImage?.src) return null;
  const dataUri = await fetchRemoteImageAsDataUri(card.sourceImage.src);
  if (!dataUri) return null;
  return { dataUri, alt: card.sourceImage.alt, domain: card.sourceImage.domain };
}

function sourceImageBlock(resolved) {
  if (!resolved) return '';
  return `
    <div style="display:flex; flex-direction:column;">
      <img class="source-image" src="${resolved.dataUri}" alt="${escapeHtml(resolved.alt)}" />
      <div class="source-caption">출처: ${escapeHtml(resolved.domain)}</div>
    </div>
  `;
}

// Maps a card's chosen mood ("classroom" | "selfie" | "oliveyoung" | "none") to
// the matching character asset. Returns null for "none"/unrecognized poses.
function characterImageUri(pose) {
  if (!pose || pose === 'none') return null;
  return CHARACTER_URIS[pose] || null;
}

function characterInlineBlock(charUri) {
  if (!charUri) return '';
  return `
    <div style="display:flex; justify-content:center; margin-top:32px;">
      <img class="char-image" src="${charUri}" style="width:280px; height:350px; object-fit:cover;" />
    </div>
  `;
}

async function coverCard(card, pageLabel) {
  const resolved = await resolveSourceImage(card);
  const charUri = characterImageUri(card.characterPose) || CHARACTER_URIS.classroom;
  const image = resolved
    ? `<img class="char-image" src="${resolved.dataUri}" alt="${escapeHtml(resolved.alt)}" style="width:640px; height:800px; object-fit:cover;" />`
    : `<img class="char-image" src="${charUri}" style="width:640px; height:800px;" />`;
  const body = `
    <div style="display:flex; flex-direction:column; gap:32px; margin-top:64px;">
      ${card.kicker ? `<div class="kicker">${escapeHtml(card.kicker)}</div>` : ''}
      ${renderHeadline(card.headline, card.emphasis)}
    </div>
    <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; margin-top:40px;">
      ${image}
      ${resolved ? `<div class="source-caption" style="align-self:center; margin-top:12px;">출처: ${escapeHtml(resolved.domain)}</div>` : ''}
    </div>
  `;
  return shell(body, pageLabel);
}

async function statCard(card, pageLabel) {
  const charUri = characterImageUri(card.characterPose);
  const body = `
    <div style="display:flex; flex-direction:column; gap:28px; margin-top:56px;">
      ${card.kicker ? `<div class="kicker">${escapeHtml(card.kicker)}</div>` : ''}
      <div class="headline">${escapeHtml(card.headline)}</div>
    </div>
    <div style="flex:1; display:flex; align-items:center; justify-content:center; gap:32px;">
      <div class="headline emphasis" style="font-size:${charUri ? 140 : 180}px; line-height:1;">${escapeHtml(card.emphasis)}</div>
      ${charUri ? `<img class="char-image" src="${charUri}" style="width:260px; height:340px; object-fit:cover; flex-shrink:0;" />` : ''}
    </div>
    <div class="body" style="text-align:center;">${escapeHtml(card.body)}</div>
  `;
  return shell(body, pageLabel);
}

async function rankingCard(card, pageLabel) {
  const resolved = await resolveSourceImage(card);
  const charUri = resolved ? null : characterImageUri(card.characterPose);
  const rows = (card.items || [])
    .map(
      (item, i) => `
      <div class="rank-row">
        <div class="rank-badge">${i + 1}</div>
        <div class="rank-value">${escapeHtml(item.value)}</div>
      </div>`
    )
    .join('\n');
  const body = `
    <div style="display:flex; flex-direction:column; gap:24px; margin-top:56px;">
      ${card.kicker ? `<div class="kicker">${escapeHtml(card.kicker)}</div>` : ''}
      <div class="headline" style="font-size:52px;">${escapeHtml(card.headline)}</div>
    </div>
    ${resolved ? `<div style="margin-top:32px;">${sourceImageBlock(resolved)}</div>` : characterInlineBlock(charUri)}
    <div class="rank-list" style="margin-top:32px;">${rows}</div>
    <div class="body" style="margin-top:auto; padding-right:120px;">${escapeHtml(card.body)}</div>
  `;
  return shell(body, pageLabel);
}

async function listCard(card, pageLabel) {
  const resolved = await resolveSourceImage(card);
  const charUri = resolved ? null : characterImageUri(card.characterPose);
  const rows = (card.items || [])
    .map(
      (item) => `
      <div class="rank-row" style="justify-content:space-between;">
        <div class="body" style="color:#1A1A1A; font-weight:700; font-size:34px;">${escapeHtml(item.label)}</div>
        <div class="rank-value emphasis">${escapeHtml(item.value)}</div>
      </div>`
    )
    .join('\n');
  const body = `
    <div style="display:flex; flex-direction:column; gap:24px; margin-top:56px;">
      ${card.kicker ? `<div class="kicker">${escapeHtml(card.kicker)}</div>` : ''}
      <div class="headline" style="font-size:52px;">${escapeHtml(card.headline)}</div>
    </div>
    ${resolved ? `<div style="margin-top:32px;">${sourceImageBlock(resolved)}</div>` : characterInlineBlock(charUri)}
    <div class="rank-list" style="margin-top:32px;">${rows}</div>
    <div class="body" style="margin-top:auto; padding-right:120px;">${escapeHtml(card.body)}</div>
  `;
  return shell(body, pageLabel);
}

async function insightCard(card, pageLabel) {
  const resolved = await resolveSourceImage(card);
  const charUri = characterImageUri(card.characterPose) || CHARACTER_URIS.selfie;
  const image = resolved
    ? `<img class="char-image" src="${resolved.dataUri}" alt="${escapeHtml(resolved.alt)}" style="width:560px; height:700px; object-fit:cover;" />`
    : `<img class="char-image" src="${charUri}" style="width:560px; height:700px;" />`;
  const body = `
    <div style="display:flex; flex-direction:column; gap:32px; margin-top:80px;">
      ${card.kicker ? `<div class="kicker">${escapeHtml(card.kicker)}</div>` : ''}
      ${renderHeadline(card.headline, card.emphasis)}
      <div class="body">${escapeHtml(card.body)}</div>
    </div>
    <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end;">
      ${image}
      ${resolved ? `<div class="source-caption" style="align-self:center; margin-top:12px;">출처: ${escapeHtml(resolved.domain)}</div>` : ''}
    </div>
  `;
  return shell(body, pageLabel);
}

function finishCard() {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; }
  html, body {
    width:${WIDTH}px; height:${HEIGHT}px; overflow:hidden; background:${BRAND_BLUE};
    display:flex; align-items:center; justify-content:center;
  }
  img { width:${WIDTH}px; height:${WIDTH}px; object-fit:contain; }
</style></head>
<body><img src="${FINISH_URI}" /></body></html>`;
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
    pages.push(await renderer(cards[i], `${i + 1} / ${total}`));
  }
  pages.push(finishCard());
  return pages;
}
