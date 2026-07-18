# 고기시세 데이터베이스 ERD 명세

## 1. 설계 원칙

- PostgreSQL과 Prisma를 기준으로 한다.
- `Market_Items`는 금천미트의 개별 상품(`goodsNo`)을 보존하는 상품 마스터다.
- 월령·중량·판매가·제조일·소비기한은 검색 문자열이나 JSON에 저장하지 않는다.
- `searchKeywords`는 상품명·브랜드·카테고리 검색에만 사용한다.
- 가격과 날짜 및 축종별 월령 규칙은 애플리케이션 검증과 DB CHECK 제약으로 이중 보호한다.
- 모든 외래키 종속 관계는 명시된 `ON DELETE CASCADE` 정책을 따른다.

## 2. 핵심 테이블

### 2.1 `Market_Items` — 원본 상품 마스터

| 컬럼 | PostgreSQL 타입 | 제약 | Nullable | 설명 |
| --- | --- | --- | --- | --- |
| `itemId` | UUID | PK | 아니오 | 내부 상품 ID |
| `goodsNo` | VARCHAR | UK | 아니오 | 금천미트 상품 고유번호 |
| `name` | VARCHAR |  | 아니오 | 원본 상품명 |
| `brand` | VARCHAR |  | 아니오 | 브랜드 |
| `detailUrl` | VARCHAR |  | 아니오 | 원본 상품 URL |
| `status` | VARCHAR | DEFAULT `ACTIVE` | 아니오 | 판매 상태 |
| `species` | VARCHAR | INDEX, CHECK | 아니오 | `BEEF` 또는 `PORK` |
| `storageType` | VARCHAR | INDEX, CHECK | 아니오 | `CHILLED` 또는 `FROZEN` |
| `category` | VARCHAR |  | 아니오 | 금천미트 원본 카테고리 경로 |
| `displayName` | VARCHAR |  | 예 | 화면 표시명 |
| `grade` | VARCHAR | INDEX | 예 | `1++`, `1+`, `1` 등급 |
| `ageMonths` | INTEGER | CHECK | 예 | 한우 1~40, 한돈은 NULL |
| `weightKg` | DECIMAL(10,3) | CHECK `> 0` | 아니오 | 상품 중량(kg) |
| `price` | INTEGER | CHECK `> 0` | 아니오 | kg당 단가 |
| `salePrice` | INTEGER | CHECK `> 0` | 예 | 실제 판매가 |
| `manufacturedAt` | DATE | CHECK | 예 | 제조일 |
| `expiresAt` | DATE | CHECK | 예 | 소비기한. 제조일 이후 |
| `searchKeywords` | VARCHAR |  | 예 | 검색 전용 평문 문자열 |
| `currency` | VARCHAR | DEFAULT `KRW` | 아니오 | 통화 |
| `priceUnit` | VARCHAR | DEFAULT `KRW_PER_KG` | 아니오 | 가격 단위 |
| `createdAt` | TIMESTAMP(6) | DEFAULT NOW | 아니오 | 생성 일시 |
| `updatedAt` | TIMESTAMP(6) | ORM 자동 갱신 | 아니오 | 수정 일시 |

DB CHECK 정책:

```text
species = BEEF  -> ageMonths BETWEEN 1 AND 40
species = PORK  -> ageMonths IS NULL
storageType IN (CHILLED, FROZEN)
weightKg > 0
price > 0
salePrice IS NULL OR salePrice > 0
expiresAt IS NULL OR manufacturedAt IS NULL OR expiresAt > manufacturedAt
```

조회 최적화 인덱스:

- `idx_market_items_species(species)`
- `idx_market_items_storage_type(storageType)`
- `idx_market_items_grade(grade)`
- `Market_Items_goodsNo_key(goodsNo)` UNIQUE

### 2.2 `Market_Item_Prices` — 일자별 가격 이력

| 컬럼 | 타입 | 제약 | Nullable |
| --- | --- | --- | --- |
| `priceId` | UUID | PK | 아니오 |
| `itemId` | UUID | FK → Market_Items | 아니오 |
| `marketDate` | DATE | 복합 UK | 아니오 |
| `price` | INTEGER |  | 예 |
| `previousPrice` | INTEGER |  | 예 |
| `changeAmount` | INTEGER |  | 예 |
| `trendStatus` | VARCHAR |  | 예 |
| `highestPrice` | INTEGER |  | 예 |
| `lowestPrice` | INTEGER |  | 예 |
| `participantCount` | INTEGER |  | 예 |
| `createdAt` | TIMESTAMP(6) | Audit | 아니오 |
| `updatedAt` | TIMESTAMP(6) | Audit, ORM 자동 갱신 | 아니오 |

