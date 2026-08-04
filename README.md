# InstaCardNews RSS Collector

일본 뷰티/패션 미디어의 RSS를 매일 자동으로 수집해 `data/` 폴더에 JSON으로 누적 저장하고,
Claude로 채점한 뒤 최고점 기사 1건을 골라 인스타그램 카드뉴스 이미지를 자동 생성하는 봇입니다.

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
npm run collect    # RSS 수집
npm run curate     # 신규 기사 평가 (ANTHROPIC_API_KEY 필요)
npm run cardnews   # 최고점 기사 1건 선정 + 카드뉴스 이미지 생성 (ANTHROPIC_API_KEY, Chrome 필요)
```

`collect`는 각 소스의 RSS를 가져와 `data/<source>.json`에 병합합니다. 이미 저장된 글(guid/link 기준)은
건너뛰고, 새 글만 추가합니다. 소스당 최근 500개까지 보관합니다(`src/store.js`의 `MAX_ITEMS_PER_SOURCE`).

`curate`는 아직 평가되지 않은(`evaluated`가 없는) 글들을 모아 Claude(`claude-opus-5`)에게 한 번에
채점을 맡깁니다. 평가 기준은 3가지입니다:

1. **자극성** — 한국인에게 스크롤을 멈추게 할 만큼 자극적인가
2. **관심도** — 한국인들이 실제로 관심 가질 만한 소재인가
3. **카드뉴스 형식 적합성** — 인스타 카드뉴스로 만들기 좋은 구조·소재인가

3가지 항목이 모두 3점(5점 만점) 이상이면 "괜찮은 후보"(`isCandidate: true`)로 표시합니다. 평가 결과는
`data/*.json`에 그대로 저장됩니다.

`cardnews`는 후보 중 3가지 점수 합계(15점 만점)가 가장 높은 기사 1건을 선정합니다. 동점일 경우
인스타그램 참여도 관점(후킹력·캐러셀 구조 적합성·타겟 공감도)에서 Claude가 하나를 골라 사유와 함께
기록합니다. 선정된 기사는 원문 전체를 다시 가져와 5~8장 분량의 한국어 카드뉴스 문구로 재구성한 뒤,
`character/logo.png`·`character/CardNews_Finish.png`·캐릭터 이미지를 활용해 1080x1350 PNG 이미지로
렌더링합니다. 결과는 `output/cardnews/<날짜>-<slug>/`에 `card-01.png ~ card-0N.png` + `cards.json`
(생성된 카드 문구 원본, 템플릿만 수정해서 재렌더링하고 싶을 때 `node src/cardnews/rerender.js <폴더>`로
API 재호출 없이 다시 그릴 수 있음)으로 저장됩니다. `output/`은 git에는 커밋되지 않습니다.

카드뉴스 렌더링은 로컬에 설치된 Chrome(`C:/Program Files/Google/Chrome/Application/chrome.exe`)을
Playwright로 구동해 HTML 템플릿을 스크린샷하는 방식입니다. 경로가 다르면 `CHROME_PATH` 환경변수로
지정하세요.

### 디자인 시스템

`src/cardnews/brand.js`의 브랜드 컬러(`#448AFF`) 하나로 전체 팔레트(라이트 배경/보더, 다크 배경, 강조
라이트·다크 톤, 브랜드 그라디언트)를 자동 파생합니다. 카드 타입별로 서페이스가 정해져 있어 라이트/다크가
자연스럽게 교차합니다: `cover`·`ranking` = 라이트, `stat`·`list` = 다크, `insight`는 인용구형 헤드라인
("..."로 시작)이면 브랜드 그라디언트, 아니면 라이트. 모든 카드에는 진행률 바(`N/총장수`)와 스와이프
화살표(마지막 장 제외)가 붙습니다. 로고는 다크/그라디언트 배경에서는 흰색 칩 안에 표시해 항상 잘 보이게
처리했습니다.

`BRAND.handle`은 아직 실제 계정 핸들로 채워져 있지 않은 자리표시자입니다(현재 렌더링에는 쓰이지 않음).

### 원문 기사 이미지 재사용

캐릭터 일러스트만으로는 부족한 카드(예: 특정 캐릭터·굿즈 랭킹)는 원문 기사에 실제로 삽입된 이미지를
재사용합니다. 다만 저작권·초상권 리스크를 낮추기 위해 **출처가 `prtimes.jp`(공식 보도자료)로 명시된
이미지만** 자동으로 후보에 오릅니다 (`src/cardnews/copy.js`의 `ALLOWED_IMAGE_DOMAINS`). 스톡사진
(snapmart.jp)이나 리테일 상품 이미지(amzn.asia) 등 라이선스가 이 계정으로 넘어오지 않는 이미지는
제외됩니다. 사용된 이미지에는 카드 하단에 "출처: {도메인}" 표기가 자동으로 붙습니다. 허용 도메인을
넓히고 싶다면 `ALLOWED_IMAGE_DOMAINS`에 추가하세요 — 단, 상업적 재사용 라이선스가 있는지 먼저
확인하는 걸 권장합니다.

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
  "isCandidate": true
}
```

## 매일 자동 실행 (GitHub Actions)

`.github/workflows/collect-rss.yml`이 매일 22:00 UTC(한국시간 07:00)에 실행되어 RSS 수집 →
Claude 채점 → `data/` 커밋까지 처리합니다. `workflow_dispatch`로 수동 실행도 가능합니다.

`cardnews`(카드뉴스 이미지 생성)는 아직 이 워크플로에 포함되어 있지 않고 로컬에서 `npm run cardnews`로
수동 실행합니다. Chrome을 헤드리스로 띄워 이미지를 렌더링해야 해서 CI에 올리려면 러너에 Chromium을
설치하는 작업이 추가로 필요합니다 — 자동화가 필요하시면 알려주세요.

GitHub에 이 저장소를 올린 뒤 아래 설정이 필요합니다:

1. **Settings → Actions → General → Workflow permissions**에서
   **"Read and write permissions"**를 선택해야 워크플로가 `data/`를 커밋·push할 수 있습니다.
2. Actions가 비활성화되어 있다면 활성화해야 합니다.
3. **Settings → Secrets and variables → Actions → New repository secret**에서 `ANTHROPIC_API_KEY`를
   등록합니다 ([platform.claude.com](https://platform.claude.com) 콘솔에서 발급).

저장소 코드에는 키가 들어가지 않고 GitHub Secrets에만 저장되며, Actions 실행 시 환경변수로 주입됩니다.
로컬에서 테스트하려면 같은 이름의 환경변수를 직접 설정하면 됩니다.

## 로컬 스케줄러로 대신 실행하고 싶다면

Windows 작업 스케줄러에서 `npm run collect`를 매일 실행하도록 등록해도 됩니다. 다만 GitHub Actions를
선택했다면 로컬 실행 없이도 매일 자동으로 동작합니다.
