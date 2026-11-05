# DramaForge v1.6.0 검증 보고서

## 실행 명령

```bash
npm run check
python tests/browser-narrative-smoke.py
```

## 확인된 결과

| 시험 | 범위 | 상태 |
|---|---|---|
| Node.js 자동/회귀 | 이전 98개 + 서사 기능 신규 22개 | **PASS 120/120** |
| 승인 정설 무단 변경 | 작가 전용 후보/변경 요청, 승인본 비교 | **PASS** |
| 인과 그래프 | 순환, 자기 자신, 시간 역전, 승인 사건 참조 | **PASS** |
| 지식/믿음/정보 공개 | 극중 진실, 인물 믿음, 관객 믿음 구분, 조기 태그 차단 | **PASS** |
| 기획 3시간 축 | 극중 순서, 관객 공개, 변경·승인 시각 보존 | **PASS** |
| 경고 수준 | 치명 즉시, 중요 사유 입력 및 승인 전, 경미 묶음 | **PASS** |
| 변경 무효화 | 사건 버전 변경 시 의존 관계 재검토, 샷 승인 무효화 | **PASS** |
| 과거 ZIP | 새 스토리/관점 필드가 없는 프로젝트를 무손실 복원 | **PASS (단위 테스트)** |
| 새 ZIP | 승인 버전·검토 이유 포함한 내보내기·복원 | **PASS (단위 테스트)** |
| 격리 Chromium UI | 실제 서사 UI 이벤트/승인/화면 상태/1440·390px | **PASS (모의 프로젝트)** |
| 시각 위계 | 패널 제목 18px, CTA #FCD535, 모바일 오버플로 없음 | **PASS (격리 Chromium)** |

Chromium 스크린샷: `docs/narrative-ui-desktop-smoke.png`, `docs/narrative-ui-mobile-smoke.png`.

## 미검증 항목

- 실제 URL(`localhost`·Vercel Preview)을 브라우저에서 열고 전체 앱을 사용하는 E2E 테스트. 검사 환경에서 네트워크 네비게이션 `ERR_BLOCKED_BY_ADMINISTRATOR`가 발생하여 실제 URL 접속은 검증하지 못했습니다.
- 사용자 기기에서 IndexedDB에 저장된 데이터를 새로고침하여 읽기, 다른 브라우저에서 ZIP 가져오기.
- 실제 Codex 로그인/CLI 계정, 이미지 생성·AI 검토 요청, Seedance 외부 사이트 이용.
- macOS/Windows 로컬 연결 프로그램 설치, Vercel 운영 도메인과 브리지 연결.
- WCAG 2.2 AA 전체 적합성 및 실기기 스크린리더.

**완료 기준 해석:** 이 버전은 로컬 실행 가능한 개발 후보입니다. 120개 자동 테스트가 실사용 통합 테스트와 상용 서비스 보안을 보증하지는 않습니다.

## v1.6.1 소셜 메타데이터 / Analytics 테스트

`tests/social-metadata.test.mjs`에서 원본 메타태그·OG 이미지 크기·Analytics 스크립트·CSP 보존·Vercel URL 빌드·명시적 공개 도메인 우선순위를 검사합니다.

- 자동 검사: 테스트 명령 `npm run check` 실행 결과는 최종 결과 보고서에 기록합니다.
- 실서버 소셜 크롤러 미리보기: **NOT TESTED** (공개 도메인 미정 및 미배포)
- Vercel Analytics 실제 방문 이벤트 수신: **NOT TESTED** (대시보드 Enable 및 배포 필요)
- 기존 서사·정설·로컬 프로젝트 저장 구조: 기능 코드 변경 없음; 자동 회귀 테스트 실행.
