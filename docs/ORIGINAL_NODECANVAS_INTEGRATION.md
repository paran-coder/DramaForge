# NodeCanvas v1.13.0 원본 직접 연결 — 구현·배포 문서

## 이번 버전에서 변경하지 않은 것

원본 EXE 바이트, 이름의 NodeCanvas 식별, `nodecanvas://connect`, Windows 레지스트리의 NodeCanvas 실행 등록, 포트 7330, SHA-256 챌린지, 웹 주소 승인 팝업, Codex app-server 로그인의 원본 계약을 그대로 사용합니다. 원본 EXE 내부 코드는 다시 컴파일하지 않습니다.

설치 파일은 `vendor/NodeCanvas-v1.13.0-original.zip`의 `web/2026-10-31-NodeCanvas-Setup-v1.13.0.exe`와 SHA-256이 같습니다.

## DramaForge에서 실제 변경된 것

- `web/nodecanvas-native-client.mjs`는 NodeCanvas 원본 API에 맞춘 **브라우저 어댑터**입니다.
- `web/main.mjs`: 기본 BridgeClient import를 위 어댑터로 교체, 다운로드 링크를 원본 EXE로 변경, 상태를 NodeCanvas로 표시
- `web/index.html`, `web/guide.html`: 설치 안내와 프로토콜, 텍스트 AI 미지원 고지
- `vercel.json`: 기존 localhost 7331이 아닌 NodeCanvas 로컬 7330만 네트워크 연결 허용
- `scripts/build.mjs`: Vercel Linux에서 Windows 설치 EXE 빌드를 요구하지 않고 첨부 원본의 해시를 검사
- 기존 `bridge/`, `installer/`, `web/bridge-client.mjs`는 이전 시도 소스이며 새 배포의 기본 경로에서 사용하지 않음

## 보안 계약

1. 사용자 의사 없이 설치 또는 실행하지 않음. Windows가 처리하는 사용자 지정 URL 프로토콜 클릭을 사용자 이벤트에서 실행
2. 무작위 secret의 SHA-256만 URI에 전달. 비밀값은 웹앱 내부에 유지
3. NodeCanvas 승인 창에서 웹 주소를 확인하고 허용한 뒤 `/api/claim`으로 1회 사용 토큰 교환
4. 로컬 HTTP는 원본의 Origin 허용 검사/CORS/토큰 검사를 그대로 사용
5. 이미 설치된 NodeCanvas와 공유하므로 앱 이름이 NodeCanvas로 표시되는 것은 정상

## 정확한 기능 범위

원본 `2026-10-31-server.mjs`의 `/api/jobs`는 `kind=generate|edit`, `prompt`, `images`, `ratio`만 받으며 `images` 결과를 돌려줍니다. `/api/status`, `/api/login`은 지원합니다. DramaForge의 `shots|review|canon` 등 텍스트 생성 종류를 처리하는 엔드포인트는 없습니다. 웹은 이러한 종류의 요청을 수신하면 **미지원 오류를 명시적으로 반환**합니다. 지원되는 척해 모의 생성이나 빈 결과를 반환하지 않습니다.

## 수동 Windows 검증 체크리스트

1. 기존 NodeCanvas v1.13.0이 있다면 새 설치를 생략합니다.
2. PC에서 `http://127.0.0.1:7330/api/ready`를 직접 확인합니다(앱 실행 중인 경우만 응답).
3. 배포된 DramaForge에서 `PC 연결 앱 열기` → Windows의 **NodeCanvas 앱 실행** 창 확인
4. 처음 허용하는 주소일 경우 **NodeCanvas · 웹 주소 확인**에서 `https://dramaforge-lemon-ten.vercel.app` 확인 및 승인
5. 사용자 입력 연결코드 없이 연결 상태 변경
6. ChatGPT 로그인 후 실제 이미지 생성
7. 대본 텍스트 생성 버튼은 현재 미지원 메시지를 표시하는지 확인

## 배포

`npm test` → `VERCEL_ENV=production npm run build` 성공 → `dist/downloads/NodeCanvas-Setup-v1.13.0.exe` SHA256 확인 → GitHub Preview → 실제 Windows 테스트 → Production. Vercel은 EXE를 새로 컴파일할 필요가 없습니다.
