# DramaForge v1.9.1

사용자에게 보이는 연결 화면에서 다른 제품의 내부 기술 설명을 제거했습니다. 새 Windows 연결 앱을 설치해야 `dramaforge://`가 실행됩니다.

## 현재 배포 상태

- 이 소스에는 새로운 DramaForge Windows 설치 EXE가 **없습니다**.
- 원본 참고 EXE는 `vendor/`에만 보관하며 **웹 배포에서는 다운로드할 수 없습니다**.
- Vercel의 정적 빌드는 가능하지만 EXE를 배포하지 않으면 설치 버튼은 비활성화됩니다.
- 실제 연결을 사용하려면 Windows GitHub Actions에서 빌드된 EXE를 `web/downloads/DramaForge-Setup-Windows.exe`에 배치하고 Vercel에 다시 배포해야 합니다.
- 실제 Windows 설치/프로토콜 승인/로그인/샷 생성은 별도 검증 전에는 완료로 표기하지 않습니다.

## 검증

`npm test` 및 `npm run build`

## 설치 프로그램 빌드 (Windows)

GitHub Actions의 `Build DramaForge NodeCanvas-based connector v1.9.1`을 실행하거나 Windows PowerShell에서 `./installer/build-windows.ps1`을 실행합니다. EXE는 `web/downloads/DramaForge-Setup-Windows.exe`로 생성됩니다.
