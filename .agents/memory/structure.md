# 프로젝트 디렉토리 구조 (Project Structure)

> 💡 본 문서의 목적은 현재 프로젝트의 최신 구조를 정의하고 동기화하는 것입니다. 에이전트가 `/structure` 명령을 통해 실시간 트리 구조를 기반으로 자동 갱신한 메모리입니다.

## 📁 전체 구조 트리 (주석포함)
```text
.
├── .agents                                # 에이전트 시스템 전체 메인 가이드라인
│   ├── memory                             # 상태 및 구조 메모리 보관
│   │   ├── context.md                     # 문맥
│   │   ├── history.md                     # 작업 완료 기록
│   │   ├── status.md                      # 현재 상태
│   │   └── structure.md                   # 디렉토리 구조
│   ├── rules                              # 에이전트 시스템 규칙
│   │   ├── education.md                   # 교육 가이드라인
│   │   └── rules.md                       # 전역 룰
│   └── workflows                          # 워크플로우 정의
│       ├── arichitecture.md               # 아키텍처 가이드라인
│       ├── commit_convention.md           # 커밋 컨벤션
│       ├── feature_request.md             # 기능 요청
│       └── structure.md                   # 구조 갱신
├── dist                                   # 빌드된 정적 파일 (배포용)
│   ├── assets                             # 번들링된 자산 (JS, CSS)
│   │   ├── index-hinOPjvV.js              # 번들링된 자바스크립트
│   │   └── index-rniEDiKB.css             # 번들링된 스타일시트
│   ├── favicon.svg                        # 빌드된 파비콘
│   ├── icons.svg                          # 빌드된 아이콘 스프라이트
│   └── index.html                         # 빌드된 메인 진입점 HTML
├── docs                                   # 프로젝트 기획 및 디자인 문서 보관
│   ├── bible                              # 핵심 원칙 및 명세서
│   │   ├── CATEGORIES.md                  # 카테고리 명세서
│   │   ├── FUNCTIONS.md                   # 상세 기능 명세서
│   │   ├── PRD.md                         # 제품 요구사항 정의서
│   │   ├── TECHSTACK.md                   # 기술 스택 명세
│   │   └── commit_convention.md           # 깃 커밋 메시지 규칙 가이드
│   ├── data                               # 데이터 모델 및 명세
│   │   ├── INTERNAL_RAW_SPEC.md           # 내부 로우 데이터 구조
│   │   ├── USER_AUTH_SPEC.md              # 사용자 인증/권한 명세 (신규)
│   │   └── USER_SERVED_SPEC.md            # 사용자 제공 데이터 명세
│   └── design                             # 화면 설계 및 디자인 시스템
│       ├── components                     # 공통 재사용 UI 컴포넌트 명세
│       │   ├── 1_button.md                # 버튼 컴포넌트 스펙
│       │   ├── 2_card.md                  # 카드 레이아웃 명세
│       │   ├── 3_badge.md                 # 뱃지 명세
│       │   ├── 4_chart.md                 # 차트 명세
│       │   ├── 5_header_footer.md         # 헤더 푸터 명세
│       │   ├── 6_toggle_tab.md            # 토글 및 탭 명세
│       │   └── 7_grid_tile.md             # 그리드 타일 명세
│       ├── pages                          # 개별 화면 명세
│       │   ├── 0_main(mobile).md          # 모바일 메인
│       │   ├── 0_main(window).md          # 윈도우 메인
│       │   ├── 1_detail_price.md          # 가격 상세 조회
│       │   ├── 2_onboarding_step1_textsize.md # 텍스트 설정 온보딩
│       │   ├── 3_onboarding_step2_selectcategory.md # 관심 카테고리 온보딩
│       │   └── 4_onboarding_step3_searchableselect.md # 검색 온보딩
│       └── BASE.md                        # 기본 디자인 시스템
├── public                                 # 정적 에셋
│   ├── favicon.svg                        # 파비콘
│   └── icons.svg                          # 공통 아이콘 스프라이트
├── src                                    # 메인 소스 코드 디렉토리
│   ├── api                                # API 연동 계층
│   │   ├── mock                           # 모의 데이터
│   │   │   ├── authMock.ts                # 인증 모의 데이터
│   │   │   ├── kakaoAuthMock.ts           # 카카오 간편로그인 모의 데이터
│   │   │   └── marketMock.ts              # 시세 모의 데이터
│   │   ├── services                       # API 서비스
│   │   │   ├── authService.ts             # 인증 API 서비스
│   │   │   ├── marketService.ts           # 시장 데이터 서비스
│   │   │   └── priceAggregationService.ts # 가격 집계 서비스
│   │   ├── types                          # 타입 정의
│   │   │   ├── auth.ts                    # 인증 데이터 타입
│   │   │   └── market.ts                  # 시장 데이터 타입
│   │   └── index.ts                       # API 엔트리
│   ├── assets                             # 빌드용 내부 정적 자산
│   │   ├── hero.png                       # 히어로 이미지
│   │   └── vite.svg.jpg                   # Vite 아이콘
│   ├── components                         # UI 컴포넌트
│   │   ├── common                         # 공통 컴포넌트
│   │   │   ├── Badge.tsx                  # 뱃지 컴포넌트
│   │   │   ├── Button.tsx                 # 버튼 컴포넌트
│   │   │   ├── ConfirmDialog.tsx          # 확인 대화상자
│   │   │   ├── EmptyState.tsx             # 빈 상태 표시
│   │   │   ├── ErrorState.tsx             # 에러 상태 표시
│   │   │   ├── FontSizeSelector.tsx       # 폰트 크기 선택기
│   │   │   ├── Footer.tsx                 # 푸터
│   │   │   ├── Header.tsx                 # 헤더
│   │   │   ├── InlineError.tsx            # 인라인 에러
│   │   │   ├── Layout.tsx                 # 기본 레이아웃
│   │   │   ├── ListSkeleton.tsx           # 리스트 스켈레톤
│   │   │   ├── LoadingScreen.tsx          # 로딩 스크린
│   │   │   ├── PageLayout.tsx             # 페이지 레이아웃
│   │   │   ├── Pagination.tsx             # 페이지네이션
│   │   │   ├── SearchInput.tsx            # 검색 입력창
│   │   │   ├── SegmentedControl.tsx       # 세그먼트 컨트롤 탭
│   │   │   └── Toast.tsx                  # 토스트 알림
│   │   └── domain                         # 도메인 특화 컴포넌트
│   │       ├── auth                       # 사용자 인증 컴포넌트
│   │       │   ├── AuthBottomSheet.tsx    # 인증 통합 바텀시트
│   │       │   ├── FindEmailForm.tsx      # 이메일 찾기 폼
│   │       │   ├── LoginForm.tsx          # 로그인 폼
│   │       │   ├── MagicLinkForm.tsx      # 비밀번호 찾기 (매직링크) 폼
│   │       │   └── SignupForm.tsx         # 회원가입 폼
│   │       ├── price-detail               # 시세 상세 관련
│   │       │   ├── DetailHeader.tsx       # 상세 화면 헤더
│   │       │   ├── PriceDetailSheet.tsx   # 시세 상세 바텀시트
│   │       │   ├── PriceSummaryCard.tsx   # 시세 요약 카드
│   │       │   └── SourceList.tsx         # 소스(출처) 리스트
│   │       ├── AnimalSelect.tsx           # 동물(품목) 선택기
│   │       ├── FavoriteManager.tsx        # 즐겨찾기 관리자
│   │       ├── FavoritePriceList.tsx      # 관심 시세 리스트
│   │       ├── FavoriteShareSheet.tsx     # 즐겨찾기 공유 시트
│   │       ├── KakaoShareButton.tsx       # 카카오 공유 버튼
│   │       ├── PriceCard.tsx              # 가격 카드
│   │       └── SummaryStats.tsx           # 요약 통계
│   ├── contexts                           # 전역 상태 컨텍스트 관리
│   │   └── AuthContext.tsx                # 인증 정보 상태 관리
│   ├── hooks                              # 커스텀 훅
│   │   ├── useAuth.ts                     # 사용자 인증 로직 및 에러 매핑 훅
│   │   ├── useFavorites.ts                # 즐겨찾기 훅
│   │   ├── useInitializeAuth.ts           # 자동 인증 복구(Silent Refresh) 훅
│   │   ├── usePriceDetail.ts              # 가격 상세 훅
│   │   └── useSettings.ts                 # 설정 훅
│   ├── pages                              # 라우팅 단위 화면 컨테이너
│   │   ├── AllPricesPage.tsx              # 전체 시세 페이지
│   │   ├── MainPage.tsx                   # 메인 대시보드
│   │   └── SettingsPage.tsx               # 설정 페이지
│   ├── utils                              # 유틸리티 함수
│   │   ├── crypto.ts                      # 클라이언트 보안 암호화 유틸
│   │   ├── errorDictionary.ts             # 백엔드 에러 한국어 매핑 딕셔너리
│   │   ├── formatter.ts                   # 포맷팅 유틸
│   │   ├── koreanSearch.ts                # 한국어 초성 검색 유틸
│   │   └── validation.ts                  # 폼 입력값 검증 유틸 (이메일, 비밀번호 등)
│   ├── App.tsx                            # 최상위 라우팅 및 전역 상태 관리
│   ├── index.css                          # 글로벌 스타일시트
│   └── main.tsx                           # 앱 진입점
├── .gitignore                             # Git 추적 제외 파일 목록
├── .gitmessage                            # Git 커밋 메시지 템플릿
├── .oxlintrc.json                         # oxlint 설정
├── README.md                              # 프로젝트 소개 및 사용법 리드미
├── index.html                             # 메인 마크업 진입점
├── package-lock.json                      # NPM 패키지 잠금 파일
├── package.json                           # 패키지 설정 및 스크립트
├── tsconfig.app.json                      # 타입스크립트 앱 설정
├── tsconfig.json                          # 타입스크립트 베이스 설정
├── tsconfig.node.json                     # Vite 노드 환경 설정
└── vite.config.ts                         # Vite 빌드 설정 (보안/난독화 세팅)
```

