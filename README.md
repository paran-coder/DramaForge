# DramaForge v1.6.0 — 승인 기반 서사 기억 및 제작 관리

사용자의 공개 서비스 계획에 따라 **정적 브라우저 웹앱 + 사용자 PC의 Codex 로컬 브리지** 구조를 유지합니다. 웹사이트는 Vercel 배포용 정적 파일이며, 작품은 해당 브라우저의 IndexedDB에 저장합니다. Codex 요청을 명시적으로 실행할 때 대본·프롬프트가 로컬 연결 프로그램을 통해 OpenAI로 전송될 수 있습니다.

## v1.6.0에서 추가한 것

| 기능 | 구현 파일 | 보안/운영 규칙 |
|---|---|---|
| 사건 인과관계 | `web/narrative.mjs` | 승인된 사건 ID에만 연결, 순환 인과·불가능한 극중 순서 차단 |
| 실제 진실·인물/관객 믿음 분리 | `web/narrative.mjs` | 의도적 반전의 시작/진실 공개 회차와 연출 의도 명시 |
| 세 가지 시간축 | `web/narrative.mjs` | 세계관 실제 시간·시청자 공개·작가 최종 승인 시각을 구분 |
| 알림 우선순위 | `web/narrative.mjs`, `web/narrative-ui.mjs` | 치명 즉시 표시·차단, 중요 승인 전 작가 검토, 경미 일괄 확인 |
| 웹 화면 | `web/index.html`, `web/theme.css`, `web/main.mjs`, `web/narrative-ui.mjs` | 기존 v1.5.1 디자인 토큰과 텍스트 위계 유지 |

확정된 정설과 회차 기록은 유지됩니다. 새 서사 관계는 **후보 → 작가 승인**을 거치며, 승인 후에는 변경 요청이 없이는 수정되지 않습니다. 원인이 되는 사건이 변경되면 관련 서사 기록을 재검증해야 합니다. 생성형 AI의 의미 판단은 자동으로 공식 정설이 되지 않습니다.

## 실행

Node.js 20 이상에서:

```bash
npm run check
npm run dev
```

기본 접속: `http://127.0.0.1:4173` (포트가 충돌하면 `PORT=4181 npm run dev`). Codex 연결을 사용하려면 별도 터미널에서 `npm run bridge`와 사용자가 설치·로그인한 Codex CLI가 필요합니다. 로컬 브리지 미연결 상태에서도 대본·연속성 기록·백업 및 구조화 검사는 동작합니다.

## 새 기능 사용 흐름

1. **회차 · 연속성**에서 에피소드를 추가하고 사건 연표 후보를 등록한 뒤 **작가 승인**합니다.
2. **사건 인과 · 믿음 · 공개 시간**에서 승인된 사건을 원인·결과로 연결합니다. 선행 조건과 이유가 필요합니다.
3. **정보 상태**에서는 세계관의 실제 진실, 등장인물의 믿음, 관객이 믿는 내용을 구분합니다. 의도된 반전은 연출 의도 및 진실 공개 회차를 기록합니다.
4. **시간축**에서는 극중 실제 발생 순서(숫자), 극중 시점 설명, 관객 공개 회차를 따로 입력합니다.
5. 후보를 승인하면 해당 정보는 이후 집필 및 AI 프롬프트의 승인 맥락에 포함됩니다.
6. 치명적 충돌은 바로 확인하고, 중요 경고가 있으면 작가의 근거를 기록한 후 샷을 승인합니다. 경미한 경고는 접힌 목록에서 확인합니다.
7. 작업을 마치면 **ZIP 백업**으로 작품과 정설 이력을 저장합니다. 대용량 영상 원본은 별도로 백업해야 합니다.

## 검증 상태

- `npm run check`: **120/120** 자동 테스트 통과 (v1.5.1 회귀 98 + 신규 22)
- `python tests/browser-narrative-smoke.py`: 격리 Chromium의 실제 DOM 클릭·작가 승인·시간축·색상·1440px/390px 화면 테스트 **PASS**
- 이 브라우저 시험은 네트워크를 통하지 않는 메모리상 모의 프로젝트로 실행했습니다. **실제 IndexedDB, Codex 계정 로그인 및 Vercel Preview/운영 배포는 미검증**입니다.
- 기존 `DramaForge-Connector-v1.5.0.zip`은 그대로 유지했습니다. 브리지 프로토콜을 수정하지 않았습니다.

`docs/DEVELOPMENT_MANUAL.md`, `docs/TEST_REPORT.md`, `docs/CONTINUITY_MAPPING.md`를 참고하세요.

**릴리스 상태:** 로컬 실행 가능한 개발 후보. 공개 운영 배포 완료 아님.

## v1.6.1 — 소셜 공유 이미지 / Vercel Web Analytics

- 공유 이미지: `web/og-image.png` (1200×630 PNG). 사용자가 승인한 DramaForge 이미지를 OG 규격으로 조정했습니다.
- `web/index.html`에 Open Graph, Twitter/X summary_large_image, 설명 및 미리보기 이미지 태그를 추가했습니다.
- Vercel Analytics: **정적 HTML 앱**이므로 React/Next.js용 `<Analytics />` 대신 `web/analytics-init.js` + `/_vercel/insights/script.js`를 사용합니다. CSP의 `unsafe-inline`은 허용하지 않습니다.
- Vercel 배포 시 `npm run build`가 자동 실행되어, `VERCEL_URL` 또는 명시한 `PUBLIC_SITE_URL`을 바탕으로 OG 이미지 주소를 절대 URL로 지정하고 `og:url`과 `canonical` 링크를 만듭니다. 배포 주소를 지금 입력할 필요는 없습니다.
- Vercel 대시보드에서 **Project → Analytics / Web Analytics → Enable**을 선택한 뒤 다시 배포해야 실제 방문 통계가 수집됩니다.
- Analytics는 방문·페이지 조회를 수집합니다. 작품 내용·원고·정설·브리지 응답을 추적 이벤트로 전송하는 코드는 없습니다. 사용자가 Codex를 명시적으로 호출하는 기존 데이터 흐름은 동일합니다.
- 로컬 `npm run dev`에서는 Vercel Analytics의 `/_vercel/insights/script.js` 경로가 제공되지 않으므로 네트워크 요청이 실패할 수 있습니다. 실제 수집은 Vercel 배포 이후에만 확인할 수 있습니다.

자세한 배포 검증법: `docs/OG_ANALYTICS.md`.


## v1.6.2 운영 주소 및 공유 메타데이터

- 정식 운영 도메인: `https://dramaforge-lemon-ten.vercel.app/`
- Production 빌드에 고정 도메인 OG/Twitter/canonical 적용, Preview는 Vercel 개별 URL 유지
- 배포 후 Vercel Web Analytics 대시보드에서 활성화·실제 방문 수집 확인 필요
- 기존 대본·정설·로컬 저장·Codex 브리지 로직 변경 없음
- 상세 절차: `docs/OG_ANALYTICS.md`
