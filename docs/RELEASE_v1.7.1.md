# DramaForge v1.7.1 — AI 연결 첫 설치 자동화

## 변경

- `AI 연결`에서 기설치 브리지 자동 탐색, 미설치 시 `연결 도우미 설치 시작` 버튼 제공
- 사용자 PC에서 OS별 설치 도우미를 다운로드하고 사용자 동의 아래 실행, Node.js/Codex 자체 설치·브리지 실행
- Windows 부트스트랩 `.cmd`, macOS/Linux `.sh`, Windows 네이티브 설치 프로그램 빌드 소스 포함
- 설치 후 2초 간격 최대 4분 자동 재연결
- 사용자 설명서 및 보안 안내 수정; 작품·정설 데이터 모델과 Codex API는 유지

## 검증

- `npm run check` **135/135 PASS**
- `npm run build` PASS
- 셸 문법 검사 PASS
- 정적 Chromium UI 1280px·390px PASS (가로 넘침 없음)
- 실사용 설치 Windows/macOS/Linux: **NOT TESTED**
- 네이티브 Windows 설치 프로그램 컴파일·코드 서명: **NOT TESTED**
- Vercel 실제 배포·Codex 계정 인증: **NOT TESTED**

## 배포 전 주의

현재 Windows용 `.cmd`는 서명된 EXE가 아니며, 운영체제별 설치 도우미를 실제 환경에서 확인해야 합니다. Windows EXE는 `.github/workflows/windows-installer.yml`을 이용해 빌드한 뒤 코드 서명·검증하고 `web/downloads/DramaForge-Setup-Windows.exe`로 추가할 수 있습니다. 서버에 별도 프로젝트 데이터를 보내지 않는 기존 정책을 유지합니다.
