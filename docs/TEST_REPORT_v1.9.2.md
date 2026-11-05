# DramaForge v1.9.2 테스트 보고서

| 검사 | 결과 | 근거 |
|---|---|---|
| Node.js 자동 테스트 | PASS | `npm run check`: 164/164 통과 |
| 정적 Vercel 빌드 | PASS | `npm run build`: 정상 종료, 설치 EXE 부재는 명시적 안내 |
| 웹 UI의 설치 버튼/주소 참조 | PASS(정적 검사) | `web/main.mjs`는 `/downloads/DramaForge-Setup-Windows.exe`를 요구하고, 없는 경우 비활성화 |
| NodeCanvas C# 설치 소스 계승 | PASS(정적 비교) | `installer/NodeCanvasPort.cs`, `NodeCanvasUninstallPort.cs`의 프로토콜, 설치, SHA256 검증 및 런처 구현 |
| GitHub Actions Windows 빌드 및 EXE 생성 | NOT TESTED | 이 환경에서 Windows GitHub Actions를 직접 실행하지 않음 |
| Windows PE 리소스 추출/self-test | NOT TESTED | 실제 Actions 실행 뒤 확인 필요 |
| Windows 사용자 설치/프로토콜 등록 | NOT TESTED | Windows 실기기 테스트 필요 |
| ChatGPT 실계정 로그인 및 AI 샷 생성 | NOT TESTED | 사용자 PC와 Codex 인증 필요 |
| NodeCanvas 동시 사용 | NOT TESTED | 포트/프로토콜/설치 폴더의 정적 분리만 확인 |
| Vercel 실서버 배포/다운로드 | NOT TESTED | 사용자가 GitHub Desktop으로 푸시한 뒤 확인 필요 |

주의: **164개 테스트 통과는 Windows EXE의 실사용 검증과 다릅니다.**
