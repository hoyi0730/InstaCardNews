# InstaCardNews RSS Collector

일본 뷰티/패션 미디어의 RSS를 매일 자동으로 수집해 `data/` 폴더에 JSON으로 누적 저장하는 봇입니다.
추후 카드뉴스 생성 파이프라인의 원본 소스로 사용할 것을 염두에 두고 설계했습니다.

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
npm run collect
```

실행할 때마다 각 소스의 RSS를 가져와 `data/<source>.json`에 병합합니다. 이미 저장된 글(guid/link 기준)은
건너뛰고, 새 글만 추가합니다. 소스당 최근 500개까지 보관합니다(`src/store.js`의 `MAX_ITEMS_PER_SOURCE`).

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
  "fetchedAt": "..."      // 이 항목을 최초로 수집한 시각
}
```

## 매일 자동 실행 (GitHub Actions)

`.github/workflows/collect-rss.yml`이 매일 22:00 UTC(한국시간 07:00)에 실행되어 `data/`를 갱신하고,
변경 사항이 있으면 자동으로 커밋 및 push합니다. `workflow_dispatch`로 수동 실행도 가능합니다.

GitHub에 이 저장소를 올린 뒤 아래 설정이 필요합니다:

1. **Settings → Actions → General → Workflow permissions**에서
   **"Read and write permissions"**를 선택해야 워크플로가 `data/`를 커밋·push할 수 있습니다.
2. Actions가 비활성화되어 있다면 활성화해야 합니다.

## 로컬 스케줄러로 대신 실행하고 싶다면

Windows 작업 스케줄러에서 `npm run collect`를 매일 실행하도록 등록해도 됩니다. 다만 GitHub Actions를
선택했다면 로컬 실행 없이도 매일 자동으로 동작합니다.
