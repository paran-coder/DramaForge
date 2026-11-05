# DramaForge v1.7.1 Test Report

| 검증 항목 | 상태 | 근거 |
|---|---|---|
| 자동 테스트 | PASS | 135/135 |
| Static build | PASS | npm run build |
| Installer payload SHA-256 | PASS | installer.test.mjs |
| Download UI | PASS | 설치 버튼 / 운영체제 파일 선택 정적 코드 검사 |
| Loopback bridge authorization | PASS | bridge.test.mjs / public-deploy.test.mjs |
| 설치 UI 데스크톱/모바일 정적 Chromium | PASS | docs/install-dialog-desktop.png / install-dialog-mobile.png |
| Windows .cmd 설치 실제 실행 | NOT TESTED | Linux 환경에서 Windows 실행 불가 |
| macOS/Linux 설치 실제 실행 | NOT TESTED | 네트워크/운영 환경 제한 |
| Windows 그래픽 EXE 컴파일·서명 | NOT TESTED | Windows runner 검증 필요 |
| 브라우저 실제 설치 자동 감지 | NOT TESTED | 실제 PC 설치 필요 |
| Codex 로그인·이미지 생성 | NOT TESTED | 실제 ChatGPT 사용자 인증 필요 |
| Vercel production | NOT TESTED | 업데이트 미배포 |

브라우저는 사용자 동의 없이 네이티브 설치를 실행할 수 없습니다. 첫 파일 실행·승인 후 필요한 구성요소만 자동 준비합니다.
