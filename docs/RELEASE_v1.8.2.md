# DramaForge v1.8.2 수정 요약

## 변경 이유

v1.8.1에서 Windows용 DramaForge EXE가 존재하지 않아 Vercel `npm run build`가 `Blocked production deployment` 오류로 실패했습니다. 사용자 요청대로 이미 동작한 NodeCanvas 연결 프로그램 파일을 바이트 그대로 사용하도록 변경했습니다.

## 변경한 파일

- `web/downloads/NodeCanvas-Setup-v1.13.0.exe`: 제공된 NodeCanvas 원본 EXE 복사, SHA-256 동일
- `vendor/NodeCanvas-v1.13.0-original.zip` 및 `vendor/nodecanvas-v1.13.0/`: 원본 패키지·소스 보존
- `web/nodecanvas-native-client.mjs`: 원본 NodeCanvas 서버를 사용하는 최소 웹 어댑터
- `web/main.mjs`: 어댑터 적용, 다운로드/상태/PC 진단 주소 수정
- `web/index.html`, `web/guide.html`: 원본 NodeCanvas 설치·승인 절차 안내
- `scripts/build.mjs`: 컴파일 요구 대신 원본 EXE 무결성 검증
- `vercel.json`: 원본 서비스의 loopback 7330 허용
- 테스트 및 문서 갱신

## 이 버전에서 바꾸지 않은 것

NodeCanvas 원본 설치 바이너리, 원본 프로토콜·포트·원본 승인 코드, DramaForge의 정설/대본/회차 데이터 관리.

## 남은 제약

원본 NodeCanvas 서버는 이미지 생성/편집만 지원합니다. DramaForge 텍스트 AI 연동까지 모두 해결했다고 주장하지 않습니다.
