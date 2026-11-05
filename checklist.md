# DramaForge v1.8.2 개발 체크리스트

- [x] 원본 NodeCanvas v1.13.0 실행 파일을 변경 없이 복사하고 SHA-256 확인
- [x] 원본 소스 ZIP과 코드 보관
- [x] 브라우저에서 원본 프로토콜(`nodecanvas://connect`) 사용
- [x] 로컬 포트 7330, NodeCanvas 인증 API 계약 유지
- [x] 설치 링크를 원본 EXE로 수정
- [x] Vercel 프로덕션에서 Windows 바이너리 빌드 요구 제거
- [x] 앱 UI/매뉴얼에서 실제 지원 범위 명시
- [x] NodeCanvas 원본 서버에 연결하는 통합 테스트 추가
- [x] 기존 회귀 테스트 포함 155개 통과
- [x] `VERCEL_ENV=production npm run build` 통과 및 dist EXE 무결성 확인
- [ ] 사용자 PC에서 원본 EXE 설치·Windows 승인창·Codex 실제 로그인·이미지 생성 테스트
- [ ] GitHub 작업 브랜치/Preview 확인 후 운영 배포
- [ ] 샷·대본 텍스트 생성용 별도 호환 확장 검토(원본 NodeCanvas API에는 없음)
