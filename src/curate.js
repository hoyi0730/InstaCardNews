import Anthropic from '@anthropic-ai/sdk';
import { sources } from './sources.js';
import { loadStore, saveStore } from './store.js';
import { sendTelegramMessage } from './telegram.js';

const MODEL = 'claude-opus-5';
const BATCH_SIZE = 40;
const CANDIDATE_THRESHOLD = 3; // on a 1-5 scale, per criterion

const client = new Anthropic();

const SYSTEM_PROMPT = `당신은 한국 인스타그램 "카드뉴스" 계정 InstaCardNews의 콘텐츠 큐레이터입니다.
매일 일본 뷰티/패션 미디어(Popteen, MERY)에서 수집된 기사 중, 한국 인스타그램 카드뉴스 소재로
쓸만한 "괜찮은 후보"를 골라내는 것이 목표입니다.

각 기사를 아래 3가지 기준으로 1~5점씩 채점하세요 (1=전혀 아님, 5=매우 그러함).

1. provocative_score — 한국인에게 자극적일만한(스크롤을 멈추게 할) 콘텐츠인가?
   - 의외의 사실, 반전, 논쟁적 소재, 강한 감정(호기심/충격/공감/부러움/FOMO)을 유발하는가?
   - 밋밋하고 정보 나열식인 콘텐츠는 낮게 평가하세요.

2. interest_score — 한국인들이 실제로 관심 가질 만한 소재인가?
   - K-콘텐츠/한국 트렌드와 연결되거나, 국경을 넘어 공감 가능한 보편적 관심사(연애, 아이돌, 뷰티, SNS 트렌드,
     Z세대 문화 등)인가?
   - 일본 로컬 맥락에만 지나치게 의존적인 소재(일본 내수 브랜드/방송/지역 한정 이벤트 등)는 낮게 평가하세요.

3. format_fit_score — 인스타 카드뉴스 형식에 알맞은 소재인가?
   - 랭킹/리스트, Before-After, Q&A, 설문 결과, 하우투처럼 여러 장의 카드로 나누기 좋은 구조인가?
   - 구체적인 수치·사례·이미지가 있어 시각적으로 표현하기 좋은가(추상적이고 두루뭉술한 소재는 낮게 평가)?
   - 주제가 카드 6~10장 분량으로 다루기 적당히 좁혀져 있는가(너무 광범위하거나 단발성 뉴스는 낮게 평가)?

각 기사마다:
- reason: 위 3가지 기준을 종합해 왜 그런 점수를 줬는지 한국어로 2~3문장 요약
- suggested_hook: 이 소재로 카드뉴스를 만든다면 쓸 법한 한국어 후킹 문구(제목) 1개 제안

과장하지 말고 냉정하게 채점하세요. 애매하면 낮은 점수를 주세요.`;

const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          provocative_score: { type: 'integer' },
          interest_score: { type: 'integer' },
          format_fit_score: { type: 'integer' },
          reason: { type: 'string' },
          suggested_hook: { type: 'string' },
        },
        required: [
          'id',
          'provocative_score',
          'interest_score',
          'format_fit_score',
          'reason',
          'suggested_hook',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['results'],
  additionalProperties: false,
};

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function buildUserPrompt(articles) {
  const entries = articles
    .map((a) =>
      [
        `id: ${a.id}`,
        `title: ${a.title}`,
        `categories: ${(a.categories || []).join(', ') || '(none)'}`,
        `excerpt: ${a.excerpt || '(none)'}`,
      ].join('\n')
    )
    .join('\n\n');

  return `다음 기사들을 평가 기준에 따라 채점해 주세요.\n\n${entries}`;
}

async function evaluateBatch(articles) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    output_config: { format: { type: 'json_schema', schema: RESULT_SCHEMA } },
    messages: [{ role: 'user', content: buildUserPrompt(articles) }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock) {
    throw new Error(`No text block in response (stop_reason=${response.stop_reason})`);
  }
  return JSON.parse(textBlock.text).results;
}

async function evaluateNewArticles() {
  const bySource = {};
  const unevaluated = [];

  for (const source of sources) {
    const items = loadStore(source.id);
    bySource[source.id] = items;
    for (const item of items) {
      if (!item.evaluated) unevaluated.push(item);
    }
  }

  if (unevaluated.length === 0) {
    console.log('No new articles to evaluate.');
    return bySource;
  }

  console.log(`Evaluating ${unevaluated.length} new article(s)...`);
  const evaluatedAt = new Date().toISOString();
  const resultsById = new Map();

  for (const batch of chunk(unevaluated, BATCH_SIZE)) {
    const results = await evaluateBatch(batch);
    for (const result of results) {
      resultsById.set(result.id, result);
    }
  }

  for (const items of Object.values(bySource)) {
    for (const item of items) {
      const result = resultsById.get(item.id);
      if (!result) continue;

      item.evaluated = true;
      item.evaluatedAt = evaluatedAt;
      item.scores = {
        provocative: result.provocative_score,
        interest: result.interest_score,
        formatFit: result.format_fit_score,
      };
      item.reason = result.reason;
      item.suggestedHook = result.suggested_hook;
      item.isCandidate =
        result.provocative_score >= CANDIDATE_THRESHOLD &&
        result.interest_score >= CANDIDATE_THRESHOLD &&
        result.format_fit_score >= CANDIDATE_THRESHOLD;
    }
  }

  for (const source of sources) {
    saveStore(source.id, bySource[source.id]);
  }

  console.log(`Evaluated ${resultsById.size} article(s).`);
  return bySource;
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function totalScore(item) {
  return item.scores.provocative + item.scores.interest + item.scores.formatFit;
}

function formatCandidate(item, rank) {
  return [
    `${rank}. 🔥 <b>[${escapeHtml(item.sourceName)}]</b> ${escapeHtml(item.title)}`,
    `👉 ${escapeHtml(item.suggestedHook)}`,
    `📊 자극성 ${item.scores.provocative}/5 · 관심도 ${item.scores.interest}/5 · 카드뉴스적합 ${item.scores.formatFit}/5 (합계 ${totalScore(item)}/15)`,
    `💬 ${escapeHtml(item.reason)}`,
    `🔗 ${item.link}`,
  ].join('\n');
}

async function notifyCandidates(bySource) {
  const candidates = Object.values(bySource)
    .flat()
    .filter((item) => item.isCandidate && !item.notified);

  if (candidates.length === 0) {
    console.log('No pending candidates to notify.');
    return;
  }

  candidates.sort((a, b) => totalScore(b) - totalScore(a));

  const header = `📰 오늘의 카드뉴스 후보 (${candidates.length}건, 점수 높은 순)`;
  const body = candidates.map((item, i) => formatCandidate(item, i + 1)).join('\n\n');
  await sendTelegramMessage(`${header}\n\n${body}`);

  const notifiedAt = new Date().toISOString();
  for (const item of candidates) {
    item.notified = true;
    item.notifiedAt = notifiedAt;
  }

  for (const source of sources) {
    saveStore(source.id, bySource[source.id]);
  }

  console.log(`Notified ${candidates.length} candidate(s) via Telegram.`);
}

async function main() {
  const bySource = await evaluateNewArticles();
  await notifyCandidates(bySource);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
