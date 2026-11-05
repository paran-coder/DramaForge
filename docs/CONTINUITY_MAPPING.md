# ContinuityMemory v1.0.3 → DramaForge v1.6.0 선별 통합

**자료 기준:** 사용자가 업로드한 `ContinuityMemory-v1.0.3(AI기억력).zip` 안의 `ContinuityMemory-v1.0.3.md` 및 참고 설명 문서.

| 원문 규칙 | 구현 위치 | 적용 범위 |
|---|---|---|
| 선행 조건 / 원인 / 결과 / 예외를 나누어 기록 | `web/narrative.mjs`: `causality` | 승인된 사건 ID 참조, 순환 인과 검증, 극중 실제 시간 순서 검사 |
| 세계관의 진실·인물 믿음·관객 믿음 분리 | `perspective` 및 `narrativeState` | 인물 믿음 시작, 관객 오해 유도, 진실 공개, 의도적 반전 근거 |
| 극중 시간 / 공개 시점 / 기획 수정 이력 구분 | `timeline`, `versions`, `narrativeState` | 실제 순서+설명 / 공개 회차+장면 / 승인 이력 시각 표시 |
| 치명 즉시 / 중요 확정 전 / 경미 배치 | `prioritizeContinuity`, `acknowledgeNarrativeIssues` | 집필 중 중요 경고 우선, 원고 확정 시 작가 검토, 경미 접힘 |

**중복이어서 이식하지 않은 항목:** 작가 단독 승인, 기존 확정/보류/기각 정설 상태, What-if 분리, 사건·지식의 기본 회차 기록, 기존 IndexedDB/ZIP, 별도의 Markdown 수동 원본 갱신.

**기존 규칙과 충돌했던 지점:** ContinuityMemory는 대화 중 명확한 확정 표현을 곧바로 확정 결정으로 해석할 여지가 있으나, DramaForge는 **작가가 앱에서 최종 승인해야만 정설**로 등록합니다. 이 정책을 변경하지 않았습니다.

**검증되지 않은 점:** 숨은 원인과 의미상 복선 탐지는 자동 추론의 완전성을 보장하지 않습니다. 원문에서 지적한 '관련성이 곧 인과관계는 아니다'라는 원칙에 따라 선행 조건·근거가 없는 자동 확정을 금지합니다.
