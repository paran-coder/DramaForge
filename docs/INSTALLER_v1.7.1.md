# DramaForge v1.7.1 로컬 Codex 설치 도우미

## 요구사항과 실제 제공 범위

웹 브라우저만으로 Node.js/Codex CLI를 침묵 설치하는 것은 보안상 불가능합니다. 이를 억지로 우회하지 않고 **설치 파일을 다운로드한 다음 최초 한 번 실행·승인**하면 구성요소를 자동으로 설치하는 방식으로 구현했습니다.

| 항목 | 구현 방식 | 검증 상태 |
|---|---|---|
| 기설치 브리지 탐색 | 127.0.0.1:7331 연결 | 코드 테스트 |
| 미설치 시 다운로드 | OS 정보 감지 후 설치 파일 다운로드 | 코드 테스트 |
| Windows 구성요소 자동 설치 | 공식 Node.js·Codex ZIP SHA-256 검증, 사용자 폴더 설치, 시작 프로그램 등록 | **Windows 실기기 미검증** |
| macOS/Linux 구성요소 설치 | 공식 Node.js/ npm Codex 설치 및 로그인 자동 실행 설정 | **실기기 미검증** |
| 재연결 | 설치 시작 후 2초마다 최대 4분 연결 탐색 | 코드 테스트 |
| Codex 인증 | 로그인은 사용자 ChatGPT 공식 로그인 필요 | 실계정 미검증 |

## 공개 배포 절차

1. `npm run check`, `npm run build`를 실행합니다.
2. `dist/downloads/DramaForge-Setup-Windows.cmd`, `DramaForge-Setup-Unix.sh`, `DramaForge-Connector-v1.7.1.zip`가 배포 산출물에 포함된 것을 확인합니다.
3. Preview 배포에서 문서와 다운로드 링크의 응답 상태를 점검합니다. 현재 설치 도우미의 코드에는 승인된 `https://dramaforge-lemon-ten.vercel.app` 주소가 고정되어 있으므로 Preview URL에서는 설치 후 연결이 거부될 수 있습니다. 실 사용자 시험은 운영 URL에서만 실시합니다.
4. Windows 10/11 사용자 세션에서 새 계정/기존 계정, 네트워크 실패, 해시 불일치, 재설치, 로그인, 재부팅 후 자동 시작을 확인합니다. macOS 및 Linux도 각각 실기기 점검이 필요합니다.
5. `.cmd`와 `.sh`는 코드 서명된 네이티브 설치 프로그램을 대체하지 않습니다. **일반 공개 서비스 배포 전에 서명된 설치 파일 및 제거 기능을 별도로 구축하는 것이 좋습니다.**

## 데이터 보호

설치 파일은 공식 Node.js 및 Codex 바이너리, 확인 가능한 브리지 패키지만 다운로드합니다. 운영체제별 시작 프로그램은 로컬 루프백 브리지를 실행합니다. 대본 및 승인 정설은 사용자가 Codex 작업을 실행할 때만 OpenAI로 전달되며 Vercel의 사용자 데이터 저장소는 사용하지 않습니다.


## Windows 네이티브 설치 화면 준비

`installer/Setup.cs`와 `installer/build-windows.ps1`을 추가했습니다. Windows GitHub Actions에서 C# 설치 프로그램을 컴파일하여 **unsigned** EXE 파일을 Actions artifact로 제공합니다. 이 결과물을 리뷰·코드 서명한 후 `web/downloads/DramaForge-Setup-Windows.exe`에 추가해 배포하면 브라우저가 해당 EXE를 우선 제공합니다. 실제 Windows 빌드·코드 서명·실행은 이 환경에서 **미검증**입니다. 준비 전에는 `.cmd` 기반 설치 도우미를 사용합니다.
