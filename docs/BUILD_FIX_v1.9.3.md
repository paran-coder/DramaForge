# DramaForge v1.9.3 — Windows 빌드 실패 원인 및 수정

## 확인된 실제 오류
- GitHub Actions: https://github.com/paran-coder/DramaForge/actions/runs/42034536555
- Windows build job `Run regression tests` 단계 실패
- `tests/connector-release.test.mjs:18-19`: 구형 `web/downloads/NodeCanvas-Setup-v1.13.0.exe`가 존재해 예상값 `false` 대신 `true`
- 결과: Windows EXE 빌드·PE 검증·아티팩트 업로드·publish 전부 건너뜀

## 수정
1. `scripts/prepare-windows-installer-build.mjs`: 레거시 파일 한 개만 제거
2. Windows GitHub Actions에서 위 정리 작업을 테스트보다 먼저 실행
3. publish job에서 `git rm --ignore-unmatch`로 구형 EXE 삭제와 신형 EXE 게시를 함께 커밋
4. `scripts/build.mjs`: 레거시 EXE가 남더라도 Vercel 정적 산출물에서는 제외
5. 테스트: 파일 정리 idempotency, 무관 파일 보존, Windows workflow 단계 순서, 배포 제외 정책 검증

## 적용
GitHub Desktop에서 새 파일·변경 파일을 `paran-coder/DramaForge` 저장소에 복사해 main에 커밋/푸시합니다. `.github/workflows/windows-installer.yml`이 변경되므로 Windows workflow가 자동 시작됩니다.

**완료 판정은 2개의 GitHub Actions 작업(build/publish) 모두 성공 + `web/downloads/DramaForge-Setup-Windows.exe`가 실제 게시됨 + Windows 실기기 설치·인증 테스트 이후**입니다. 로컬 자동 테스트로 실제 Windows EXE 작동을 주장할 수 없습니다.

참고: 기존 NodeCanvas 원본 파일은 별도로 보존할 수 있지만 DramaForge 웹 다운로드 경로에는 배치하지 않습니다.
