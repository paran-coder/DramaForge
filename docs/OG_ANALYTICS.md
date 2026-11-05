# DramaForge v1.6.2 — OG 이미지 및 Vercel Web Analytics

## 1. 구현 파일

| 파일 | 역할 |
|---|---|
| `web/og-image.png` | 승인된 제품 홍보 이미지, 1200×630 PNG |
| `web/index.html` | Open Graph · Twitter/X 카드, 사이트 설명, Analytics 스크립트 참조 |
| `web/analytics-init.js` | Vercel Analytics 큐 초기화 (별도 JS로 CSP의 inline script 제한 유지) |
| `scripts/build.mjs` | 배포 URL에서 절대 OG 이미지 주소 및 canonical URL 생성 |
| `vercel.json` | 정적 빌드 결과물 `dist/`을 배포 |
| `tests/social-metadata.test.mjs` | 메타데이터·이미지·배포 URL 생성·보안 정책 검증 |

## 2. 배포 준비

```bash
npm run check
npm run build
```

Vercel에 GitHub 프로젝트를 연결할 때는 **Framework Preset: Other**를 사용합니다. 저장소 루트는 이 프로젝트의 `package.json` 및 `vercel.json`이 있는 폴더여야 합니다. Vercel이 `npm run build`를 실행해 `dist/`를 배포하도록 설정했습니다.

운영 도메인이 확정되었습니다: **https://dramaforge-lemon-ten.vercel.app/**.

운영 배포 시 `VERCEL_ENV=production`이면 자동으로 다음 주소를 메타데이터에 사용합니다.

- `og:url`, `canonical`: `https://dramaforge-lemon-ten.vercel.app/`
- `og:image`, `twitter:image`: `https://dramaforge-lemon-ten.vercel.app/og-image.png`

프리뷰 배포에서는 여전히 고유 `VERCEL_URL`을 사용합니다. 나중에 커스텀 도메인이 생기면 Vercel 프로젝트의 **Production** 환경 변수 `PUBLIC_SITE_URL`로 덮어쓸 수 있습니다. 공통 환경 변수로 지정하면 프리뷰 미리보기에도 운영 도메인이 노출되므로 Production 환경에만 지정해야 합니다.

도메인 등록만으로 라이브 서버의 파일이 바뀌지는 않습니다. **변경된 소스를 GitHub에 올리고 Vercel을 재배포**해야 새 메타데이터가 반영됩니다. 실제 사이트 응답 및 Analytics 수집 상태는 배포 후 별도로 검증합니다.

## 3. Vercel Web Analytics 활성화

1. Vercel 대시보드에서 해당 프로젝트의 **Analytics 또는 Web Analytics**를 엽니다.
2. **Enable**을 선택합니다. 웹사이트 소스 코드만 수정해도 Vercel 측 분석 수집이 자동으로 켜지지는 않습니다.
3. GitHub에 변경사항을 반영하고 새 Vercel 배포를 생성합니다.
4. 방문 후 브라우저 개발자도구 Network에서 `/_vercel/insights/script.js` 및 조회 이벤트(예: `/_vercel/insights/view`)를 확인합니다. 실제 사용 경로는 Vercel의 설정에 따라 달라질 수 있습니다.
5. Vercel Analytics 대시보드에서 방문 및 페이지 조회가 나타나는지 확인합니다.

일반 HTML 프로젝트이므로 npm 패키지의 React 컴포넌트는 사용하지 않습니다. 첨부하신 Analytics 안내의 `other` 범주를 같은 정적 HTML 방식으로 구현했습니다.

## 4. OG·Twitter 미리보기 확인

1. 배포 도메인에서 HTML을 열어 `og:image`가 **절대 HTTPS URL**인지 확인합니다.
2. `https://해당도메인/og-image.png`가 200 PNG를 반환하는지 확인합니다.
3. 원하는 SNS에서 링크를 공유하여 미리보기를 확인합니다. 일부 SNS는 OG 이미지를 캐시하므로 수정 직후 이전 이미지가 보일 수 있습니다.

## 5. 데이터 보호와 기술적 한계

- Vercel Analytics는 **방문 통계 데이터**를 Vercel로 전송할 수 있습니다. 작품·대본·정설·참조 이미지 자체를 분석 이벤트에 포함시키는 기능은 작성하지 않았습니다.
- 작품 저장은 기존 IndexedDB이며, Codex에 대한 전송은 사용자 요청에 의한 로컬 브리지 흐름입니다.
- 운영 주소는 확인했으나, Vercel API의 사이트 본문 읽기 권한이 없어 실제 배포 HTML과 SNS 공유 미리보기는 **미검증**입니다. 새 코드를 올린 후 다시 확인해야 합니다.
