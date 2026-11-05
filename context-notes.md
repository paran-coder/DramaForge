# DramaForge v1.8.0 — Context Notes

## 목표
사용자 승인(2026-11-05): NodeCanvas v1.13.0의 네이티브 프로토콜 호출 + 1회용 챌린지 연결 방식으로 기존 DramaForge 브리지 교체.

## 고정 제약
- 작품 데이터: 사용자 브라우저의 IndexedDB / 로컬 백업. Vercel 서버에 사용자 원고 저장·중계 금지.
- 작가 단독 정설 승인, What-if 분기, 연속성 검증 등 기존 v1.7.3 동작 보존.
- Codex 인증은 사용자 PC의 공식 Codex CLI에서 처리.
- 연결코드 수동 입력 금지. 브라우저에서 직접 사용자의 PC에 프로그램을 무단 설치하지 않음.
- 구 NodeCanvas 포트 7330과 충돌하지 않는 DramaForge 포트 7331 유지.
- 공개 운영 사이트: https://dramaforge-lemon-ten.vercel.app
- Windows 네이티브 설치와 프로토콜 핸들러. macOS/Linux의 자동 네이티브 연결은 별도 검증 필요.

## 참조 구현
사용자 첨부 `2026-11-01-NodeCanvas-v1.13.0-github.zip`:
- `connector/2026-10-31-activation.mjs` (확인값·기한·클레임)
- `connector/2026-10-31-server.mjs` (활성화 파일 폴링·origin 검증)
- `installer/2026-10-31-Connector.cs` (custom protocol, 사용자 승인, 실행 앱)
- `web/2026-10-31-app.mjs` (브라우저 secret → challenge → OS 앱 실행 → claim)

## 단계
1. NodeCanvas의 승인 계약을 DramaForge 포트/경로/작업 API로 재구성.
2. 브라우저가 OS 프로토콜로 앱 호출, 세션 챌린지 승인.
3. Windows C# 연결 앱 및 기존 설치 업그레이드 설계. 바이너리 컴파일은 Windows runner에서 별도 실행.
4. 공격 시나리오, 회귀, 정적 빌드 테스트. 실기기 로그인 및 설치는 미검증으로 유지.

## 구현 이후 상태
브라우저 + Node 서버 프로토콜 통합 테스트는 통과했습니다. Windows C# 런처는 이 환경에서 컴파일할 수 없었으므로 실제 바이너리가 포함되지 않으며 출시 준비 완료를 주장하지 않습니다. `web/downloads/`의 구버전 설치 스크립트와 브리지 ZIP을 공개 다운로드 대상에서 제거했습니다. GitHub Actions가 Windows에서 EXE를 빌드하면 서명·실기기 검증 후 별도로 배포해야 합니다.
