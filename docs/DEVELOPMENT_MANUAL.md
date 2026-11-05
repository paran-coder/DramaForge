# DramaForge v1.6.0 — 개발·구현·검증 매뉴얼

## 1. 제품 경계 및 설계 원칙

GitHub에서 소스를 관리하고 Vercel에 배포하는 **정적 웹앱**입니다. 사용자 원고·캐릭터·회차·샷·승인 내역은 브라우저 IndexedDB에 저장됩니다. 로컬 Codex 브리지는 `127.0.0.1:7331`에서만 실행하며 연결 페어링/Origin 검증을 거쳐 요청을 받아 Codex app-server로 전달합니다. 이 버전에서 브리지 API는 변경하지 않았습니다.

작가는 한 작품에 대한 유일한 최종 정설 승인자입니다. 실제 신원 인증 시스템은 포함되어 있지 않으므로 **'작가만 승인'은 로컬 단일 사용자 워크플로 규칙이지 원격 계정 인증·권한 확인을 의미하지 않습니다.**

ContinuityMemory v1.0.3의 규칙 가운데 중복되지 않는 네 가지를 이식했습니다. 기존 Canon·Series 원장을 대체하지 않고 별도의 Narr​ative 원장을 추가했습니다.

## 2. 폴더 및 모듈

```text
web/
  index.html              승인 기반 서사 기억 편집/시간축 UI
  theme.css               Binance-inspired 토큰, 14/18/26px 텍스트 위계
  main.mjs                앱 화면 상태·기존 이벤트·서사 UI 초기화
  narrative-ui.mjs        서사 후보 입력·승인·검토·시간축 DOM
  narrative.mjs           새 서사 데이터 계약, 승인·변경·검증 엔진
  series.mjs              회차 검사 + narrative 검사/승인 게이트 결합
  planning.mjs            AI 검토 컨텍스트에 승인된 서사 기억 주입
  core.mjs                새 프로젝트와 ZIP 가져오기에서 서사 스키마 적용
  canon.mjs               정설/승인/분기: 원본 유지
  guards.mjs              구조화 정설 검사: 원본 유지
  storage.mjs             IndexedDB: 원본 유지
  zip.mjs                 프로젝트 JSON+참조 이미지 ZIP: 원본 유지
bridge/                   Codex 로컬 연결(기존 1.5.0)
tests/narrative.test.mjs  신규 22개 Node.js 테스트
tests/browser-narrative-smoke.py  선택적 격리 Chromium UI 테스트
```

## 3. 데이터 구조와 상태 전이

프로젝트 `schemaVersion:2`는 그대로 유지하며 **옵션으로 `narrative` 원장**을 사용합니다. 구버전 ZIP을 가져올 때 이 객체가 없다면 비어 있는 v1 데이터 구조를 생성하고 기존 승인본은 수정하지 않습니다.

```json
{
  "narrative": {
    "schemaVersion": 1,
    "records": [],
    "changes": [],
    "audit": [],
    "reviews": []
  }
}
```

기록 유형은 세 가지입니다.

- `causality`: `causeEventId`, `effectEventId`, `prerequisite`, `reason`, `exception`, `sourceQuote`.
- `perspective`: `worldTruth`, `character`, `characterBelief`, `characterLearnEpisode`, `audienceBelief`, `audienceMisleadEpisode`, `truthRevealEpisode`, `intentionalMisdirection`, `directorIntent`.
- `timeline`: `eventId`, `worldOrder`, `worldTime`, `audienceEpisode`, `audienceScene`. `worldOrder`는 극중 시간의 **명시적 순서 숫자**이며 `audienceEpisode`는 영상에서 드러나는 회차입니다.

기록 상태: `candidate → approved/rejected`. 승인본 수정은 `proposeNarrativeChange()`로 `pending` 변경 요청을 생성한 뒤 `resolveNarrativeChange()`로 작가가 승인/반려합니다. 승인 당시의 데이터는 `versions[]`에 별도로 보존하고, 승인된 레코드가 저장된 승인 스냅샷과 달라지면 `ensureNarrative()`에서 읽기 오류를 발생시킵니다. 단, 로컬 데이터 파일과 스냅샷을 동시에 조작하는 악의적 변조에 대한 암호학적 보증은 아닙니다.

