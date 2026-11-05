# DramaForge v1.9.2

AI 드라마 기획·정설 관리·연속성 검증을 위한 로컬 우선 웹앱과 Codex PC 연결 프로그램.

## 이번 버전
NodeCanvas v1.13.0 원본의 **Windows 네이티브 설치/런처 코드**를 DramaForge 전용으로 사용합니다. `dramaforge://connect`, 포트 `7331`, 작품 데이터 로컬 저장 원칙은 유지합니다. NodeCanvas 설치 프로그램을 웹앱 사용자에게 다운로드시키지 않습니다.

**Windows 설치 EXE는 GitHub Actions의 Windows 빌드에서 자동 생성됩니다.** 최초 소스 ZIP에는 EXE가 없으며, GitHub Desktop으로 GitHub에 푸시하면 Windows Actions가 `web/downloads/DramaForge-Setup-Windows.exe`를 컴파일·검증한 뒤 별도 커밋을 작성하도록 구성되어 있습니다. GitHub에 쓰기 권한이 없으면 Actions 아티팩트를 내려받아 GitHub Desktop으로 수동 커밋할 수 있습니다.

자세한 단계: [설치·배포 설명서](docs/INSTALLER_RELEASE.md).

## 소스 검사

```bash
npm run check
npm run build
```

검증: Node 기반 자동 테스트 164개 및 정적 빌드 통과. **실제 Windows 설치·Codex 로그인은 아직 미검증**입니다.

## GitHub Desktop으로 반영
압축 해제 후 프로젝트 루트에 `web`, `bridge`, `installer`, `.github`, `package.json`이 놓이도록 복사하고 커밋·푸시합니다. 기존 운영 소스의 백업을 권장합니다.
