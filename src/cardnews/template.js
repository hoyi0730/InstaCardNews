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

function coverCard(card, pageLabel) {
  const body = `
    <div style="display:flex; flex-direction:column; gap:32px; margin-top:64px;">
      ${card.kicker ? `<div class="kicker">${escapeHtml(card.kicker)}</div>` : ''}
      ${renderHeadline(card.headline, card.emphasis)}
    </div>
    <div style="flex:1; display:flex; align-items:flex-end; justify-content:center; margin-top:40px;">
      <img class="char-image" src="${CHARACTER_URIS.classroom}" style="width:640px; height:800px;" />
    </div>
  `;
  return shell(body, pageLabel);
}

function statCard(card, pageLabel) {
  const body = `
    <div style="display:flex; flex-direction:column; gap:28px; margin-top:56px;">
      ${card.kicker ? `<div class="kicker">${escapeHtml(card.kicker)}</div>` : ''}
      <div class="headline">${escapeHtml(card.headline)}</div>
    </div>
    <div style="flex:1; display:flex; align-items:center; justify-content:center;">
      <div class="headline emphasis" style="font-size:180px; line-height:1;">${escapeHtml(card.emphasis)}</div>
    </div>
    <div class="body" style="text-align:center;">${escapeHtml(card.body)}</div>
  `;
  return shell(body, pageLabel);
}

function rankingCard(card, pageLabel) {
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
    <div class="rank-list" style="margin-top:56px;">${rows}</div>
    <div class="body" style="margin-top:auto; padding-right:120px;">${escapeHtml(card.body)}</div>
  `;
  return shell(body, pageLabel);
}

function listCard(card, pageLabel) {
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
    <div class="rank-list" style="margin-top:56px;">${rows}</div>
    <div class="body" style="margin-top:auto; padding-right:120px;">${escapeHtml(card.body)}</div>
  `;
  return shell(body, pageLabel);
}

function insightCard(card, pageLabel) {
  const body = `
    <div style="display:flex; flex-direction:column; gap:32px; margin-top:80px;">
      ${card.kicker ? `<div class="kicker">${escapeHtml(card.kicker)}</div>` : ''}
      ${renderHeadline(card.headline, card.emphasis)}
      <div class="body">${escapeHtml(card.body)}</div>
    </div>
    <div style="flex:1; display:flex; align-items:flex-end; justify-content:center;">
      <img class="char-image" src="${CHARACTER_URIS.selfie}" style="width:560px; height:700px;" />
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

export function buildCardHtmlPages(cards) {
  const total = cards.length + 1; // +1 for the finish card
  const pages = cards.map((card, i) => {
    const renderer = RENDERERS[card.type] || insightCard;
    return renderer(card, `${i + 1} / ${total}`);
  });
  pages.push(finishCard());
  return pages;
}