`(itemId, marketDate)` 복합 유니크 키로 동일 상품의 같은 날짜 가격 중복을 차단한다.

### 2.3 `Raw_Records` — 불변 원본 시세

수집처, 수집 시각, 원본 상품명, 축종, 성별, 보관 상태, 카테고리, 브랜드, 품질·육량 등급, 월령, kg당 단가를 보존한다. 동일 수집 결과 재전송은 `(sourceName, collectedAt, rawProductName, pricePerKg, species, storageType)` 복합 유니크 키로 차단한다.

## 3. 사용자 및 인증 테이블

### 3.1 `Users`

| 컬럼 | 타입 | 제약 | Nullable |
| --- | --- | --- | --- |
| `userId` | UUID | PK | 아니오 |
| `email` | VARCHAR | UK | 아니오 |
| `phone` | VARCHAR | UK | 아니오 |
| `password` | VARCHAR |  | 예 |
| `nickname` | VARCHAR |  | 아니오 |
| `status` | VARCHAR | DEFAULT `ACTIVE` | 아니오 |
| `createdAt` | TIMESTAMP(6) | Audit | 아니오 |
| `updatedAt` | TIMESTAMP(6) | Audit, ORM 자동 갱신 | 아니오 |
| `deletedAt` | TIMESTAMP(6) | Soft Delete | 예 |

`phone`은 회원가입·본인확인에 사용하는 유일한 휴대폰 번호다. 탈퇴는 `deletedAt`을 기록하는 논리 삭제를 우선한다.

### 3.2 `User_Tokens`

`tokenId` PK, `userId` FK, `refreshToken`, `isBlacklisted`, `expiresAt`, `createdAt`, `updatedAt`을 가진다. `expiresAt` 인덱스를 사용해 만료 토큰을 주기적으로 삭제한다.

### 3.3 `Favorites`

`favoriteId` PK, `userId` FK, `itemId` FK, `createdAt`, `updatedAt`을 가진다. `(userId, itemId)` 복합 유니크 키로 중복 즐겨찾기를 차단한다.

### 3.4 기타 사용자 테이블

- `User_Social_Accounts`: 소셜 계정 연결과 `createdAt`, `updatedAt` 감사 컬럼.
- `User_Views_Log`: `(logId, viewedAt)` 복합 PK. `viewedAt` 기준 월별 파티셔닝·보존 정책 적용.

## 4. 운영 테이블

- `Category_Tree`: 금천미트 원본 카테고리 트리. 594개 한우 암소·한돈 말단 카테고리 탐색 기준.
- `Crawler_Tasks`: 비동기 수집 요청과 상태, `createdAt`, `updatedAt` 보존.
- `Crawler_Metadata`: 최근 수집 건수와 점검·갱신 일시 보존.

## 5. 관계 및 삭제 정책

- Users 1:N User_Social_Accounts
- Users 1:N User_Tokens
- Users 1:N Favorites
- Users 1:N User_Views_Log
- Market_Items 1:N Market_Item_Prices
- Market_Items 1:N Favorites
- Market_Items 1:N User_Views_Log

사용자 또는 상품이 물리 삭제될 때 관계 테이블의 고아 데이터를 남기지 않도록 FK에 `ON DELETE CASCADE`를 적용한다. Users는 법적·운영 보존기간을 고려해 물리 삭제보다 `deletedAt` 기반 논리 삭제를 우선한다.

## 6. 마이그레이션 및 백필 정책

1. Expand: Prisma migration으로 nullable 정식 컬럼·인덱스·감사 컬럼을 무중단 추가한다.
2. Backfill: 최신 크롤러로 전체 594개 카테고리를 재수집해 기존 상품을 `goodsNo` 기준 upsert한다.
3. Verify: 필수값 누락과 CHECK 위반 후보가 0건인지 검증한다.
4. Contract: `prisma/post_backfill/20260719091000_enforce_market_item_constraints.sql`을 실행해 NOT NULL과 CHECK를 강제한다.
5. 기존 JSON 값은 Expand 단계에서 가능한 항목만 일회성 이관하고, `searchKeywords`는 즉시 검색 문자열로 되돌린다.

운영 DB 점검 당시 기존 `Market_Items` 7,350건 모두 `species`와 `storageType`이 비어 있었으므로 Expand와 Backfill 없이 Contract SQL을 먼저 실행해서는 안 된다.
