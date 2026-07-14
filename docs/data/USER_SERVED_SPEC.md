# 📄 [산출물 2] 앱 사용자 서빙용 가공 API 명세서 (USER_SERVED_SPEC.md)

- **디렉토리 구조**: `docs/data/USER_SERVED_SPEC.md`
- **개요**: 가공 완료된 시세를 프론트엔드 연동 전용으로 0초 딜레이 서빙하기 위한 규격. 사용자 조작(버튼 클릭)에 따른 생성/삭제 처리 정책 포함.

## 🏗 공통 규격

### 1. 공통 응답 구조 (Wrapper)
**성공 응답:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_01J2xabcde",
    "servedAt": "2026-07-13T09:20:00+09:00"
  }
}
```

### 2. 💡 핵심 데이터 가공 원칙 (당일 시세 데이터 가공 및 갱신 - Update)
- **한우 암소 40개월 미만 필터 고정:** 백엔드는 가공 시 `species="BEEF"` 데이터 중 반드시 `ageInMonths < 40`인 원본 매물만 스크리닝하여 평균가/최고가/최저가를 산출한다.
- **금천미트 데이터 정제 표준 반영:** 
  - 한돈: 원본에 `(암)`, `암퇘지`가 있으면 `displayName`에 `(암)` 접미사를 붙인다. (예: `삼겹(암)`)
  - 등급(정합성 보장): UI 렌더링 호환성을 위해 `"1++"`, `"1+"`, `"1"`, `"2"`, `"3"`, `"등외"` 문자열로 표준화한다. (프론트엔드에서 렌더링 시 뒤에 '등급'을 붙여 사용)
- **날짜 필드 및 캐시 정책:** 
  - `marketDate`: 실제 가공된 데이터 기준일.
  - `dataStatus`: `CURRENT`(정상 최신), `STALE`(수집 지연 시 상태값을 업데이트하여 전일 가격 복제 서빙), `UNAVAILABLE`(제공 불가).
  - 네트워크 단절 시 최우선 순위: 1. 서버 최신 > 2. 로컬스토리지 > 3. 에러 팝업.
- **용어, 가격 변동 플래그 및 Null 처리:** 전일 데이터 부재 시 `previousPrice`, 가격 변동액(`changeAmount`), 추세 플래그(`trendStatus` - `UP`|`DOWN`|`UNCHANGED`)는 모두 null로 반환한다. 프론트엔드의 뱃지 영역 UI(`— 0` 표시 등)에 반드시 활용되어야 한다.

---

## 1. 📂 시장 시세, 탭 필터링 및 실시간 검색 (Read - 가장 핵심)

### 1.1. 전체 품목 시세 리스트 통째로 조회 (Zero-Delay 서빙)
- **URL:** `/api/v1/market/items`
- **Method:** `GET`
- **사용자 액션 맵핑 (탭 버튼 & 검색창 입력):**
  - 사장님이 탭(한우/한돈, 냉장/냉동)을 바꾸거나 검색창에 타이핑할 때마다 백엔드로 서버 요청을 보내지 않는다.
  - **Zero-Delay UX 달성**: `search`, `sort` 등 모든 쿼리 파라미터를 완전히 제거한다. 백엔드는 가공 완료된 전체 품목 플랫 배열(Flat Array)을 통째로 응답하고, 프론트엔드가 최초 1회 수신한 캐시 배열에서 `array.filter()`로 탭 필터링과 실시간 검색을 메모리 단에서 수행한다.
- **🔍 클라이언트 사이드 검색 정책 (FE 구현 책임):**
  - 사용자가 검색창에 `"안심"` 또는 `"ㅅㄱ"`(초성)을 입력하면 프론트엔드가 `item.searchKeywords` 필드를 대상으로 `array.filter()`를 실행한다.
  - 탭(BEEF/PORK, CHILLED/FROZEN) 필터와 검색어 필터는 AND 조건으로 결합한다.
  - 한국어 초성 검색은 `korean-regexp` 등 클라이언트 라이브러리를 활용한다.
- **BE 담당: `searchKeywords` 필드 가공 정책 (핀점 3가지)**

  **[Check 1] 한돈 암퍼지 `(암)` 접미사 누락 없이 포함:**
  - `displayName`이 `삼겹(암)`으로 가공되는 해당 품목은 `searchKeywords`에도 `삼겹암`, `삼겹(암)`, `ㅅㄱㅇ`, `삼겹살암`을 반드시 포함한다.
  - 예: `displayName: "삼겹(암)"` → `searchKeywords: "삼겹 ㅅㄱ ㅅㄱㅇ 삼겹암 삼겹(암) 삼겹살암 한돈삼겹"`

  **[Check 2] 등급 표기 및 초성 결합 토큰화 포함:**
  - 사장님들이 띄어쓰기 없이 `ㅅㄱ1`, `삼겹1`, `안심1++`과 같이 [초성/부위명 + 등급]을 붙여서 검색하는 시나리오를 완벽 지원한다.
  - 백엔드는 `searchKeywords` 빌드 시, [초성+등급지표] 및 [부위명+등급지표]의 조합형 문자열을 공백으로 구분하여 반드시 추가한다.
    * 예시 (삼겹 1등급): `searchKeywords` 내에 `"ㅅㄱ1 삼겹1"` 토큰 강제 포함
    * 예시 (안심 1++): `searchKeywords` 내에 `"ㅇㅅ1++ 안심1++ ㅇㅅ1pp 안심1pp"` 토큰 강제 포함
  - 실제 사장님들이 `1pp`, `1PP`, `1플러스플러스`로 타이핑하는 경우를 대비하여, 백엔드는 `1++`, `1pp`, `1PP`를 모두 `searchKeywords`에 집어넣는다.
  - 예: `grade: "1++"` → `searchKeywords`에 `"1++ 1pp 1PP"` 서브토큰 포함.

  **[Check 3] Nullable ❌ 불가 정책 — 빈 문자열(`""`) 보장:**
  - 등급이 없는 부산물(예: `냉동돈피`, `잡뉴`) 등 초성 추출이 애매한 품목도 `searchKeywords`에 `null`이나 `undefined`를 내리면 안 된다.
  - 케이워드가 없는 경우라도 최소한 빈 문자열(`""`))을 보장해야 프론트엔드에서 `.includes()` 호출 시 `Cannot read properties of null` 런타임 에러를 막는다.
- **Response Body (Data 부분):**
  ```json
  {
    "dataStatus": "CURRENT",
    "marketDate": "2026-07-13",
    "items": [
      {
        "itemId": "beef-tenderloin-1pp-chilled",
        "priceId": "price-20260713-000123",
        "species": "BEEF",
        "storageType": "CHILLED",
        "category": "안심",
        "displayName": "안심 1++",
        "searchKeywords": "안심 ㅇㅅ 안심1++ 한우암소안심",
        "grade": "1++",
        "price": 38000,
        "previousPrice": 36800,
        "changeAmount": 1200,
        "trendStatus": "UP",
        "currency": "KRW",
        "priceUnit": "KRW_PER_KG"
      },
      {
        "itemId": "pork-belly-chilled",
        "priceId": "price-20260713-000234",
        "species": "PORK",
        "storageType": "CHILLED",
        "category": "삼겹",
        "displayName": "삼겹(암)",
        "searchKeywords": "삼겹 ㅅㄱ 삼겹암 국내산한돈삼겹",
        "grade": null,
        "price": 21000,
        "previousPrice": 21000,
        "changeAmount": 0,
        "trendStatus": "UNCHANGED",
        "currency": "KRW",
        "priceUnit": "KRW_PER_KG"
      }
    ]
  }
  ```

### 1.2. 특정 품목 시세 산출 세부 내역 조회 (UI 카드 터치 맵핑)
- **URL:** `/api/v1/market/items/{itemId}/calculations`
- **Method:** `GET`
- **사용자 액션 맵핑 (시세 품목 카드 터치):** 사장님이 특정 고기 카드 영역을 클릭할 때 상세 팝업을 오픈하는 용도.
- **설명:** 화면의 평균 가격이 어떤 원본 매물들로 산출되었는지 투명하게 증명하기 위해, 산출에 기여한 금천미트 세부 원본 매물 리스트(`sourceRecords`)를 실시간으로 가져다 준다.
- **Response Body (Data 부분):**
  ```json
  {
    "itemId": "beef-tenderloin-1pp-chilled",
    "displayName": "안심 1++",
    "averagePrice": 38000,
    "changeAmount": 1200,
    "trendStatus": "UP",
    "highestPrice": 42000,
    "lowestPrice": 35000,
    "participantCount": 2,
    "sourceRecords": [
      {
        "sourceName": "GEUMCHEON",
        "rawProductName": "[금천] 한우 암소 안심 1++ (38개월)",
        "price": 38500,
        "ageInMonths": 38
      }
    ]
  }
  ```

### 1.3. 특정 품목 가격 이력 조회
- **URL:** `/api/v1/market/items/{itemId}/price-history`
- **Method:** `GET`
- **Response Body (Data 부분):**
  ```json
  {
    "item": { "itemId": "beef-tenderloin-1pp-chilled", "displayName": "안심 1++" },
    "points": [
      { "marketDate": "2026-07-12", "price": null },
      { "marketDate": "2026-07-13", "price": 38000 }
    ]
  }
  ```

---

## 2. ⭐️ 관심 부위 즐겨찾기 관리 (CRUD 매핑 및 토큰 검증)
*(모든 API는 헤더에 `Authorization: Bearer {token}` 필수. 누락 시 표준 래퍼 구조의 `401 Unauthorized` 에러 반환 검증 필수)*

### 2.1. 즐겨찾기 리스트 조회 (즐겨찾기 탭 진입)
- **URL:** `/api/v1/users/me/favorites`
- **Method:** `GET`
- **사용자 액션 맵핑:** 하단 바의 '즐겨찾기' 탭을 누를 때 호출. 사장님이 찜해둔 품목 리스트만 플랫 배열(Flat Array)로 가져온다. (1.1 구조와 동일)

### 2.2. 즐겨찾기 상태 변경 (카드의 별 마크 토글)
- 사용자가 상세 팝업이나 목록에서 **'즐겨찾기 별모양 버튼'을 클릭**할 때 발생하는 상태 전이 및 관계형 데이터 제어(CUD) 규칙.
- **추가 (Create - 찜하기):** 
  - `POST /api/v1/users/me/favorites/{itemId}` (유저-품목 맵핑 테이블 생성)
  - 중복 등록 시에도 서버는 항상 `204 No Content` 성공을 반환하여 프론트 오류를 차단한다.
- **삭제 (Delete - 찜 해제):**
  - `DELETE /api/v1/users/me/favorites/{itemId}` (맵핑 리소스 제거)
  - 존재하지 않는 항목이라도 `204 No Content` 성공을 반환하여 멱등성을 보장한다.

---

## 3. 💬 외부 연동 및 공유
- **카카오톡 시세 공유 방식:** 카카오톡 공유는 백엔드 개입(서버 API) 없이 프론트엔드가 가진 객체 데이터만을 결합하여 클라이언트 카카오 SDK Deep Link 기능으로 100% 위임한다.

---

## 4. 🚨 에러 코드 및 데이터 딕셔너리

### 에러 매트릭스
| HTTP 코드 | 발생 상황 (송곳 검증 포인트) |
| --- | --- |
| `400` | `INVALID_QUERY_PARAMETER`: 잘못된 파라미터 요청 |
| `401` | `AUTHENTICATION_REQUIRED`: **즐겨찾기 API 호출 시 권한 바인딩 누락/만료. 표준 래퍼 형태로 반환하는지 필수 체크.** |
| `404` | `MARKET_ITEM_NOT_FOUND`: 존재하지 않는 itemId 추가/조회 시 |
| `500` | `INTERNAL_SERVER_ERROR`: 서버 내부 연산 로직 에러 |
| `503` | `MARKET_DATA_UNAVAILABLE`: 제공 가능한 Fallback 시세조차 없음 |

### 데이터 딕셔너리 (User Served)
모든 필드의 데이터 부재(Null) 허용 여부를 명확히 마킹한다.

| 필드 | 타입 | 필수 여부 | Nullable | 설명 및 제약조건 | 범위 |
| --- | --- | --- | --- | --- | --- |
| `itemId` | string | 필수 | ❌ 불가 | 품목 고유 식별자 | 최대 100자 |
| `species` | string | 필수 | ❌ 불가 | 축종 | `"BEEF"` \| `"PORK"` |
| `storageType` | string | 필수 | ❌ 불가 | 보관 상태 | `"CHILLED"` \| `"FROZEN"` |
| `category` | string | 필수 | ❌ 불가 | 부위 그룹명 | - |
| `displayName` | string | 필수 | ❌ 불가 | 정제된 화면 표시명 (예: `삼겹(암)`) | - |
| `grade` | string | 선택 | ✅ 가능 | **등급 포맷 엄수**: `"1++"`, `"1+"`, `"1"`, `"2"`, `"3"`, `"등외"` | `"1++"`, `"1+"`, `"1"`, `"2"`, `"3"`, `"등외"` |
| `searchKeywords` | string | 필수 | ❌ 불가 | **클라이언트 검색 인덱스**: 품목명 초성·(암) 접미사·등급 이표기(`1pp`) 등을 공백으로 연결한 문자열. 케이워드 없는 품목도 빈 문자열(`""`) 보장 필수. | 예: `"삼겹 ㅅㄱ ㅅㄱㅇ 삼겹암 1pp 1PP"` |
| `price` | integer | 선택 | ✅ 가능 | 가공 평균가 (데이터 부재 시 null) | 0 이상 정수 |
| `previousPrice` | integer | 선택 | ✅ 가능 | 전일 가격 (데이터 부재 시 null) | 0 이상 정수 |
| `changeAmount` | integer | 선택 | ✅ 가능 | **가격 변동 배지 연동**: 전일 대비 원 단위 변동액 (부재 시 null) | - |
| `trendStatus` | string | 선택 | ✅ 가능 | **가격 변동 플래그 연동**: 추세 플래그 (부재 시 null) | `"UP"` \| `"DOWN"` \| `"UNCHANGED"` |
| `currency` | string | 필수 | ❌ 불가 | 통화 단위 | `"KRW"` 고정 |
| `priceUnit` | string | 필수 | ❌ 불가 | 가격 단위 | `"KRW_PER_KG"` 고정 |
