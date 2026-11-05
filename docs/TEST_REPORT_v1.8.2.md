# DramaForge v1.8.2 테스트 보고서

## PASS — 2026-11-05

- 원본 NodeCanvas v1.13.0 Windows Setup 바이너리 SHA-256 동일: `2ffa9dfa6232d6435c992dd741c27018316c6a01beb553ecde9c530351a74178`
- 원본 실행 파일 크기: 175,616바이트
- 브라우저의 `nodecanvas://connect` + SHA-256 챌린지 계약
- NodeCanvas v1.13.0 원본 `2026-10-31-server.mjs`를 실제 Node.js 프로세스에 로드하여 사용자 승인 → 토큰 발행 → ChatGPT 로그인 요청 → 이미지 생성 작업 처리까지 통합 검증(계정/생성기는 테스트 더블 사용)
- 이전 프로젝트 모델·정설·백업 등 기존 회귀 테스트 포함 **155/155 통과**
- `npm run check` 통과
- `VERCEL_ENV=production npm run build` 성공; `dist/downloads/NodeCanvas-Setup-v1.13.0.exe` SHA256 동일
- OG URL은 운영 도메인 `https://dramaforge-lemon-ten.vercel.app`에 맞게 유지

## NOT TESTED

- 실제 사용자 Windows PC에서 설치 EXE 실행 및 사용자 지정 프로토콜 등록
- 브라우저에서 실제 Windows 앱 실행 확인창 / 웹 주소 확인창 노출
- 실제 Codex ChatGPT 계정 로그인과 이미지 생성
- GitHub 반영 및 Vercel 운영 배포

## UNSUPPORTED BY ORIGINAL

- NodeCanvas v1.13.0 원본 서버는 AI 이미지 생성/편집만 제공. DramaForge의 샷 분석·대본 검토·정설 추출 등 텍스트 AI 작업을 처리하는 API 없음. 이 버전에서는 기능을 성공으로 위장하지 않고 명시적 미지원 오류 표시.

## IMPORTANT

기존 DramaForge 전용 `bridge/`·`installer/` 소스는 역사적 비교를 위해 남았지만 **현재 브라우저의 기본 연결 경로에 쓰이지 않음**. `.github/workflows/windows-installer.yml` 자동 push 실행을 중지했으며 원본 Windows EXE를 새로 빌드하지 않음.
