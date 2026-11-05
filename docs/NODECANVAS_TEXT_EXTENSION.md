# DramaForge v1.9.0 — NodeCanvas 기반 텍스트 기능 확장

## 1. 결정된 개발 방향

사용자가 제공한 `2026-11-01-NodeCanvas-v1.13.0-github.zip`을 근거로 이미지 생성 및 ChatGPT 인증·Codex app-server 제어 구현을 계승합니다. NodeCanvas 원본 EXE는 편집하거나 덮어쓰지 않습니다. 별도 `DramaForge` 네이티브 연결 앱이 `dramaforge://connect`, 루프백 포트 `7331`을 사용합니다. 원본 NodeCanvas는 `nodecanvas://connect`, `7330`으로 계속 독립 사용합니다.

원본 NodeCanvas EXE를 그대로 사용하면서 새 텍스트 RPC를 호출할 수는 없습니다. 새 기능을 쓰려면 *확장된 JavaScript가 포함된 새 DramaForge 설치 EXE*를 Windows에서 빌드해야 합니다.

## 2. 실제 코드 변경

| 원본/기존 | 변경 | 이유 |
|---|---|---|
| NodeCanvas `connector/2026-10-31-codex.mjs` | `bridge/nodecanvas-codex.mjs`로 복제·최소 조정 | 로그인, app-server, 이미지 경로 검증, 취소, 작업 정리 구조 계승 |
| `bridge/provider.mjs` | 원본 provider 상속 후 `generateText` 추가 | 대본/샷/정설/기획을 무도구 JSON 응답으로 처리 |
| `bridge/server.mjs` | 승인된 작업 모드 `shots`, `canon`, `review`, `planning`, `image` 허용 | 서버에서도 임의 실행 API 금지 |
| `web/main.mjs` | DramaForge `bridge-client.mjs` 연결 | `dramaforge://`, 7331, 텍스트/이미지 작업 호출 |
| `web/index.html`, `web/guide.html` | 독립형 확장 커넥터 안내 | 기존 NodeCanvas EXE가 텍스트를 지원한다고 오인 방지 |
| `vercel.json` | `connect-src`를 7331로 수정 | HTTPS 웹사이트 → 로컬 브리지 접근을 CSP가 막지 않도록 설정 |
| `installer/NodeCanvasPort.cs` | 1.9.0, Windows 설치·프로토콜·로그인 호출 유지 | 기존 NodeCanvas 운영체제 실행 패턴 사용 |
| `installer/build-windows.ps1` | `bridge/nodecanvas-codex.mjs` 포함 | 설치된 PC에서 기능 누락 방지 |

## 3. 작업별 Codex 호출

- `shots`: JSON `shots` 구조, 승인된 정설 보호, 명시적 사실만 `guardClaims`로 전달
- `canon`: JSON `decisions` 후보만 생성, 승인 상태 변경 금지
- `review`: 정설·중복·캐릭터 지식·연표 검토, 오류 근거와 수정 제안 반환
- `planning`: 기획 대화의 새 제안과 미해결 질문을 JSON으로 반환
- `image`: NodeCanvas 원본 이미지 생성 흐름 사용, 결과 PNG/JPEG/WebP 확인

브리지 서버는 허용된 Origin과 일회성 네이티브 챌린지 뒤에 발급된 세션 토큰을 요구합니다. Codex 실행부는 `shell_tool=false`, `multi_agent=false`, `web_search=disabled` 등을 적용하고 임의 도구 승인 요청을 거부합니다. 텍스트 작업은 임시 읽기 전용 작업 공간에서 실행하고 사용 후 정리합니다.

## 4. 빌드·공개 순서

1. GitHub에 이 버전의 소스를 **작업 브랜치**로 반영합니다.
2. GitHub Actions에서 `Build DramaForge NodeCanvas-based connector v1.9.0` 작업을 Windows 러너로 실행합니다.
3. `DramaForge-Setup-Windows-v1.9.0-unsigned` 아티팩트의 실제 EXE/해시/실행 검증 결과를 확인합니다.
4. `web/downloads/DramaForge-Setup-Windows.exe`로 EXE를 추가해 Vercel **Preview**를 빌드합니다.
5. Windows에서 신규 설치 → `dramaforge://connect` 승인 → ChatGPT 로그인 → 텍스트 샷 → 스토리보드 이미지를 실제로 검사합니다.
6. Windows 서명·사용자 설치 안내를 갖춘 다음 프로덕션에 공개합니다.

**현재 v1.9.0 소스 ZIP 안에는 컴파일된 신규 Windows EXE가 없습니다.** 기존 `NodeCanvas-Setup-v1.13.0.exe`는 원본 보관용이며 DramaForge 텍스트 작업을 수행하지 않습니다. Vercel 정적 빌드 성공은 새 설치 기능 성공을 의미하지 않습니다.

## 5. 검증·한계

- Node.js 테스트 158/158 통과 (모의 Codex RPC + 브리지 승인/텍스트/이미지 요청 포함)
- `npm run build` 통과
- 실제 Windows csc 컴파일: NOT TESTED (Linux 환경)
- 실제 Windows 원클릭 설치 및 프로토콜 실행: NOT TESTED
- 실제 ChatGPT 로그인·Codex 샷/이미지 생성: NOT TESTED
- Vercel 새 버전 실제 배포: NOT TESTED

소프트웨어가 출력한 구조화 JSON과 서사적 정확도는 별개입니다. 출력은 승인되지 않은 후보로만 저장되며 작가가 최종 승인합니다.
