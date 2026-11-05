# DramaForge v1.6.0 체크리스트

- [x] 네 가지 기능의 신규 서사 기억 원장 구현
- [x] 작가 승인 전 후보는 컨텍스트/검증에서 제외
- [x] 기존 승인본 변경 요청·원본 보존·이력 및 재검토
- [x] 사건 인과관계/순환/극중 시간 순서 검증
- [x] 세계관 진실·인물 믿음·관객 믿음 분리 및 반전 공개 시점
- [x] 극중 시간/시청자 공개/승인 이력을 함께 조회
- [x] 치명/중요/경미 우선순위별 개입 정책 구현
- [x] 새 원고나 사건 수정 시 검토 기록 만료, 샷 승인 보호
- [x] 기존 ZIP 백업 복원과 v1.5.1 디자인 토큰 유지
- [x] 회귀 98 + 신규 22 = 120개 Node 자동 테스트 통과
- [x] 격리 Chromium에서 입력·승인·시점 조회·1440/390px UI 점검
- [x] README / User manual / 개발 매뉴얼 / 테스트 보고서 업데이트
- [ ] 실제 URL 접속·IndexedDB 새로고침 통합 검증
- [ ] 실제 Codex CLI 로그인/프롬프트 실행·Vercel Preview 검증
- [ ] 실사용 작가 피드백 및 숨은 의미상 모순 평가 데이터 확보

## v1.6.1 OG + Vercel Analytics

- [x] 승인된 이미지를 1200×630 PNG로 변환해 `web/og-image.png`로 배치
- [x] HTML OG/Twitter 카드 메타데이터 삽입
- [x] Vercel 배포 환경에서 OG URL 자동 완성 빌드 스크립트 구성
- [x] 정적 HTML용 Vercel Analytics 스크립트 추가, 기존 CSP 유지
- [x] 소스코드 검사 및 회귀 테스트
- [ ] 실제 Vercel Project Web Analytics 활성화 및 통계 수신 확인 (배포 후)
- [ ] 공개 주소에서 SNS 미리보기 테스트 (배포 후)


## v1.6.2 운영 도메인

- [x] 프로덕션 OG/canonical에 확정된 URL 반영
- [x] Preview 환경의 고유 OG 주소 유지
- [ ] 변경 소스 GitHub 반영과 Vercel 재배포
- [ ] 공개 HTML의 OG/Twitter 태그 및 이미지 HTTP 응답 확인
- [ ] Vercel Analytics 활성화와 실제 페이지뷰 발생 검증

## v1.7.1 UI + onboarding + bridge integration
- [x] Two-mode onboarding, with explicit completion and reusable new-project entry
- [x] Multiple text material import without changing approved canon
- [x] Interview mode and free conversation guidance
- [x] How to Use page reachable from UI
- [x] No-code local bridge connection, exact-origin security checks
- [x] First-use helper installation limitation explained
- [x] Bridge distribution updated, no manually typed website origin
- [x] Existing test suite and added regression tests passed (132/132)
- [x] Build and archive verified, no production deployment performed
- [ ] Live browser IndexedDB persistence and actual Codex authentication verified
- [ ] Vercel preview release confirmed


## v1.7.1 최초 연결 개선

- [x] 설치 안내의 수동 ZIP/Node.js/Codex 설치 절차를 사용자 화면에서 제거
- [x] Windows 및 Unix 사용자 영역 설치 도우미 생성, SHA-256 검증
- [x] 설치 파일 다운로드·자동 재연결 기능 구현
- [x] 코드 및 빌드 검사
- [ ] Windows/macOS/Linux 실제 설치·로그인·재부팅 후 자동 실행 테스트
- [ ] Windows/macOS 코드 서명된 네이티브 배포 패키지
- [ ] Vercel 운영 배포·다운로드·로그인 실제 검증
