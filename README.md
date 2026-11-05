# DramaForge v1.8.0 — NodeCanvas 방식 네이티브 연결

작가의 확정 정설을 보호하면서 대본·회차·인물 지식·복선·인과관계·스토리보드·Seedance 프롬프트를 관리하는 **로컬 우선 웹앱**입니다. 사용자께서 제공한 NodeCanvas v1.13.0 소스의 **네이티브 URL 프로토콜 + 1회용 활성화 확인값 + 사용자 승인** 설계를 DramaForge에 적용했습니다.

## 이 버전에서 바뀐 부분

- **웹 → PC 자동 실행:** `AI 연결` → `PC 연결 앱 열기` → `dramaforge://connect?origin=...&challenge=...` → Windows가 로컬 런처 실행. 기존 `v1.7.x`는 브리지가 먼저 실행되지 않으면 연결할 수 없었습니다.
- **인증 보호:** 웹사이트의 주소(Origin)가 맞다는 이유만으로 토큰을 발급하던 `/api/connect` 제거(HTTP 410). 수동 연결코드 `/api/pair`도 제거. 네이티브 앱에서 웹사이트를 승인하고 1회용 SHA-256 확인값을 전달해야 `/api/claim`으로 세션을 획득할 수 있습니다.
- **Codex 통신:** 기존 `CodexBridgeProvider`의 `app-server --stdio`와 `shots/image/canon/review` 작업 계약 유지. 임의 쉘 실행 작업 금지.
- **Windows 설치:** 네이티브 C# 런처 및 GUI 설치 프로그램의 **소스** 제공. 설치 앱은 검증된 공식 Node.js·Codex 구성요소와 내장된 브리지 파일을 설치하고 `HKCU\Software\Classes\dramaforge` URL 프로토콜을 등록합니다. 설치 시 기존 DramaForge 연결 폴더를 백업하고 실패 시 되돌리는 절차가 있습니다.
- **실행 방식:** 최초 설치는 사용자가 직접 실행·승인해야 합니다. 이후 브라우저에서 버튼을 눌러 PC 연결 앱을 실행하고, 처음에는 연결할 웹사이트 주소를 확인·승인합니다. Windows 시작 시 항상 실행하는 기존 v1.7.x 시작 프로그램 등록은 업데이트 성공 시 해제합니다.
- **기존 작품 기능:** 정설 단독 승인·변경 영향·What-if·회차 인과·인물/관객 지식·Local First 저장 구조는 수정하지 않습니다.

## 직접 실행 (개발)

```bash
node --version    # Node.js 20 이상
npm run check     # 코드 검사 + Node 자동 테스트
npm run build     # 정적 사이트 dist/ 생성
npm run dev       # http://127.0.0.1:4173
```

웹앱 자체는 Codex 연결 없이 대본 편집·정설 관리·백업 등을 사용할 수 있습니다. 브리지 연결을 완전히 시험하려면 Windows **네이티브 실행 파일을 빌드·설치**해야 합니다. 테스트용 모의 브리지 승인 흐름은 `npm test`에 포함되어 있습니다.

## Windows 설치 프로그램 빌드

Windows 환경의 PowerShell에서 저장소 루트 기준으로:

```powershell
./installer/build-windows.ps1
```

성공 시 `web/downloads/DramaForge-Setup-Windows.exe`가 생성됩니다. GitHub Actions의 `Build DramaForge Windows Setup` 작업도 동일한 빌드를 수행하고 **서명되지 않은 산출물**을 아티팩트로 올립니다. 빌드·서명·실제 설치 검증 전에는 이 EXE를 운영에 자동 배포하지 마십시오.

자세한 단계 및 설치·복구 조건: [`docs/INSTALL_NATIVE_v1.8.0.md`](docs/INSTALL_NATIVE_v1.8.0.md).

## 데이터 및 보안 경계

- 대본·정설·프로젝트: 브라우저 IndexedDB 및 사용자가 받은 로컬 ZIP. Vercel은 정적 웹 파일 및 기본 방문 분석만 담당합니다.
- Codex 작업을 클릭하면 사용자가 입력한 요청과 참조 데이터가 PC의 로컬 Codex를 통해 OpenAI로 전송될 수 있습니다.
- 브리지 HTTP 서버는 `127.0.0.1:7331`에서만 실행합니다. NodeCanvas의 포트 7330과 독립적입니다.
- `https://dramaforge-lemon-ten.vercel.app`와 명시된 로컬 개발 주소만 기본 허용합니다. 세션은 Origin에 결박되며 60분 미사용 시 만료됩니다. 활동 중인 세션 저장은 브라우저 세션 저장소에 한합니다.
- **완전 무인 설치는 지원하지 않습니다.** 사용자 PC에서 설치 파일 실행·OS 프로토콜 실행 및 최초 웹주소 승인은 필요합니다.

## 검증 상태

- 자동 테스트 및 정적 빌드: `docs/TEST_REPORT_v1.8.0.md` 참고.
- Chromium 정적 팝업 화면(데스크톱, 모바일): 검사됨.
- **Windows EXE 컴파일, 실제 PC 네이티브 등록·자동 실행, Codex 로그인 및 이미지 생성, Vercel 배포: 미검증.** 현재는 코드로 구현한 **출시 전 개발 후보**입니다.
- macOS/Linux 네이티브 프로토콜 런처는 이번 버전의 제공 범위가 아닙니다. 기존 1.7.x의 Unix 설치 스크립트는 새로운 인증 체계와 호환되지 않아 공개 다운로드에서 제외했습니다.
