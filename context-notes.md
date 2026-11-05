# DramaForge v1.9.2 · Context
- 사용자는 NodeCanvas v1.13.0의 작동하던 Windows 네이티브 설치·프로토콜·인증 구조를 차용하고 GitHub Desktop으로 직접 푸시할 예정입니다.
- 기존 DramaForge v1.9.1 웹/정설/샷 기능을 보호하면서 설치 파일 빌드와 GitHub→Vercel 배포 연결만 수정합니다.
- 포트 `7331`, `dramaforge://connect`, 설치 폴더 `%LOCALAPPDATA%\Programs\DramaForgeConnector`, 정식 URL `https://dramaforge-lemon-ten.vercel.app`.
- Windows Actions는 `installer/NodeCanvasPort.cs` 및 `NodeCanvasUninstallPort.cs`를 `csc.exe`로 컴파일하고 파일 해시/내장 자료를 점검합니다.
- GitHub Actions는 Windows EXE 생성 후 repository `web/downloads`에 추가 커밋; 실패하면 Artifacts에서 파일 내려받아 GitHub Desktop으로 수동 커밋 가능합니다.
- Vercel은 정적 웹앱만 빌드하며, EXE 없을 때 사용 가능하다고 표시하지 않습니다.
- 실제 Windows 실행과 실계정 Codex 인증은 아직 검증 불가로 분리합니다.
