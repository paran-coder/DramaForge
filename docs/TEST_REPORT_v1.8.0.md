# DramaForge v1.8.0 — 테스트 보고서

| 검증 | 결과 | 범위 및 제한 |
|---|---|---|
| `npm run check` | PASS | 기존 제작 기능 및 새 네이티브 연결 코드 Node 테스트 147개 통과 |
| `npm run build` | PASS | Vercel용 정적 `dist/` 생성 |
| `tests/browser-native-static.py` | PASS | Chromium에서 1280px/390px 연결 팝업 정적 UI 검증 |
| 네이티브 승인 테스트 | PASS | 확인값 해시·1회성·120초 만료·Origin 차단·파일 소비·AI 모의 실행 |
| 실제 라이브 URL 브라우저 검증 | NOT TESTED | 실행 환경에서 `ERR_BLOCKED_BY_ADMINISTRATOR` 발생 |
| Windows C# 컴파일·서명 | NOT TESTED | 현 환경에는 Windows C# 컴파일러 없음 |
| 실기기 EXE 설치/프로토콜 등록 | NOT TESTED | Windows PC에서 검증 필요 |
| 실제 ChatGPT 계정 로그인 및 영상/이미지 | NOT TESTED | 사용자 로컬 Codex 인증 필요 |
| Vercel Preview/운영 배포 | NOT TESTED | GitHub 업로드 및 Preview 테스트 필요 |

**통과 숫자가 네이티브 설치의 실사용 성공을 뜻하지는 않습니다.** 운영 배포를 위해서는 Windows 빌드 아티팩트 확인, 서명과 설치 검증, 사용자 PC에서 `dramaforge://connect` 실행 및 실제 Codex 로그인 테스트가 선행되어야 합니다.
