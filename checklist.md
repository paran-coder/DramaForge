# DramaForge v1.9.3 체크리스트
- [x] NodeCanvas 원본 설치·런처 코드와 v1.9.1 비교
- [x] NodeCanvas 기반 C# 설치/런처 v1.9.3로 갱신
- [x] GitHub Windows 빌드/PE 확인/아티팩트 다운로드/자동 커밋 워크플로 구현
- [x] Vercel 정적 빌드와 Windows 설치 EXE 컴파일 분리
- [x] 기존 웹앱 설치 버튼 비활성 상태와 다운로드 경로 확인
- [x] 기존 자동 테스트·정적 빌드 통과(164/164)
- [x] GitHub Desktop 업로드용 배포 설명서·사용자 안내 작성
- [ ] GitHub Actions의 실제 Windows EXE 빌드 성공 확인
- [ ] 실제 EXE 해시·서명·내장 자료 추출 확인
- [ ] Windows 설치·앱 실행·ChatGPT Codex 로그인·텍스트/이미지 생성 실기기 검사
- [ ] Vercel 운영 주소의 실제 설치 파일 다운로드 검증

## v1.9.3 빌드 차단 복구
- [x] GitHub Actions 실패 원인 확인 (164개 중 25번 테스트 실패)
- [x] Windows runner에서 기존 NodeCanvas EXE 정리 후 테스트 실행
- [x] 게시 커밋에 기존 EXE 삭제 및 새 DramaForge 설치 EXE 동시 반영
- [x] Vercel 빌드가 이전 NodeCanvas EXE를 배포하지 않도록 추가 보호
- [ ] GitHub Windows Actions 실제 재실행 성공 검증
- [ ] 생성된 DramaForge 설치 EXE Windows 실기기 검증
