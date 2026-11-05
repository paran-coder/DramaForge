# NodeCanvas v1.13.0 → DramaForge v1.9.3 비교

## 원본 출처
- `vendor/nodecanvas-v1.13.0/installer/2026-10-31-Connector.cs`
- `vendor/nodecanvas-v1.13.0/installer/2026-10-31-Uninstall.cs`
- `vendor/nodecanvas-v1.13.0/2026-10-31-build-installer.ps1`
- `vendor/nodecanvas-v1.13.0/connector/2026-10-31-codex.mjs`

## 유지한 핵심 구조
- Windows Forms 기반 1회 설치, per-user HKCU 프로토콜 등록, 메시지 확인창
- `SHA-256` 고정 해시 검증, 파일 목록 매니페스트, 원자적 설치 및 롤백
- 설치 후 런처가 Node 프로세스를 시작하고 `codex app-server --stdio`를 사용
- 브라우저에 비밀 연결코드 입력 없이 일회용 challenge를 로컬에서 승인
- 설치 프로그램 자체에는 Node/Codex 전체 바이너리를 묶지 않고 공식 릴리스에서 해시 검증 후 받음

## DramaForge 전용 변경
- 프로그램·설치 폴더·레지스트리 등록: `NodeCanvas` → `DramaForge`
- URL 프로토콜: `nodecanvas://connect` → `dramaforge://connect`
- 로컬 포트: `7330` → `7331`
- 허용 웹 출처: `https://dramaforge-lemon-ten.vercel.app`
- Codex 이미지 실행에 더해 대본·샷·정설·검토 텍스트 작업 API 추가
- 사용자 화면은 NodeCanvas라는 구현 출처를 노출하지 않음
- 컴파일 과정은 `installer/build-windows.ps1`에서 NodeCanvas 방식의 C# 네이티브 실행 파일 제작을 유지

## 배포 개선
- Windows GitHub Actions에서 실제 설치 EXE를 빌드하고 `--self-test`, `--extract-only` 검사 수행
- 빌드 성공 시 `web/downloads/DramaForge-Setup-Windows.exe` 파일을 GitHub Actions 아티팩트로 제공하고 원격 저장소에 자동 커밋 시도
- Vercel은 정적 웹앱만 빌드. EXE가 없을 때 설치가 완료됐다고 표시하지 않음

## 검증되지 않은 범위
- Windows 빌드/실행, SmartScreen, ChatGPT 실계정 인증, 실제 비디오 제작/AI 샷 생성.
