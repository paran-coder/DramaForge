# DramaForge v1.8.1 context-notes
- 승인 범위: NodeCanvas 연결 기능 **직접 이식**; 무의미한 독립 재구현 중단
- 기준: NodeCanvas v1.13.0 원본 ZIP, 기존 DramaForge v1.8.0
- 보존: 데이터/정설/시나리오 UI, 로컬 저장, 승인 규칙, 원격 전송 정책
- 포팅: Native C# installer + launcher + uninstaller, 연결 챌린지 해시 호환
- 미검증: Windows C# 컴파일, 실계정 로그인, Vercel 새 배포
- 보안: NodeCanvas 원본 사용 흐름은 유지하되 origin은 공식 DramaForge+로컬개발로 제한
