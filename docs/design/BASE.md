# 디자인 토큰/헌법 (Design System Specification) v1.4.0

## 1. 프로젝트 개요 및 핵심 철학
- **주요 타겟**: 한우 암소 및 국내산 한돈 도매 시세를 매일 확인하는 60–70대 식육점 사장
- **기본 철학**: 인지 부하 최소화(Don't Make Me Think), 단일 컬럼 vertical flow 사수, One UI 상하 분할 적용.
- **시각적 목표**: 배경과의 확실한 구분을 위해 지정된 핵심 색상 4가지를 활용해 높은 시인성과 경쾌한 느낌을 동시 전달합니다.

---

## 2. 레이아웃 시스템 (Layout System)

### 2.1 App Shell
모든 화면은 스크롤 시 화면 밸런스가 무너지지 않도록 아래의 3단 레이아웃 역할을 엄격히 준수합니다.
* **헤더 (Header) 영역**: 화면의 정체성(타이틀) 및 뒤로가기 등 상시 노출. `fixed`로 상단에 영구 고정됩니다. (최소 높이: `72px`, 권장: `80px`, z-index: `50`)
* **바디 (Body) 영역**: 실제 콘텐츠가 노출되는 영역. 헤더와 푸터 사이를 채우며(`flex: 1`, `min-height: 0`), 이 영역 내부에서만 수직 스크롤(`overflow-y-auto`)이 발생합니다. (좌우 패딩 `20px`, 하단 여백 필수 확보)
* **푸터 (Footer) 영역**: 화면 최하단에 상시 고정(`fixed`). 
  - **Bottom Navigation**: 즐겨찾기, 전체 시세, 설정 등 전역 탭 이동.
  - **Page CTA**: 선택 완료, 전송 등 특정 화면의 확정 버튼은 본문 하단 흐름에 배치함을 원칙으로 하되, 반드시 필요한 경우에만 고정(Fixed) CTA로 사용합니다.

### 2.2 Alignment Policy (정렬 원칙)
요소를 무조건 가운데 또는 왼쪽으로 강제하지 않으며, 정보 성격에 따라 명확히 구분합니다. (예외 사용 시 페이지 명세에 이유 기록)
| 요소 | 기본 정렬 |
|---|---|
| 페이지 제목 (Header) | 좌측 |
| 섹션 제목 (SectionTitle) | 좌측 (필요 시 가운데 허용) |
| 설명 문구 (Description) | 좌측 |
| 선택 카드 내부 | 중앙 |
| 요약 지표 그룹 | 중앙 |
| 탭·세그먼트 | 중앙 |
| 목록 데이터 | 좌우 정보 정렬 |
| 빈 상태·오류 상태 | 중앙 |
| Bottom Sheet | 중앙 중심 |
| 설정 행 | 좌측 라벨 / 우측 컨트롤 |

### 2.3 Page Title Hierarchy
Header와 Body에서 제목이 반복되지 않도록 규칙을 정의합니다.
* **루트 화면**: Header에 하단 탭 이름 표시 (예: 즐겨찾기, 전체 시세, 설정)
* **상세 화면**: Header에 구체적인 페이지명 표시 (예: 한우 즐겨찾기 시세 목록)
* **Body 반복 금지**: Body에는 다음 행동이나 섹션 제목만 표시합니다. (금지: Header "고기시세" / Body "즐겨찾기 시세")
* 앱 이름 "고기시세"는 로딩 화면, 로고, 최상위 진입 화면에서만 사용합니다.

### 2.4 Screen Type별 기본 구조
* **선택형 화면 (예: 축종 선택)**: Header → 짧은 안내 → 주요 선택 카드 → 필요 시 보조 설명 → Bottom Navigation
* **목록형 화면 (예: 즐겨찾기 리스트)**: Header → 선택적 요약 → 필터/탭 → 목록 헤더 → 목록 → 페이지네이션 → 보조 CTA
* **탐색형 화면 (예: 전체 시세)**: Header → 검색 → 필터 → 카테고리 다중 선택 → 선택 결과
* **설정형 화면 (예: 설정)**: Header → 설정 섹션 → 설정 행 → 설명 또는 현재 값
* **상태형 화면 (로딩, 빈 상태)**: 중앙 정렬 → 메시지 1개 → 주요 액션 1개

### 2.5 Vertical Rhythm
* 페이지 시작 여백: `24px` 또는 `32px`
* 제목과 설명: `8px`
* 설명과 첫 조작 영역: `24px` 또는 `32px`
* 주요 섹션 사이: `24px` 또는 `32px`
* 큰 margin 또는 padding을 누적하여 화면 위치를 맞추지 않습니다. 하단 공백 문제는 개별 패딩이 아닌 부모 flex 레이아웃으로 점검합니다.
* 정보량이 적다고 카드를 과도하게 늘리지 않으며, 선택형 화면은 콘텐츠 블록을 화면 중앙보다 약간 위에 배치할 수 있습니다.

### 2.6 Scroll Policy
* 스크롤 주체는 Main 하나이며 중첩 스크롤은 금지합니다.
* Header/Footer는 스크롤 영역에서 제외되며, 스크롤바는 Main에만 표시합니다.
* 페이지네이션 성공 후 목록 첫 항목으로 이동, 실패 시 기존 스크롤을 유지합니다.
* Modal/Bottom Sheet 오픈 시 배경 스크롤을 차단합니다.
* Header에 가리지 않도록 `scroll-margin-top` 사용이 가능합니다.

---

## 3. 전역 인터랙션 및 화면 효과 사양
* **상태 용어 명확화**:
  - `Pressed`: 버튼을 누르고 있는 순간
  - `Selected`: 현재 선택된 탭, 필터, 축종 상태
  - `Active Navigation`: 현재 활성화된 하단 메뉴
  - `Disabled`: 조작할 수 없는 상태
* **마우스 호버 상태 (Hover)**: 배경색이 어두워지거나 테두리 반전. (`duration-200`)
* **터치 누름 상태 (Pressed)**: 버튼/카드 터치 시 `active:scale-[0.98]` 및 Shadow 변화를 통해 시각적 피드백을 반드시 제공합니다. 지원 환경에서 Haptic(진동)을 쓸 수 있으나, 기능 이해를 Haptic에 의존하지 않습니다.
* **화면 전환**: 화려한 3D나 큰 이동은 금지. `150~250ms` 내외의 Fade-in/out과 미세한 슬라이드(`2~4px`)만 사용합니다.

---

## 4. 타이포그래피 & 컬러 시스템 규칙
### 4.1 타이포그래피
* Noto Sans KR을 보완한 **Pretendard** 서체 사용. (행간 최소 1.5, 가격 숫자 굵게)
* Type Scale: Display(`32px`, 800) ~ Caption(`14px`, 500) 유지.

### 4.2 Brand / Semantic Color
| 역할 | 토큰명 | HEX | 사용처 |
|---|---|---|---|
| Text Red (상승) | `--color-text-red` | `#d14734` | 프리미엄 텍스트 가독성, 메인 가격 강조, 상승 상태 |
| Primary Orange (주요/확정) | `--color-primary` | `#f85029` | 주요 액션 CTA 배경, 확정형 칩 |
| Point Yellow (강조) | `--color-point-yellow` | `#ffc700` | 카카오톡 공유, 활성 별점, 중요 배지 |
| Secondary Blue (선택/하락) | `--color-secondary` | `#3b91c8` | 탐색 선택 테두리/텍스트, 하락 상태 텍스트 |
| Success / Warning / Error | - | - | 각 의미에 맞는 피드백 컬러 |

### 4.3 Surface / Text Color
* Surface: `--color-bg`, `--color-surface`, `--color-surface-soft`, `--color-border`, `--color-divider`
* Text: `--text-strong`, `--text-default`, `--text-muted`, `--text-light`, `--text-inverse`

### 4.4 가격 등락 컬러 규칙
* **상승**: `#d14734` (기호: ▲)
* **하락**: `#3b91c8` (기호: ▼)
* **동일**: `#666666` (기호: —)

---

## 5. 간격, Radius, Shadow 시스템
* **간격**: `space-4` ~ `space-40` 유지. (모바일 좌우 패딩: `20px`)
* **Radius**: `radius-sm`(8px) ~ `radius-full`(999px) 유지.
* **Shadow**: `shadow-soft`, `shadow-medium` (hover), `shadow-footer`.

---

## 6. 컴포넌트 공통 패턴의 역할 정의 (Component Patterns)
구현 파일명을 강제하지 않으며, 공통 패턴의 역할만 정의합니다. (모든 화면을 하나의 거대한 컴포넌트로 통합하는 과도한 추상화 지양)

* **App Shell 패턴**: Header, Main(scroll), Bottom Navigation을 조합하는 최상위 뼈대 역할.
* **Page Section 패턴**: 수직 패딩과 Vertical Rhythm을 관리하며 도메인 콘텐츠를 감싸는 영역.
* **Section Header 패턴**: 섹션 제목과 설명을 묶음. 기본 정렬은 `left`이며 필요 시 `center`를 허용.
* **Segmented Control 패턴**: 냉장/냉동 등 여러 옵션 중 하나를 선택하는 중앙 정렬 탭.
* **Selection Card Group 패턴**: 한우/한돈처럼 직관적인 시각 요소(이모지 등)가 포함된 큰 선택 카드 그룹.
* **Empty State 패턴**: 아이콘, 제목, 설명, CTA를 포함한 완전한 중앙 정렬 화면.

---

## 7. 카드 및 버튼 규칙

### 7.1 버튼 및 CTA
* 최소 높이 `56px`, 터치 영역 최소 `48x48dp`.
* **주요 액션 (Primary CTA)**: 주황색(`--color-primary`) 사용. 선택 완료, 전송 등 화면의 핵심 행동을 확정할 때 사용합니다. 탐색용 선택 스타일과 혼용을 엄격히 금지합니다.

### 7.2 카드 (Card)
* **기본 카드**: 배경 `--color-surface`, 테두리 `--color-divider`, `shadow-soft` 적용.
* **탐색 선택 카드 (Selection Card)**: 축종, 냉장/냉동, 필터 선택용. (확정용 CTA가 아님)
  - Selected: 파란색 테두리(`2px solid --color-secondary`), 배경 `--color-surface`, 글자 `--text-strong`.
  - Unselected: 배경 `--color-surface-soft`, 테두리 `1px solid --color-border`, 글자 `--text-muted`.
  - Pressed(누름) 상태와 Selected(선택됨) 상태를 시각적·개념적으로 분리하여 적용.
* **비활성 카드**: 배경 `--color-surface-soft`, 텍스트 `--text-light`.

---

## 8. Badge / Chip 규칙
### 8.1 배지 (Badge)
* 상승/하락/동일에 따른 컬러 시스템(4.4항) 적용.

### 8.2 칩 (Chip) 
* **필터·탐색 Chip**: 
  - 선택 전: Surface/Surface Soft 배경 + 회색 테두리
  - 선택 후: 흰색 또는 옅은 파란 배경 + Secondary Blue 테두리 및 텍스트.
* **확정형 Chip**: 특수한 CTA 역할 시에만 Primary Orange 사용 허용.

---

## 9. Motion 및 접근성 규칙
* **Motion**: 화려한 애니메이션 금지. **7일 그래프는 시세 상세 화면이나 추세 확인이 필요한 화면에만 제한적으로 적용**하며, 즐겨찾기/설정/빈 상태 화면에는 강제하지 않습니다.
* **접근성 정교화**: 
  - 일반 텍스트는 WCAG AA 기준 4.5:1 이상, 큰 텍스트는 3:1 이상을 권장합니다.
  - UI 컴포넌트 경계와 상태 표시는 시각적으로 인지 가능한 대비만 확보하면 되며, 디자인을 해치면서까지 단순 테두리에 4.5:1을 무조건 강제하지 않습니다.
  - 색상만으로 상태 전달 금지 (상승/하락 기호 병행 표기).

---

## 10. 화면 명세서 작성 가이드라인 (Screen Spec Rules)
각 페이지 단위 명세 기술 시 아래를 반드시 명시합니다.
1. **위치 정의**: App Shell 구조(Header / Body / Footer) 중 어디에 속하는지 명시.
2. **컴포넌트 정의**: UI 요소 역할, 예외적 정렬 원칙 적용 시 그 이유 명시.
3. **토큰 참조**: 컬러, 타이포그래피 등 디자인 토큰 바인딩.