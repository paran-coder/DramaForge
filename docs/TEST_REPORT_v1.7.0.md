# DramaForge v1.7.0 검증 보고서

| 검증 영역 | 결과 | 근거 / 한계 |
|---|---|---|
| Node 자동 테스트 | PASS 132/132 | `npm run check` |
| JS 문법·정적 빌드 | PASS | `node --check` + `npm run build` |
| 2가지 작품 시작 모드 | PASS (모델) | 신규 프로젝트 메타데이터 및 AI 프롬프트 분기 자동 테스트 |
| 참고 문서 여러 파일 | PASS (모델) | 2개 자료, 보안·용량 검증, ZIP 왕복, 정설 미변경 |
| 사용방법 및 진입 UI | PASS (정적 DOM) | 실제 HTML/CSS 격리 Chromium 렌더링, 1440px / 390px 가로 넘침 없음 |
| 로컬 연결코드 없는 브리지 | PASS (모의 provider) | 정확한 Origin은 200, 타 출처 403, 토큰 없는 AI 작업 401 |
| Native 설치 자동화 | NOT IMPLEMENTED | 브라우저에서 무동의 네이티브 설치 불가, 사용자 최초 설치 필요 |
| 전체 앱 실사용 브라우저 | NOT TESTED | 환경 정책상 페이지 URL 탐색 `ERR_BLOCKED_BY_ADMINISTRATOR`; 모의 DOM은 전체 기능 증명이 아님 |
| 실제 IndexedDB 영속화 | NOT TESTED | 런타임 스토리지 통합 테스트 없음 |
| 실제 Codex 로그인·이미지 생성 | NOT TESTED | 실제 PC 계정·CLI에 접근하지 않음 |
| Vercel Preview 및 운영 업데이트 | NOT DEPLOYED | 소스 ZIP만 제공, 연결된 사이트 변경하지 않음 |

## 확인한 보안 한계
로컬 브리지의 `POST /api/connect`는 사전에 허용된 Origin을 신뢰하는 방식입니다. 허용된 사이트의 JavaScript가 변조되거나 제3자 스크립트에 의해 침해되는 경우 로컬 토큰 취득 위험이 있으므로 공개 배포 시 의존 스크립트와 CSP 관리가 중요합니다. 브리지는 무관한 웹 주소의 요청을 차단합니다.

## 회귀 보호
기존 정설 승인·변경·분기·연속성 검사·Seedance 프롬프트/스토리보드·ZIP 백업 기능 관련 Node 테스트를 유지했습니다. 자연어의 숨은 모순은 AI의 판단으로만 차단하지 않습니다.
