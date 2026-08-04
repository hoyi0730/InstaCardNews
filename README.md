# InstaCardNews RSS Collector

일본 뷰티/패션 미디어의 RSS를 매일 자동으로 수집해 `data/` 폴더에 JSON으로 누적 저장하고,
Claude로 "한국 카드뉴스 소재로 괜찮은 후보"만 골라 Telegram으로 알려주는 봇입니다.

## 수집 대상

| 사이트 | 상태 | 비고 |
| --- | --- | --- |
| [Popteen](https://popteen.co.jp/media/) | ✅ 구현됨 | `https://popteen.co.jp/media/feed` |
| [MERY](https://mery.jp/) | ✅ 구현됨 | `https://mery.jp/feed` |
| [Seventeen-Web](https://seventeen-web.jp/) | ⏳ 보류 | 정식 RSS 없음. `sitemap-news.xml` 등 사이트맵 폴링으로 대체 가능 (추후 작업) |
| [Lemon8](https://www.lemon8-app.com/) | ⏳ 보류 | RSS/사이트맵 모두 없음. 앱 기반 콘텐츠라 별도 방식 필요 (추후 작업) |

## 사용법

```bash
npm install
npm run collect   # RSS 수집
npm run curate     # 신규 기사 평가 + Telegram 알림 (ANTHROPIC_API_KEY, TELEGRAM_* 필요)
```

`collect`는 각 소스의 RSS를 가져와 `data/<source>.json`에 병합합니다. 이미 저장된 글(guid/link 기준)은
건너뛰고, 새 글만 추가합니다. 소스당 최근 500개까지 보관합니다(`src/store.js`의 `MAX_ITEMS_PER_SOURCE`).

`curate`는 아직 평가되지 않은(`evaluated`가 없는) 글들을 모아 Claude(`claude-opus-5`)에게 한 번에
채점을 맡깁니다. 평가 기준은 3가지입니다:

1. **자극성** — 한국인에게 스크롤을 멈추게 할 만큼 자극적인가
2. **관심도** — 한국인들이 실제로 관심 가질 만한 소재인가
3. **카드뉴스 형식 적합성** — 인스타 카드뉴스로 만들기 좋은 구조·소재인가

3가지 항목이 모두 3점(5점 만점) 이상이면 "괜찮은 후보"로 판단해 Telegram으로 전송합니다. 평가 결과는
`data/*.json`에 그대로 저장되므로, Telegram 전송에 실패해도 API를 다시 호출하지 않고 다음 실행 때
미전송(`notified`가 없는) 후보만 재전송합니다.

## 데이터 스키마 (`data/*.json`)

```jsonc
{
  "id": "...",           // guid 또는 link (중복 제거 키)
  "source": "mery",
  "sourceName": "MERY",
  "title": "...",
  "link": "https://...",
  "pubDate": "2026-08-01T00:00:00.000Z",
  "creator": "...",
  "categories": ["..."],
  "excerpt": "...",       // 짧은 요약 (최대 300자)
  "thumbnail": "https://..." | null, // 본문에서 추출한 첫 이미지
  "fetchedAt": "...",     // 이 항목을 최초로 수집한 시각

  // curate 실행 후 추가되는 필드
  "evaluated": true,
  "evaluatedAt": "...",
  "scores": { "provocative": 4, "interest": 5, "formatFit": 3 },
  "reason": "...",          // 채점 이유 (한국어)
  "suggestedHook": "...",   // 카드뉴스용 후킹 문구 제안
  "isCandidate": true,
  "notified": true,
  "notifiedAt": "..."
}
```

## 매일 자동 실행 (GitHub Actions)

`.github/workflows/collect-rss.yml`이 매일 22:00 UTC(한국시간 07:00)에 실행되어 RSS 수집 →
Claude 채점 → Telegram 알림 → `data/` 커밋까지 한 번에 처리합니다. `workflow_dispatch`로 수동 실행도
가능합니다.

GitHub에 이 저장소를 올린 뒤 아래 설정이 필요합니다:

1. **Settings → Actions → General → Workflow permissions**에서
   **"Read and write permissions"**를 선택해야 워크플로가 `data/`를 커밋·push할 수 있습니다.
2. Actions가 비활성화되어 있다면 활성화해야 합니다.
3. **Settings → Secrets and variables → Actions → New repository secret**에서 아래 3개를 등록합니다.

### 필요한 Secrets

| Secret 이름 | 설명 | 발급 방법 |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Claude API 키 | [platform.claude.com](https://platform.claude.com) 콘솔에서 발급 |
| `TELEGRAM_BOT_TOKEN` | Telegram 봇 토큰 | Telegram에서 [@BotFather](https://t.me/BotFather)와 대화 → `/newbot` → 안내에 따라 봇 이름 지정 → 발급되는 토큰(`123456:ABC-...` 형태) 복사 |
| `TELEGRAM_CHAT_ID` | 알림을 받을 chat ID | 방금 만든 봇과 먼저 대화를 한 번 시작한 뒤(아무 메시지나 전송), 브라우저에서 `https://api.telegram.org/bot<봇토큰>/getUpdates`에 접속해 응답 JSON의 `message.chat.id` 값을 확인 |

세 값 모두 저장소 코드에는 들어가지 않고 GitHub Secrets에만 저장되며, Actions 실행 시 환경변수로
주입됩니다. 로컬에서 `npm run curate`를 테스트하려면 같은 이름의 환경변수를 직접 설정하면 됩니다.

## 로컬 스케줄러로 대신 실행하고 싶다면

Windows 작업 스케줄러에서 `npm run collect`를 매일 실행하도록 등록해도 됩니다. 다만 GitHub Actions를
선택했다면 로컬 실행 없이도 매일 자동으로 동작합니다.
