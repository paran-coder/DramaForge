# DramaForge v1.8.0 — 네이티브 설치 및 사용자 환경 검증

## 1. Windows 빌드와 배포 (반드시 실제 Windows 러너에서)

1. 리포지토리 체크아웃 후 `npm run check` 및 `npm run build`를 실행합니다.
2. PowerShell에서 `./installer/build-windows.ps1`을 실행합니다. 스크립트가 `ConnectorLauncher.cs`를 네이티브 `DramaForge-Connect.exe`로 컴파일하고, JS 브리지 페이로드와 함께 `Setup.cs`를 GUI `DramaForge-Setup-Windows.exe`로 컴파일합니다.
3. 두 EXE 모두 `--self-test`를 통과했는지, SHA-256 해시 및 파일 크기를 확인합니다.
4. 공개 배포 전 코드 서명과 Windows 보안 정책·SmartScreen 동작을 점검합니다. 아직 서명되지 않은 EXE는 일반 사용자에게 경고가 나타날 수 있습니다.
5. 생성된 `web/downloads/DramaForge-Setup-Windows.exe`를 정적 사이트 소스에 반영한 뒤 Vercel Preview를 배포합니다. 설치 파일의 응답이 `200`이고 실제 PE 바이너리인지 확인합니다(HTML/404를 설치 완료로 간주하지 않습니다).
6. 테스트 PC에서 아래 설치·이전 버전 업데이트 시나리오를 확인한 뒤 운영 배포 여부를 결정합니다.

## 2. 사용자 작업 흐름

- 사이트 `AI 연결` → `PC 연결 앱 열기`를 누릅니다.
- 미설치 PC는 `Windows 연결 앱 설치`를 클릭해 EXE를 다운로드하고 최초 1회 실행·동의합니다.
- EXE는 공식 Node.js/Codex 바이너리를 사전에 지정된 SHA-256과 대조한 뒤, 웹에 노출되지 않은 내장 JS 브리지 및 네이티브 런처를 사용자 프로필에 설치합니다.
- URL 프로토콜이 등록된 뒤 브라우저에서 `PC 연결 앱 열기`를 누르면 운영체제가 `DramaForge-Connect.exe`를 실행합니다.
- 최초 연결에는 실행 앱에서 **`https://dramaforge-lemon-ten.vercel.app`** 주소를 확인하고 허용합니다. `challenge`와 Origin만 활성화 파일에 저장하며, 원본 비밀값은 브라우저가 보유합니다.
- 브리지는 120초 미만의 1회용 활성화 파일을 소비하고 브라우저에 세션 토큰을 발급합니다. 브라우저 세션에 토큰을 보존합니다. 이후 `ChatGPT 로그인`이 Codex app-server의 공식 로그인 URL을 엽니다.

## 3. 핵심 동작 및 위협 모델

| 항목 | 기대 결과 |
|---|---|
| 허용 웹사이트라고 POST `/api/connect` | 410, 인증 토큰 미발급 |
| 임의 웹사이트에서 `/api/claim` | 403 |
| 허용 웹사이트에서 네이티브 앱 승인 없이 `/api/claim` | 401 |
| Native 활성화 파일 + 해당 브라우저의 secret | 한 번만 승인 |
| 서로 다른 Origin 또는 만료 후 재사용 | 거부 |
| `mode=exec` / 임의 셸 | 거부 |
| 연결 중 다른 제품(NodeCanvas) 실행 | 포트 7330 독립 유지 |
| 이전 v1.7.x 설치 감지 | 허용된 설치 폴더만 중지·백업·교체, 실패 시 롤백 |

웹 브라우저는 Windows에 프로그램을 자동으로 설치할 수 없습니다. 로컬 네트워크 접근 권한과 사용자 지정 URL 실행은 각각 사용자의 승인이 필요할 수 있습니다.

## 4. 실제 PC 검증표

- [ ] Windows에서 네이티브 `Setup.exe` 컴파일 및 `--self-test`
- [ ] 서명 및 보안 제품 차단 여부 확인
- [ ] 신규 설치: `%LOCALAPPDATA%\Programs\DramaForgeConnector\DramaForge-Connect.exe` 생성
- [ ] 레지스트리 `HKCU\Software\Classes\dramaforge\shell\open\command` 확인
- [ ] 기존 v1.7.2 설치를 업데이트하고 백업이 정상 정리되는지 확인
- [ ] 실제 앱 버튼 클릭에서 Windows `이 앱을 열까요?` 안내 및 사이트 승인창 표시
- [ ] `http://127.0.0.1:7331/health`에서 `1.8.0` 확인
- [ ] Chrome/Edge 브라우저의 Private Network Access 동의 및 재연결 확인
- [ ] ChatGPT 공식 로그인, 앱 재시작, Codex 텍스트/이미지 작업 확인
- [ ] 다른 출처·만료·재생 공격 재현
- [ ] 설치 실패 후 구버전 폴더 롤백 확인
- [ ] 정적 Vercel Preview에서 링크·OG·Analytics 동작 확인

**현재 목록의 실제 Windows 환경 항목은 미검증입니다.** 자동 테스트 결과만으로 완료 처리하지 않습니다.

## 5. 실패 진단

- 브리지가 응답하지 않으면 `%LOCALAPPDATA%\DramaForgeConnector\logs\stderr.log`를 확인하세요.
- Windows 설치 실패는 `%TEMP%\DramaForge-Setup.log`에 기록됩니다.
- `/health` 정상인데 웹페이지가 연결되지 않으면 앱 열기 프로토콜 요청, Origin 권한, 로컬 네트워크 권한을 점검합니다.
- 구버전 앱이 포트를 계속 사용한다면 확인되지 않은 다른 프로그램을 강제 종료하지 말고 설치를 중단하도록 했습니다.

## 6. macOS 및 Linux

Windows의 NodeCanvas 네이티브 참조 방식은 그대로 macOS/Linux의 자동 실행을 증명하지 않습니다. 이번 버전은 Windows C# 네이티브 설치 소스만 제공하고, 호환되지 않는 구버전 Unix 설치 파일을 공식 다운로드에서 제거합니다. 향후 플랫폼별 서명된 실행 앱 또는 동등한 프로토콜 런처가 필요합니다.
