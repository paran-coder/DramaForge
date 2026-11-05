# DramaForge v1.7.3 로컬 연결 진단

## 재현된 현상
AI 연결 팝업에 `로컬 연결 프로그램이 응답하지 않습니다`가 표시됩니다. 이것만으로 PC의 설치 원인을 판정할 수는 없습니다.

## 판별 절차
1. 브라우저 주소창에서 `http://127.0.0.1:7331/health`를 직접 엽니다. JSON의 `ok:true`가 보이면 프로세스는 실행 중입니다.
2. 페이지가 열리지 않는 Windows 사용자는 `DramaForge-Repair-Windows.cmd`를 직접 실행합니다. 기존 `%LOCALAPPDATA%/Programs/DramaForgeConnector/launch.ps1`을 확인하고 **한 번만** 재시작을 시도합니다.
3. 복구 도구는 `%TEMP%/DramaForge-Connection-Check.txt`에 요약 결과를 저장합니다. 원고나 프로젝트 파일을 읽지 않습니다.
4. `/health` 성공인데 웹앱 연결이 실패하면 브라우저의 해당 사이트에 대한 Local Network/Loopback Network 접근 허용 여부, `Origin` 허용 목록, CSP 및 방화벽을 확인합니다.
5. 브리지 연결 완료 후에도 로그인 문제라면 `Codex 실행 확인`과 로그인 RPC를 점검합니다. 로그인 정보/토큰은 진단 파일에 포함시키지 않습니다.

## 제한
- 이 복구 파일은 Windows 전용입니다. 설치된 프로그램만 다시 실행합니다. 최초 설치를 대신하지 않습니다.
- 실행 전 다운로드 파일과 공식 배포 출처를 확인합니다. 사용자 동의 없는 자동 실행은 하지 않습니다.
- 기존 `v1.7.2` 브리지와 호환되도록 유지했습니다.
- Windows 실기기, 브라우저 Local Network Permission, 실제 Codex 인증은 미검증입니다.
- 복구 로그를 공유하기 전 사용자 이름, 로컬 경로, 토큰 등의 비공개 정보가 있는지 확인합니다.