## 4. 인과·시간·관점 검증

1. 인과관계의 양쪽 대상은 승인된 `series` 사건이어야 합니다. 같은 사건의 자기 참조, 중복 관계, 그래프 순환은 승인을 차단합니다.
2. 극중 순서가 양쪽에 등록되었다면 원인 `worldOrder`는 결과보다 반드시 작아야 합니다. 극중 순서 미등록 상태에서는 인과 순서가 **미확인**이며, 화면상 공개 순서만 뒤집혀 있어도 즉시 오류로 확정하지 않습니다.
3. 공개 회차가 원인보다 먼저일 때는 회상·역순 서사가 가능하므로 `warning`으로 표시합니다.
4. 세계관 진실과 인물·관객 믿음은 별도 필드입니다. 인물이 믿는 내용은 자동으로 세계관의 사실로 승격하지 않습니다.
5. `[[AUDIENCE_BELIEF:서사기록ID]]`, `[[REVEAL_TRUTH:서사기록ID]]` 같은 명시적 태그가 승인된 시점보다 먼저 등장하면 `blocked`로 분류합니다. 일반 대본에서 유사한 문장이 나타나면 비차단 의심 경고만 남깁니다.
6. 원본 사건을 변경하면 이전 사건 revision을 참조하는 승인된 인과/시간 기록을 `NARRATIVE_DEPENDENCY_STALE`로 표시합니다. 작가가 `refreshNarrativeDependencies()`를 실행해 최신 관계를 재검증해야 합니다.

## 5. 경고 개입 정책과 샷 승인 보호

- **critical:** 구조적으로 입증된 충돌. 집필 중 즉시 표시, 샷 승인/최종 프롬프트 출력 차단. 단순 검토 메모로 면제할 수 없습니다.
- **important:** 시간 공개 순서와 개연성의 의심. 집필 중 보이지만 자동 차단하지 않습니다. 최종 샷 승인 전에 `acknowledgeNarrativeIssues()`로 10자 이상의 검토 근거를 남겨야 합니다. 원고·승인 정설·해당 사건 revision이 바뀌면 이전 근거는 만료됩니다.
- **minor:** 단순 단서 부재·검사 불확실성. 집필 화면에서는 개수만 표시하고 회차 검토 화면의 접힌 목록에서 전체 확인합니다.

`series.inspectEpisode()`는 기존 Series 경고와 Narrative 경고를 통합하고, `assertEpisodeForShot()`는 Narrative의 승인 게이트를 추가 호출합니다. `core.approveShot()`와 `core.exportApprovedSeedancePrompt()`는 이미 이 게이트를 통과해야 작동하므로 별도 우회 경로를 만들지 않습니다. `seriesSignature()`에 승인된 Narrative 기록을 포함해 새 승인이 기존 샷 승인 지문을 무효화합니다.

## 6. AI에게 전달되는 데이터

`planning.buildPlanningPrompt()`와 `series.seriesPromptContext()`에는 **승인된** 인과/관점/시간 기록만 포함됩니다. 미승인 후보는 출력 컨텍스트에 포함하지 않습니다. 실제로 Codex 검토를 호출하면 그 맥락이 외부 AI 서비스로 전송될 수 있으며, 사용자가 Vercel 서버에 원고를 저장하지 않는다는 원칙과는 별개의 데이터 이동입니다.

## 7. 실제 실행

```bash
node --version   # >= 20
npm run check
npm run dev
# 다른 터미널 (Codex CLI가 설치·로그인된 사용자 PC에서만)
npm run bridge
```

브라우저: `http://127.0.0.1:4173` (이미 사용 중이면 포트 변경). 브리지 자체는 `127.0.0.1:7331`에서 실행하며 비허용 웹 주소 및 페어링 실패를 거절합니다. 사용자가 제공한 NodeCanvas 구조를 참고한 기존 Codex 어댑터를 유지했습니다.

## 8. 자동 테스트 및 수동 체크

```bash
npm run check
python tests/browser-narrative-smoke.py
```

