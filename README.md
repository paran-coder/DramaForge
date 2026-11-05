# DramaForge v1.8.1 — NodeCanvas 원본 연결 이식

이 버전은 **사용자가 제공한 NodeCanvas v1.13.0의 Windows 연결 프로그램 소스**를 기반으로 합니다. 설치기/런처/제거기 로직은 가능한 범위에서 보존하고 `NodeCanvas` → `DramaForge`, `nodecanvas://` → `dramaforge://`, `7330` → `7331`, `connector` 경로 → `bridge` 경로만 조정했습니다. **웹 앱의 정설 및 시나리오 기능은 그대로 유지**합니다.

## 무엇이 달라졌나

- 기존 v1.8.0의 새로 작성된 `Setup.cs`, `ConnectorLauncher.cs`, `install-windows.ps1` 대신 NodeCanvas 원본에서 이식한 `NodeCanvasPort.cs`, `NodeCanvasUninstallPort.cs`를 빌드합니다.
- NodeCanvas와 동일한 **네이티브 URL 프로토콜 → Windows 실행 확인 → 웹사이트 주소 승인 → 일회용 확인값 페어링** 흐름을 유지합니다.
- NodeCanvas의 내장 페이로드, 다운로드 해시 검증, 버전 폴더, 원자적 설치 및 실패 시 복구 구조를 유지합니다.
- 연결 확인값은 원본 NodeCanvas처럼 `SHA256(UTF8(hexSecret))`을 사용하도록 웹과 서버 양쪽을 맞췄습니다.

## 중요한 배포 단계

**현재 소스 ZIP에 Windows EXE는 없습니다.** 이 환경에서 Windows용 C# 바이너리를 빌드할 수 없으므로 설치 준비가 완료된 것처럼 표시하지 않습니다. Windows GitHub Actions 워크플로로 다음을 수행하세요.

1. `.github/workflows/windows-installer.yml`에서 `Build`를 실행하고 통과한 빌드 아티팩트를 내려받습니다.
2. `DramaForge-Setup-Windows.exe`를 `web/downloads/`에 복사하고 ZIP의 내용을 GitHub 작업 브랜치에 반영합니다.
3. Preview에서 설치 링크가 진짜 EXE(`MZ` 헤더)인지 확인하고 Windows 실기기에서 설치→`dramaforge://`→로그인 테스트를 합니다.
4. 검증 후 `main`에 병합하여 Vercel 운영 배포를 진행합니다.

EXE가 배포되지 않은 상태에서는 웹앱에 '설치 파일이 아직 배포되지 않았습니다'라고 표시됩니다. 임의의 ZIP이나 CMD로 대체하지 않습니다.

## 검증 범위

`npm test` 와 `npm run build` 는 코드 계약을 검증합니다. Windows EXE 실행/서명/사용자 Codex 로그인 검증은 Windows에서 별도로 해야 합니다.

기존 문서와 데이터 모델은 그대로 유지됩니다.
