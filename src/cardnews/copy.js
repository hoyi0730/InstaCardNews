import Anthropic from '@anthropic-ai/sdk';
import Parser from 'rss-parser';
import { sources } from '../sources.js';

const MODEL = 'claude-opus-5';
const MAX_CARDS = 8;
const client = new Anthropic();
const parser = new Parser({ headers: { 'User-Agent': 'Mozilla/5.0 (compatible; InstaCardNewsBot/1.0)' } });

const CARD_SCHEMA = {
  type: 'object',
  properties: {
    cards: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['cover', 'stat', 'ranking', 'list', 'insight'] },
          kicker: { type: 'string' },
          headline: { type: 'string' },
          emphasis: { type: 'string' },
          body: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                value: { type: 'string' },
              },
              required: ['label', 'value'],
              additionalProperties: false,
            },
          },
        },
        required: ['type', 'kicker', 'headline', 'emphasis', 'body', 'items'],
        additionalProperties: false,
      },
    },
  },
  required: ['cards'],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `당신은 한국 인스타그램 카드뉴스 계정 InstaCardNews의 에디터입니다.
일본 뷰티/패션/컬처 미디어의 기사를 한국 Z세대 독자를 위한 인스타 카드뉴스로 각색합니다.

규칙:
- 기사 원문(일본어, HTML 포함)을 읽고 핵심을 파악해 카드로 재구성하세요 (마무리 CTA 카드는 별도 처리하므로 포함하지 마세요).
- 카드 개수는 반드시 5장 이상 8장 이하여야 합니다. 절대 8장을 초과하지 마세요. 정보가 많으면 비슷한 항목끼리
  하나의 "list" 카드로 묶어서 개수를 맞추세요 (예: 여러 개의 수치/설문 결과를 한 카드 안에 items로 나열).
- 모든 텍스트는 자연스러운 한국어로 새로 쓰세요. 일본어를 그대로 남기거나 직역투로 쓰지 마세요.
  단, 고유명사(그룹명, 브랜드명 등)는 널리 통용되는 한국어 표기나 원어 표기를 사용하세요 (예: Snow Man, TWICE).
- 카드 타입:
  - "cover": 후킹 문구 1장 (항상 첫 카드). kicker=상단 라벨(예: "MERY 설문조사"), headline=메인 후킹 문구,
    emphasis=강조해서 보여줄 짧은 문구(선택, 없으면 빈 문자열)
  - "stat": 하나의 수치를 크게 강조. headline=질문/맥락, emphasis=수치(예: "45.9%"), body=한 줄 설명
  - "ranking": 순위형 정보. headline=제목, items=[{label:"1위" 형태 대신 value에 순위 항목명만}],
    items는 순서대로 1위부터 나열(value 필드에 항목명), body=보충 설명 한 줄
  - "list": 순위가 아닌 2~4개의 수치/항목 비교. items=[{label:항목명, value:수치}], body=보충 설명
  - "insight": 마무리 인사이트 카드 (항상 마지막 카드). headline=핵심 한 줄 정리, body=부연 설명
- 각 필드는 스마트폰 화면에서 한눈에 읽히도록 간결하게: headline은 20자 내외 x 2줄 이내, body는 60자 내외.
- 사용하지 않는 필드는 빈 문자열 "" 또는 빈 배열 []로 채우세요 (모든 필드는 항상 포함되어야 합니다).
- 반드시 지정된 JSON 스키마로만 응답하세요.`;

async function fetchFullContent(item) {
  const source = sources.find((s) => s.id === item.source);
  const feed = await parser.parseURL(source.feedUrl);
  const match = feed.items.find((entry) => entry.link === item.link || entry.guid === item.id);
  if (!match) {
    throw new Error(`Could not find "${item.title}" in the current ${source.id} feed (may have scrolled off).`);
  }
  return (match['content:encoded'] || match.content || '').slice(0, 20000);
}

export async function generateCardCopy(item) {
  const fullContent = await fetchFullContent(item);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    output_config: { format: { type: 'json_schema', schema: CARD_SCHEMA } },
    messages: [
      {
        role: 'user',
        content: `제목: ${item.title}\n출처: ${item.sourceName}\n\n본문(HTML):\n${fullContent}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) {
    throw new Error(`No text block in response (stop_reason=${response.stop_reason})`);
  }
  const cards = JSON.parse(textBlock.text).cards;

  if (cards.length > MAX_CARDS) {
    console.warn(`Model returned ${cards.length} cards; trimming to ${MAX_CARDS} (keeping the closing card).`);
    const closing = cards[cards.length - 1];
    return [...cards.slice(0, MAX_CARDS - 1), closing];
  }
  return cards;
}
