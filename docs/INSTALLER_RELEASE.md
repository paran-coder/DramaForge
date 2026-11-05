# DramaForge v1.9.3 · NodeCanvas 방식 Windows 연결 앱 설치·배포

## 목표
- NodeCanvas v1.13.0 원본에서 확인된 **네이티브 Windows C# 설치/런처, 일회용 승인값, Codex app-server 실행** 방식을 DramaForge 전용으로 유지합니다.
- DramaForge 독립 프로토콜: `dramaforge://connect` / 연결 서버: `127.0.0.1:7331` / 내 컴퓨터 설치 경로: `%LOCALAPPDATA%\Programs\DramaForgeConnector`.
- 작품·대본·정설 데이터는 Vercel 서버에 저장하지 않습니다. 로컬 Codex 요청의 AI 입력은 OpenAI 서비스로 전송됩니다.
- **Windows용 실행 파일은 GitHub Actions의 Windows 실행 환경에서 실제 컴파일**합니다. Vercel에서 C# 설치 프로그램을 빌드하지 않습니다.

## GitHub Desktop 적용 순서
1. 이 ZIP을 **GitHub 저장소 루트에 펼칩니다**. 최상위에 `package.json`, `web/`, `bridge/`, `installer/`, `.github/`가 있어야 합니다. `DramaForge-v1.9.3/` 폴더가 한 단계 더 만들어지면 안 됩니다.
2. GitHub Desktop에서 변경 사항을 확인한 뒤 `main`에 커밋 및 푸시합니다. 기존 프로젝트를 덮어쓰는 변경이므로 작업 백업을 유지하십시오.
3. GitHub 저장소의 **Actions → Build and publish DramaForge Windows connector**에서 Windows 빌드 실행 결과를 확인합니다. `push(main)`에서 빌드가 자동 시작되도록 구성되어 있으며, 필요 시 `Run workflow`를 직접 누를 수 있습니다.
4. Windows 빌드가 성공하면 `DramaForge-Setup-Windows-v1.9.3-unsigned`라는 아티팩트가 생성됩니다.
5. 다음 `publish` 작업이 빌드 아티팩트를 내려받아 **`web/downloads/DramaForge-Setup-Windows.exe`에 커밋하고 푸시합니다**. 이 커밋이 Vercel로 배포됐는지 확인합니다.
6. `https://dramaforge-lemon-ten.vercel.app/downloads/DramaForge-Setup-Windows.exe`가 실제 200/바이너리 파일로 제공될 때 설치 버튼이 활성화됩니다. 완료 전에는 설치 버튼을 사용 가능한 것처럼 표시하지 않습니다.
7. 사용자는 설치 EXE를 1회 실행한 뒤 DramaForge에서 **PC 연결 앱 열기**를 선택합니다. 최초 앱 열기 및 웹 출처 승인은 Windows에서 사용자가 확인합니다.
8. 연결 후 `ChatGPT 로그인`에서 공식 Codex 로그인 흐름을 진행합니다.

## 자동 커밋이 실패할 때
- GitHub 저장소의 **Settings → Actions → General → Workflow permissions**에서 `Read and write permissions`가 허용돼야 Actions가 EXE를 자동 커밋할 수 있습니다. 브랜치 보호 정책으로 막힐 수도 있습니다.
- 자동 커밋에 실패하더라도 Actions `build` 작업에서 나온 아티팩트 ZIP을 다운로드한 뒤 EXE를 `web/downloads/DramaForge-Setup-Windows.exe`에 넣고 **GitHub Desktop으로 커밋/푸시**할 수 있습니다.
- 파일은 NodeCanvas 원본처럼 작은 설치 부트스트랩 EXE이고, 처음 설치할 때 검증된 Node.js·Codex 구성요소를 공식 배포처에서 다운로드합니다. **EXE 안에 Node.js와 Codex 바이너리 전체가 들어 있지는 않습니다.**

## 검증 기준
- `npm run check`와 `npm run build`: Node/웹 소스의 테스트. Windows 네이티브 설치 성공을 보장하지 않습니다.
- GitHub Windows Actions: C# 런처와 설치 EXE 실제 컴파일, `--self-test`, PE 헤더 및 실행 파일 형식 검사, 내장 설치 자료 추출 확인. 여기서 PE 서명이란 MZ/PE 형식 확인이며 **코드 서명 인증서에 의한 디지털 서명은 아닙니다**.
- Windows 실기기: 설치 → 로컬 앱 실행 → `http://127.0.0.1:7331/health` JSON 확인 → 웹 출처 승인 → ChatGPT 로그인 → 대본/샷 JSON 생성 → 스토리보드 이미지 생성까지 직접 검증해야 합니다.

## 보안 및 배포 주의
- 설치 EXE는 현재 **디지털 코드 서명되지 않았습니다**. Windows SmartScreen이 경고할 수 있습니다. 검증하지 않은 바이너리를 사용자에게 안전하다고 주장하지 않습니다.
- `nodecanvas://`가 아닌 `dramaforge://`를 사용하며, NodeCanvas 로컬 서버 포트 7330을 사용하지 않습니다.
- 웹사이트 사용자에게 NodeCanvas 내부 구현 문구를 노출하지 않습니다.
- 빌드 결과의 해시(SHA-256)는 Actions 로그에서 확인하여 출시 기록에 보존합니다.
