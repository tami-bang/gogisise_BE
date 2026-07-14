# 컴포넌트 명세 - [1] 버튼 및 터치 인터랙션 (Button)

## 1. 컴포넌트 규격
- **높이 규격**: 최소 56px, 권장 64px 사수 (접근성 규칙에 따른 터치 영역 최소 48x48dp 확보 위함)[cite: 1]
- **텍스트 크기**: 버튼 내 본문 최소 `text-body-lg` (20px) 또는 `text-label` (16px) 이상 적용[cite: 1]
- **모서리 둥글기**: `radius-lg` (16px) 이상 적용하여 시각적 안정감 부여[cite: 1]

## 2. 인터랙션 및 토큰 상속 가이드
- **누름 효과 (Active State)**: 터치 즉시 컴포넌트 전체에 `active:scale-[0.98]` 축소 피드백 필수 연동[cite: 1]
- **Primary Button (주요 액션)**:
  - 배경색: `BASE.md` -> `--color-primary` (#f85029) 상속[cite: 1]
  - 글자색: `BASE.md` -> `--text-inverse` (#ffffff) 상속[cite: 1]
  - 효과: Active 시 배경색 15% 진해짐 (Primary Dark #d13916 매핑)[cite: 1]
- **Secondary Button (보조/토글)**:
  - 배경색: `BASE.md` -> 주황 틴트 배경 (#ffedea) 상속[cite: 1]
  - 테두리/글자: `1px solid --color-primary` (#f85029) 적용[cite: 1]
- **Kakao Button (시세 전송)**:
  - 배경색: `BASE.md` -> `--color-point-yellow` (#ffc700) 상속[cite: 1]
  - 글자색: `BASE.md` -> `--text-strong` (#1f1f1f) 상속[cite: 1]
  - 배치: 좌측 내부에 💬 대형 말풍선 아이콘 필수 결합[cite: 1]
- **Disabled Button (비활성)**:
  - 배경색: `BASE.md` -> `--color-disabled` (#c7c7c7) 상속, 글자색 `#ffffff`[cite: 1]
  - 효과: 모든 터치 및 클릭 이벤트 완전 차단 (`pointer-events-none`)[cite: 1]