# DramaForge v1.8.2 — 원본 NodeCanvas 연결 앱 직접 사용

**이번 버전은 새로운 Windows 연결 프로그램을 만들지 않습니다.** 사용자께서 제공한 NodeCanvas v1.13.0 ZIP에서 이미 컴파일되어 실제로 사용하던 `2026-10-31-NodeCanvas-Setup-v1.13.0.exe`를 **바이트 그대로** `web/downloads/NodeCanvas-Setup-v1.13.0.exe`에 포함했습니다.

- 원본 SHA-256: `2ffa9dfa6232d6435c992dd741c27018316c6a01beb553ecde9c530351a74178`
- Windows 프로토콜: `nodecanvas://connect` (원본 그대로)
- 로컬 주소: `http://127.0.0.1:7330` (원본 그대로)
- API: `/api/claim`, `/api/status`, `/api/login`, `/api/jobs` (원본 계약)
- 승인: 원본 Windows 앱이 최초 웹 주소를 표시하고 사용자의 동의를 받음
- 설치된 NodeCanvas가 있으면 **재설치하지 않고 공유**

## Vercel 빌드 오류 해결

`npm run build`가 `DramaForge-Setup-Windows.exe`를 요구하던 v1.8.1 코드를 제거했습니다. 원본 NodeCanvas EXE의 SHA-256만 확인한 뒤 정적 `dist/`에 포함시킵니다. Linux 기반 Vercel 환경에서 Windows EXE를 새로 컴파일하지 않습니다.

```bash
npm test
VERCEL_ENV=production npm run build
```

## 사용자 작업 순서

1. 웹사이트의 `AI 연결` 클릭.
2. NodeCanvas가 이미 설치되어 있으면 `PC 연결 앱 열기` 클릭. Windows에서 웹 주소 확인창이 나오면 접속 중인 DramaForge 주소를 확인하고 승인.
3. 아직 설치되어 있지 않으면 `NodeCanvas 연결 앱 설치 (원본)`으로 동일한 EXE를 한 번 설치한 뒤 `PC 연결 앱 열기`.
4. `ChatGPT 로그인`으로 공식 로그인.
5. **스토리보드 이미지 생성은 원본 API와 호환됩니다.**

### 중요한 기능 제약

NodeCanvas 원본 v1.13.0의 Codex 연결 서버는 **이미지 생성/편집 API만 지원**합니다. DramaForge의 대본·샷 분석·정설 추출·기획 검토는 **구조화된 텍스트 응답**이 필요하지만 원본에는 해당 API가 없습니다. 따라서 이 버전은 사용자가 요청한 **설치/PC 연결/로그인 구조를 원본 그대로 복구**하고, 기존 드라마 데이터 관리·수동 편집 기능은 유지하며, 텍스트 AI 생성은 지원되지 않는다고 명확히 표시합니다. 텍스트 AI를 지원하려면 원본 설치 파일을 변경하지 않고 별도 확장 기능을 정식 설계해야 합니다.

검증하지 않은 항목: Windows 사용자 PC에서 실설치·시스템 프로토콜 실행·ChatGPT 실계정 로그인·Vercel 실제 배포. Node/Vercel 빌드와 모의 서버 API 통합 검증은 자동 테스트로 확인 가능합니다.

자세한 기술 기록: `docs/ORIGINAL_NODECANVAS_INTEGRATION.md`.