Node.js 자동 테스트: **120개 통과**. 테스트는 승인/기각·순환/시간 오류·반전/조기공개·경고 우선순위·프로젝트/ZIP 호환을 포함합니다. 격리 Chromium은 JS 모듈을 브라우저 내 메모리 테스트 환경으로 로드하여 실제 DOM 이벤트와 1440/390px 스타일·오버플로를 확인합니다. 모의 `crypto.randomUUID`와 메모리 작품 데이터를 사용하므로 실제 IndexedDB, 로컬 HTTP 서버 URL, Codex 로그인은 테스트하지 않습니다.

사용자 장치에서 직접 확인할 통합 테스트는 다음 순서입니다.

1. Vercel Preview/로컬 URL에서 작품 생성 → 에피소드 2개 → 승인 사건 2개 등록.
2. 새 인과관계 후보 등록/승인 → 극중 시간 역순을 시도해 승인 거절 확인.
3. 인물/관객 정보 상태 등록 → 조기 공개 태그와 일반 문장 경고 구분.
4. 중요 경고에 작가 검토 메모 저장 → 원고 수정 → 검토 상태 자동 만료 확인.
5. 브라우저 새로고침 후 기록 보존, ZIP 백업 후 같은 프로젝트 복원.
6. 승인된 사건 변경 뒤 기존 인과관계가 재검토 대상으로 바뀌는지 확인.
7. Codex 실계정 페어링·작업 요청 및 생성 결과 검사. 등록된 정설이 임의 변경되지 않는지 검증.

이 릴리스는 실사용 통합 단계가 남아 있으며 공개 운영 배포 성공을 표시하지 않습니다.

## 9. 제한과 향후 안전 장치

- 일반 자연어에서 숨은 사건 원인이나 불일치를 **확정 탐지**하지 않습니다. 증거가 약하면 의심으로만 표시합니다.
- 작가 단독 권한은 로컬 브라우저 워크플로에 한정됩니다. 공개 서비스의 계정·공동 편집·악의적 로컬 데이터 변조에 대한 인증 체계는 별도 개발이 필요합니다.
- 시간축의 자유 텍스트(`worldTime`)는 비교 가능한 시간 계산식이 아닙니다. `worldOrder`만 결정적 비교에 사용합니다.
- 대용량 영상은 브라우저 데이터베이스에 저장하지 않습니다.
- Vercel 실배포, 운영 도메인 브리지 CORS, 사용자 IndexedDB 실기기, Codex 계정 실실행은 **NOT TESTED**입니다.

## v1.6.1 — Open Graph / Vercel Analytics 개발 및 배포

- OG 자산: `web/og-image.png` (1200×630). 태그는 `web/index.html`에 있습니다.
- 빌드: `npm run build` → `dist/`에 웹 자산 복제, OG 이미지·Twitter 이미지 URL의 절대 주소 생성.
- 배포 URL 소스 우선순위: `PUBLIC_SITE_URL` (명시적 URL) > `VERCEL_URL` (Vercel 제공). 로컬에서는 상대 주소를 유지합니다.
- `vercel.json`은 빌드 명령과 `dist` 출력 폴더를 지정합니다. Vercel 프로젝트 프레임워크 프리셋은 Other/정적 사이트로 설정합니다.
- 방문 통계: 정적 HTML 전용 `analytics-init.js` + `/_vercel/insights/script.js`를 이용합니다. 원본 Next.js용 `<Analytics />` 문법을 적용하지 않습니다. 동일 출처 리소스여서 기존 CSP의 `script-src 'self'`, `connect-src 'self'`를 변경하지 않았습니다.
- **Vercel 대시보드에서 Analytics → Enable 이후 재배포**해야 실제 추적 기능이 활성화됩니다. 빌드 테스트만으로 통계 수신을 증명할 수 없습니다.
- 배포 이후 응답 HTML에서 `og:image`가 `https://도메인/og-image.png`인지, 이미지 응답이 200인지, `/_vercel/insights/script.js`가 정상 반환되는지 확인합니다.
- 별도 문서 `docs/OG_ANALYTICS.md`에 점검 절차와 데이터 경계를 기록했습니다.
