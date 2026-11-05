# DramaForge v1.9.0
NodeCanvas v1.13.0의 Codex 연결 구현을 기반으로 DramaForge의 대본·샷·기획 분석을 확장합니다.
운영 배포 전 Windows 네이티브 설치 EXE를 별도 빌드해야 합니다. 기존 NodeCanvas 바이너리는 텍스트 작업을 지원하지 않습니다.

## 개발
- `npm test`
- `npm run build`
- Windows GitHub Actions의 네이티브 연결 앱 빌드 후 생성된 EXE를 `web/downloads/DramaForge-Setup-Windows.exe`에 배치
- `npm run build`는 실제 EXE가 없다면 일반 정적 웹페이지를 빌드하지만, 설치 버튼은 비활성 안내를 표시합니다.

## 배포 조건
- Vercel 웹앱은 Windows EXE 없이도 정적으로 빌드되지만, 이 경우 첫 설치 버튼에는 설치 파일 미배포 오류가 표시됩니다. **웹앱 배포 통과는 PC 연결 성공과 다릅니다.**
- GitHub Actions `Build DramaForge NodeCanvas-based connector v1.9.0`을 Windows 러너에서 실행하고 `DramaForge-Setup-Windows.exe` 아티팩트를 받습니다.
- 실제 EXE를 `web/downloads/DramaForge-Setup-Windows.exe`에 배치하고 Preview로 재배포합니다.
- Windows에서 설치 → `dramaforge://connect` → 공식 ChatGPT 로그인 → 대본/샷 텍스트 → 스토리보드 이미지 순서로 검증 후 공개합니다.
- 설치 EXE는 이 Linux 작업 환경에서 빌드되지 않았습니다. **이 ZIP에 완성된 신규 EXE는 없습니다.**

자세한 변경·검증 사항은 `docs/NODECANVAS_TEXT_EXTENSION.md`, `docs/TEST_REPORT_v1.9.0.md`를 확인하세요.
