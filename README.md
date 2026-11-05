# DramaForge v1.9.3

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

## v1.9.3 Windows 설치 파일 빌드 오류 수정
GitHub Actions의 [실패한 작업](https://github.com/paran-coder/DramaForge/actions/runs/42034536555)은 원본 NodeCanvas EXE가 이전 커밋에 남아 `tests/connector-release.test.mjs`에서 실패한 것이 원인입니다. 이 수정본은 테스트 전에 정확히 그 이전 파일만 정리하고, Windows EXE 컴파일·검증이 성공하면 기존 파일 삭제와 새 설치 파일 게시를 하나의 커밋으로 처리합니다. **아직 Windows EXE가 빌드됐다는 뜻은 아닙니다.**

GitHub Desktop으로 이 소스를 덮어쓴 뒤 `.github/workflows/windows-installer.yml` 변경을 `main`에 푸시하면 Windows 빌드가 트리거됩니다. Actions의 `build`와 `publish` 두 작업이 통과했는지 확인하세요. 실패 시 해당 로그를 확인해야 하며, 웹에 설치 버튼이 비활성이라면 실행 파일이 아직 배포되지 않은 것입니다.
