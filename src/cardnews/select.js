import Anthropic from '@anthropic-ai/sdk';
import { sources } from '../sources.js';
import { loadStore } from '../store.js';

const MODEL = 'claude-opus-5';
const client = new Anthropic();

function totalScore(item) {
  return item.scores.provocative + item.scores.interest + item.scores.formatFit;
}

function loadCandidates() {
  const all = [];
  for (const source of sources) {
    for (const item of loadStore(source.id)) {
      if (item.isCandidate) all.push(item);
    }
  }
  return all;
}

async function breakTie(tied) {
  const options = tied
    .map(
      (item, i) =>
        `${i + 1}. [${item.sourceName}] ${item.title}\n   후킹: ${item.suggestedHook}\n   요약: ${item.excerpt}`
    )
    .join('\n\n');

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system:
      '당신은 인스타그램 카드뉴스 전문 소셜 콘텐츠 전략가입니다. 여러 기사 후보 중 인스타그램 카드뉴스로 만들었을 때 ' +
      '가장 저장·공유·참여(좋아요, 댓글)를 많이 이끌어낼 단 하나를 골라야 합니다. 판단 기준: 후킹력, 캐러셀(다장 카드)로 ' +
      '풀어내기 좋은 정보량과 구조, 한국 Z세대 타겟과의 정서적 연결. 반드시 아래 JSON 스키마로만 답하세요.',
    output_config: {
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            winner_index: { type: 'integer' },
            reason: { type: 'string' },
          },
          required: ['winner_index', 'reason'],
          additionalProperties: false,
        },
      },
    },
    messages: [{ role: 'user', content: `다음 중 하나를 골라주세요 (1부터 시작하는 번호로 답):\n\n${options}` }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  const result = JSON.parse(textBlock.text);
  const winner = tied[result.winner_index - 1];
  return { winner, reason: result.reason };
}

export async function selectWinner() {
  const candidates = loadCandidates();
  if (candidates.length === 0) {
    return null;
  }

  candidates.forEach((item) => {
    item._total = totalScore(item);
  });
  const max = Math.max(...candidates.map((item) => item._total));
  const tied = candidates.filter((item) => item._total === max);

  if (tied.length === 1) {
    return { winner: tied[0], reason: `단독 최고 점수 (${max}/15)` };
  }

  console.log(`Tie at ${max}/15 between ${tied.length} article(s); breaking tie via social-strategy judgment...`);
  return breakTie(tied);
}
