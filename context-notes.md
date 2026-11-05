# DramaForge v1.6.0 — 설계/변경 기록

## 사용자가 승인한 요구사항

- ContinuityMemory v1.0.3을 스킬 전체로 설치하지 않고 **선별 기능 4개만** 통합.
- 작품의 공식 정설은 **작가 1인 승인**만 가능. 기존 승인 사항에 대한 반복 질문 없음.
- 대본·AI 대화 중심 화면, 회차별 연속성, What-if 분리, Seedance 프롬프트/외부 영상 제작은 유지.
- 향후 GitHub에 소스를 관리하고 Vercel에 **공개** 정적 앱으로 제공. 사용자 데이터는 로컬 브라우저에 보존.
- 사용자가 제공한 UI Polish와 Binance 컬러 디자인 토큰(v1.5.1) 그대로 유지.

## v1.6.0 구현 결정

1. `narrative` 선택적 프로젝트 원장 추가. 과거 `canon`, `series` 승인본은 전혀 재작성하지 않음.
2. 인과관계는 승인된 기존 사건 ID만 참조. 명시적 세계관 시간 순서가 있으면 원인/결과 역전 불허.
3. 세계관 진실/인물 지식·믿음/시청자 정보·믿음을 별개 값으로 기록. 오해·반전은 작가가 의도를 남김.
4. 시간축은 극중 발생 세계 순서(`worldOrder`) + 시청자 공개(`audienceEpisode`) + 승인 버전 시각(`approvedAt`).
5. 치명 문제는 즉시/차단, 중요는 작가 승인 전 검토 이유, 경미는 일괄 목록. 불확실한 의미 추론은 차단이 아니라 경고.
6. 관련 사건 revision이 변하면 `NARRATIVE_DEPENDENCY_STALE`로 표시하고 작가의 재확인을 요구.

## 상태

- Node 자동 테스트: 120/120 PASS (v1.5.1 98 + v1.6.0 22).
- Chromium DOM/CSS 모의 프로젝트: PASS (1440/390px, 클릭·승인·비교·가로 넘침 없음).
- 실제 Codex·IndexedDB 새로고침·Vercel Preview/운영: NOT TESTED.
- 전체 소스/매뉴얼/테스트 결과를 ZIP으로 제공. 사용자 GitHub 저장소나 Vercel 프로젝트는 변경하지 않음.

## v1.6.1 — 사용자 요청 승인에 따른 소셜 미리보기 및 방문 분석

- 사용자가 직전에 승인한 DramaForge 홍보 이미지를 `og-image.png`로 사용함.
- URL 미확정: 배포 환경의 VERCEL_URL로 빌드 시 절대 URL을 설정, 사용자가 알려주는 운영 도메인은 추후 PUBLIC_SITE_URL로 지정.
- 첨부 안내의 React/Next.js 코드가 아니라 정적 HTML용 Vercel Web Analytics 경로를 사용. 대본/이미지 등 콘텐츠 수집 코드는 추가하지 않음.
- 범위 보호: 정설·승인·브리지·스토리보드·백업 기능 및 내부 데이터 로직 변경 없음. 캐릭터/서사 승인 규칙도 변경 없음.
- 코드 변경은 메타데이터/빌드 단계/브라우저 Analytics 스크립트 및 설명문에 한정.


## v1.6.2 운영 도메인 확정

- 사용자가 운영 URL `https://dramaforge-lemon-ten.vercel.app/`을 제공함.
- Production 빌드에만 확정 도메인을 기본 적용하고 Preview는 독립 주소 유지.
- API 권한으로 배포 READY 확인, 실제 HTML 조회는 Vercel 연결 권한 거부로 미검증.
- 정설·시나리오·브리지 기능은 수정하지 않음.
