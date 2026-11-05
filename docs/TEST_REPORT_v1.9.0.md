# DramaForge v1.9.0 테스트 보고서

## 자동 검증 (PASS)
- `npm run check`: Node.js 자동 테스트 158 / 158 PASS
- `npm run build`: 정적 Vercel 빌드 PASS
- NodeCanvas 원본 EXE 체크섬 검증, 기존 승인/정설/백업/브라우저 화면 구조 테스트: PASS
- 신규 테스트: 텍스트 작업 allowlist, 28,000자 제한, 결과가 agentMessage인지 확인, 승인 없는 쉘 요청 차단, 가짜 Codex app-server 이벤트를 통한 JSON 샷 응답, 네이티브 인증 → 텍스트/이미지 요청: PASS
- Vercel CSP 로컬 브리지 `:7331`: PASS

## 실기기 검증 (NOT TESTED)
- Windows 전용 C# 컴파일 및 신규 서명되지 않은 EXE 생성
- 실제 NodeCanvas/DramaForge 동시 설치 및 별도 포트 구동
- 사용자 PC의 Windows 프로토콜 확인창
- ChatGPT Codex 실계정 로그인 및 대본/샷/이미지 생성
- Vercel Preview 및 운영 사이트 실제 기능

## 결과 해석
코드·모의 프로토콜 테스트 통과를 실기기 설치 또는 실제 모델 생성 성공으로 오인하지 않습니다.