## 🧠 주요 폴더 및 파일 설명 (비유: IT 회사의 조직 및 설계도)

이 프로젝트를 하나의 **'IT 회사 조직'과 그 '설계도'**에 비유하여 설명합니다.

1. **`docs/` (기획/디자인 부서 & 회사 설계도)**
   - 회사의 나아갈 방향과 규칙, 화면의 청사진을 보관하는 곳입니다.
   - **`bible/`**: 회사의 핵심 가치와 요구사항, 기술 스택을 명시하는 '헌법' 역할을 합니다.
   - **`design/`**: 디자이너와 기획자가 구상한 UI/UX 설계도면(컴포넌트 및 페이지 명세)들이 모여있습니다.
   - **`data/`**: 시스템 내 데이터 모델 및 규격을 정의하는 곳으로, 인증 절차(`USER_AUTH_SPEC.md`) 및 서빙 데이터를 체계화합니다.

2. **`src/` (본사 작업 현장 - 엔지니어링 본부)**
   - 회사의 실질적인 제품(프론트엔드 앱)을 만들어내는 주요 생산 공장입니다. 엄격한 클린 아키텍처 규칙에 따라 작동합니다.
   - **`api/` (통신팀)**: 외부 데이터 소스와의 인터페이스를 전담하며, 인증 처리(`authService`, `authMock`) 등 순수 데이터 통신 로직만을 캡슐화합니다.
   - **`components/` (조립 공정)**: 화면을 구성하는 UI 요소들을 생산합니다. 공용 부품(`common`)과 특수 도메인 부품(`domain`)을 분리하며, 특히 `domain/auth` 구역은 보안 철칙에 따라 API 통신 기능을 배제한 순수 UI 조립만 진행합니다.
   - **`contexts/` 및 `hooks/` (경영진 및 보안 요원)**: `AuthContext`는 사용자의 토큰을 디스크(localStorage)가 아닌 메모리 금고에만 안전하게 보관합니다. 커스텀 훅(`useAuth`, `useInitializeAuth`)은 조립 공정(UI)과 통신팀(API) 사이의 징검다리 역할을 하며, 에러를 번역하고 뒷단에서 은밀하게 토큰을 복구(Silent Refresh)합니다.
   - **`pages/` (최종 쇼룸)**: 만들어진 컴포넌트들을 모아 사용자에게 보여주는 실제 화면 단위의 결과물입니다.
   - **`App.tsx` (총괄 매니저)**: 사용자가 어떤 화면으로 가야 할지 길을 안내(라우팅)하고, 앱 가동 시 보안 시스템(인증 초기화)을 가장 먼저 활성화시킵니다.
   - **`utils/` (전문 도구실)**: 데이터 암호화(`crypto`), 외국어(서버 에러) 번역(`errorDictionary`), 안전 검사(`validation`) 등 특수 목적의 도구들이 모여있습니다.

3. **`dist/` & `public/` (물류 창고 및 출하 센터)**
   - 고객에게 최종적으로 전달될 정적 자산과 번들링된 완성품이 출하를 대기하는 곳입니다. 소스맵(Sourcemap)이 제거되어 외부인이 회사의 설계 기밀을 훔쳐볼 수 없도록 철저히 통제됩니다.

4. **`.agents/` (경영 지원 AI 로봇 - 영속적 기억 장치)**
   - 현재 디렉토리 트리에는 노출되지 않지만, 프로젝트의 흐름과 규칙을 관리하는 두뇌입니다.
   - `memory/`를 통해 현재 상태와 프로젝트 개요를 잊지 않고 기억하며, `rules/`와 `workflows/`를 통해 정해진 지침에 따라 업무를 완벽하게 보조합니다.