# 컴포넌트 명세 - [3] 가격 등락 신호등 배지 (Badge)

## 1. 컴포넌트 규격
- **모서리 둥글기**: 작은 칩 형태에 최적화된 `radius-sm` (8px) 또는 `radius-md` (12px) 상속[cite: 1]
- **글자 위계**: 배지 내 텍스트는 가시성 하한선인 `text-label` (16px, 600) 또는 `text-caption` (14px, 500) 적용[cite: 1]
- **접근성 제어**: 색상 판별이 어려운 사용자를 위해 **'전용 기호(▲, ▼, —)'와 수치 텍스트를 반드시 결합**[cite: 1]

## 2. 상태별 토큰 매핑 가이드
- **상승 배지 (Trending Up)**:
  - 배경색: 주황 연한 틴트 배경 (#ffedea) 매핑[cite: 1]
  - 글자색: `BASE.md` -> `--color-text-red` (#d14734) 상속[cite: 1]
  - 기호 규칙: 텍스트 앞머리에 **▲** 기호 필수 접두 연동[cite: 1]
- **하락 배지 (Trending Down)**:
  - 배경색: 연한 파랑 틴트 배경 (`BASE.md` -> `--color-secondary-light` #edf6fc 상속)[cite: 1]
  - 글자색: `BASE.md` -> `--color-secondary` (#3b91c8) 상속[cite: 1]
  - 기호 규칙: 텍스트 앞머리에 **▼** 기호 필수 접두 연동[cite: 1]
- **동일 배지 (Flat)**:
  - 배경색: 비활성 입력창 배경 (`BASE.md` -> `--color-surface-soft` #f5f5f5 상속)[cite: 1]
  - 글자색: 보조 설명 텍스트 (`BASE.md` -> `--text-muted` #666666 상속)[cite: 1]
  - 기호 규칙: 텍스트 앞머리에 **—** 기호 필수 접두 연동[cite: 1]