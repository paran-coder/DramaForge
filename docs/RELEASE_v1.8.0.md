# DramaForge v1.8.0 — 변경 내역

## 변경 범위
- `bridge/activation.mjs`: NodeCanvas의 SHA-256 확인값 + 1회용 인증 원칙 이식
- `bridge/server.mjs`: `/api/claim`, `/api/presence`, 출처-세션 결박, 페어링 코드/자동 토큰 발급 제거
- `web/bridge-client.mjs`: `dramaforge://connect` 생성, 비밀값 보유, 클레임/세션 복원
- `web/main.mjs`, `web/index.html`, `web/guide.html`: 네이티브 앱 실행 UI, 최초 설치 안내, 로그인 이전 승인 검사
- `installer/ConnectorLauncher.cs`, `installer/Setup.cs`, `installer/build-windows.ps1`, `installer/install-windows.ps1`: 사용자 승인을 거치는 Windows 네이티브 설치·프로토콜 런처
- `.github/workflows/windows-installer.yml`: Windows 빌드/자체 검사 아티팩트 설정

## 보호한 범위
기존 드라마 작품·에피소드·캐릭터 정설·인물/관객 지식·복선·인과관계·스토리보드·Seedance 프롬프트·백업 코드는 수정하지 않았습니다. Vercel 서버에 프로젝트 정보를 저장하는 기능을 추가하지 않았습니다.

## 중요한 한계
이 산출물은 Windows 빌드가 가능한 환경에서 실행 프로그램이 생성되도록 작성한 **소스 수정본**입니다. 이 환경에서는 C# 컴파일러/Windows 런타임이 없어 실제 설치 바이너리를 만들거나 실제 설치·Codex 로그인을 검증하지 못했습니다. 기존 Vercel 운영 버전은 별도 배포 전까지 그대로 유지됩니다.
