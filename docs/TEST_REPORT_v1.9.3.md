# DramaForge v1.9.3 — Windows 빌드 차단 복구 테스트

## 확인한 원인
- GitHub Actions run 42034536555 (2026-11-05): Windows `build` job의 `Run regression tests`에서 164개 중 1개 실패.
- 실패 테스트: `tests/connector-release.test.mjs`의 `wrong original image-only installer is not distributed in DramaForge public assets`.
- 실제 GitHub `web/downloads/NodeCanvas-Setup-v1.13.0.exe` 존재. 소스 ZIP을 기존 체크아웃에 복사해도 추적된 기존 파일은 자동 삭제되지 않음.
- `Build installer`, `Verify compiled Windows PE`, `upload-artifact`, `publish`가 실행되지 않음.

## 이번에 검증한 항목
- `npm test`: 167/167 통과 (기존 164 + 신규 3).
- `npm run check`: 통과.
- `npm run build`: 통과.
- GitHub와 동일하게 구형 NodeCanvas EXE를 `web/downloads`에 복사한 상태에서도 정적 빌드 결과에 구형 EXE가 포함되지 않음.
- `node scripts/prepare-windows-installer-build.mjs`가 지정된 구형 EXE만 제거하고 기타 파일을 보존함.
- 같은 명령을 재실행해도 안전하게 완료됨.
- Windows 빌드 워크플로: 테스트 전에 정리, 게시 커밋에 구형 EXE 삭제 포함.

## NOT TESTED
- GitHub Actions Windows EXE 실제 컴파일 및 설치 파일 추출(원격 재실행 필요).
- 배포된 Windows EXE 실행, 프로토콜 호출, Codex 실계정 로그인 및 대본·샷 생성.
- Actions 게시 후 Vercel 운영 사이트에서 EXE 다운로드.

위 미검증 항목은 완료라고 주장하지 않습니다.
