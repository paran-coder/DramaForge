# DramaForge v1.9.1 연결 오류 수정

## 확인된 원인

웹사이트에서는 `/downloads/DramaForge-Setup-Windows.exe`를 요청하지만, v1.9.0의 공개 디렉터리에는 Windows에서 빌드된 DramaForge 전용 EXE가 없었습니다. 기존 NodeCanvas 원본 EXE는 새로운 `dramaforge://` 프로토콜과 텍스트 작업을 제공하지 않습니다. 이 상태에서는 연결 화면의 반복 클릭으로 문제가 해결되지 않습니다.

## 이번 수정

- 연결창과 사용자 도움말에서 NodeCanvas 및 내부 개발 설명 제거.
- Windows 설치 파일이 서버에 없는 경우 설치 버튼 비활성화 및 명시적인 안내.
- 승인되기 전 ChatGPT 로그인 버튼 비활성화.
- NodeCanvas 참조 실행 파일과 호환 클라이언트를 `vendor/` 내부로 이동해 웹 배포물에서 제외.
- Windows installer v1.9.1 버전 및 복구/업데이트 비교 문제 해결.
- GitHub CI에서 존재하지 않는 옛 ZIP 파일 검사 제거.
- 승인 챌린지, Codex 실행 경로, 기존 정설/대본/로컬 저장 기능 변경 없음.

## 필수 빌드 및 배포 순서

1. 소스를 `paran-coder/DramaForge`의 작업 브랜치에 반영합니다.
2. GitHub Actions의 Windows installer workflow를 실행합니다.
3. `DramaForge-Setup-Windows-v1.9.1-unsigned` 아티팩트를 다운받아 압축 해제합니다.
4. 실제 EXE를 `web/downloads/DramaForge-Setup-Windows.exe`로 추가합니다. 파일이 없으면 Vercel 웹사이트는 표시되지만 설치 버튼은 비활성화됩니다.
5. Vercel Preview에 배포한 뒤 Windows 사용자 PC에서 설치 → `dramaforge://connect` → 웹주소 승인 → ChatGPT 로그인 → 샷/이미지 생성까지 실제로 확인합니다.
6. 프로덕션에는 설치 프로그램의 디지털 서명과 SmartScreen 평판을 검토한 다음 배포합니다.

## 검증 제한

실제 Windows EXE를 이 Linux 실행 환경에서 빌드/실행하지 않았습니다. GitHub 연결 계정으로 작업 브랜치를 생성하려는 요청은 권한 거절(403)되어 저장소에 게시하지 않았습니다. 자동 테스트 및 정적 빌드만 완료 시 표기합니다.
