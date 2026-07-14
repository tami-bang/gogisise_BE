# 📄 [산출물 4] 데이터베이스 ERD 명세서 (ERD_SPEC.md)

- **디렉토리 구조**: `docs/data/ERD_SPEC.md`
- **개요**: API 명세서를 기반으로 도출한 통합 데이터베이스 구조(ERD). 데이터 무결성과 상용 수준의 아키텍처(Audit, TTL, Partitioning)를 완벽히 반영함.

## 1. 🗄️ 테이블 목록 및 구조

### 1.1. 원본 데이터 관리 (Raw Data)
#### `Raw_Records` (원본 실매물 적재 테이블)
| 컬럼명 | 타입 | PK/FK/UK | Nullable | 설명 |
| --- | --- | --- | --- | --- |
| `rawRecordId` | UUID | PK | ❌ | 원본 실매물 고유 식별자 (gen_random_uuid()) |
| `sourceName` | VARCHAR | | ❌ | 수집처 (GEUMCHEON 고정) |
| `collectedAt` | DATETIME | | ❌ | 크롤링 시각 |
| `rawProductName` | VARCHAR | | ❌ | 쇼핑몰에 등록된 날것의 상품명 전체 |
| `price` | INT | | ❌ | 1kg당 단가 (원) |
| `species` | VARCHAR | | ❌ | 축종 (BEEF, PORK) |
| `storageType` | VARCHAR | | ❌ | 보관 상태 (CHILLED, FROZEN) |
| `grade` | VARCHAR | | ✅ | 수집된 등급 |
| `ageInMonths` | INT | | ✅ | 월령 (개월 수) |
| `createdAt` | DATETIME | | ❌ | 레코드 생성 일시 (Audit) |

### 1.2. 서비스 제공 데이터 (Served Data)
#### `Market_Items` (가공된 품목 마스터)
| 컬럼명 | 타입 | PK/FK/UK | Nullable | 설명 |
| --- | --- | --- | --- | --- |
| `itemId` | UUID | PK | ❌ | 품목 고유 식별자 (gen_random_uuid()) |
| `species` | VARCHAR | | ❌ | 축종 (BEEF, PORK) |
| `storageType` | VARCHAR | | ❌ | 보관 상태 (CHILLED, FROZEN) |
| `category` | VARCHAR | | ❌ | 부위 그룹명 |
| `displayName` | VARCHAR | | ❌ | 정제된 화면 표시명 |
| `grade` | VARCHAR | | ✅ | 등급 규격화 |
| `searchKeywords` | VARCHAR | | ❌ | 클라이언트 검색 인덱스용 문자열 |
| `currency` | VARCHAR | | ❌ | 통화 단위 (KRW) |
| `priceUnit` | VARCHAR | | ❌ | 가격 단위 (KRW_PER_KG) |
| `createdAt` | DATETIME | | ❌ | 생성 일시 (Audit) |
| `updatedAt` | DATETIME | | ❌ | 수정 일시 (Audit) |

#### `Market_Item_Prices` (품목별 일자별 시세 이력)
| 컬럼명 | 타입 | PK/FK/UK | Nullable | 설명 |
| --- | --- | --- | --- | --- |
| `priceId` | UUID | PK | ❌ | 가격 내역 고유 식별자 (gen_random_uuid()) |
| `itemId` | UUID | FK / UK1 | ❌ | Market_Items 외래키 |
| `marketDate` | DATE | UK1 | ❌ | 시세 기준일 (itemId와 함께 복합 고유키) |
| `price` | INT | | ✅ | 가공 평균가 |
| `previousPrice` | INT | | ✅ | 전일 가격 |
| `changeAmount` | INT | | ✅ | 가격 변동액 |
| `trendStatus` | VARCHAR | | ✅ | 추세 플래그 (UP, DOWN, UNCHANGED) |
| `highestPrice` | INT | | ✅ | 최고가 |
| `lowestPrice` | INT | | ✅ | 최저가 |
| `participantCount` | INT | | ✅ | 산출에 참여한 원본 매물 수 |
| `createdAt` | DATETIME | | ❌ | 생성 일시 (Audit) |

### 1.3. 회원 및 인증 관리 (Auth & Users)
#### `Users` (유저 마스터)
| 컬럼명 | 타입 | PK/FK/UK | Nullable | 설명 |
| --- | --- | --- | --- | --- |
| `userId` | UUID | PK | ❌ | 유저 마스터 고유 식별자 (gen_random_uuid()) |
| `email` | VARCHAR | UK | ❌ | 통합 이메일 (유니크) |
| `phone` | VARCHAR | UK | ❌ | **[기획반영]** 휴대폰 번호 (이메일 찾기 등 본인 인증용) |
| `password` | VARCHAR | | ✅ | 자체 가입용 해싱 암호 |
| `nickname` | VARCHAR | | ❌ | 닉네임 |
| `status` | VARCHAR | | ❌ | 계정 상태 (ACTIVE, LOCKED, BANNED) |
| `createdAt` | DATETIME | | ❌ | 가입 일시 (Audit) |
| `updatedAt` | DATETIME | | ❌ | 정보 수정 일시 (Audit) |
| `deletedAt` | DATETIME | | ✅ | **[Soft Delete]** 논리적 삭제(탈퇴) 일시 |

#### `User_Social_Accounts` (소셜 연동 정보)
| 컬럼명 | 타입 | PK/FK/UK | Nullable | 설명 |
| --- | --- | --- | --- | --- |
| `socialId` | UUID | PK | ❌ | 소셜 연동 고유 식별자 (gen_random_uuid()) |
| `userId` | UUID | FK | ❌ | Users 외래키 (1:N) |
| `provider` | VARCHAR | | ❌ | 제공자 (KAKAO 등) |
| `providerUid` | VARCHAR | | ❌ | 플랫폼 내 식별값 |
| `createdAt` | DATETIME | | ❌ | 연동 일시 (Audit) |

#### `User_Tokens` (RTR 토큰 세션)
| 컬럼명 | 타입 | PK/FK/UK | Nullable | 설명 |
| --- | --- | --- | --- | --- |
| `tokenId` | UUID | PK | ❌ | 토큰 세션 식별자 (gen_random_uuid()) |
| `userId` | UUID | FK | ❌ | Users 외래키 |
| `refreshToken` | VARCHAR | | ❌ | 암호화된 리프레시 토큰 |
| `isBlacklisted` | BOOLEAN | | ❌ | 강제 무효화 여부 |
| `expiresAt` | DATETIME | | ❌ | **[TTL 관리]** 만료 일시 (배치 삭제용) |
| `createdAt` | DATETIME | | ❌ | 발급 일시 (Audit) |

### 1.4. 유저 활동 이력 (User Activities)
#### `Favorites` (즐겨찾기)
| 컬럼명 | 타입 | PK/FK/UK | Nullable | 설명 |
| --- | --- | --- | --- | --- |
| `favoriteId` | UUID | PK | ❌ | 즐겨찾기 식별자 (gen_random_uuid()) |
| `userId` | UUID | FK / UK1 | ❌ | Users 외래키 |
| `itemId` | UUID | FK / UK1 | ❌ | Market_Items 외래키 (userId와 함께 복합 고유키) |
| `createdAt` | DATETIME | | ❌ | 즐겨찾기 추가 일시 (Audit) |

#### `User_Views_Log` (조회 이력)
| 컬럼명 | 타입 | PK/FK/UK | Nullable | 설명 |
| --- | --- | --- | --- | --- |
| `logId` | UUID | PK | ❌ | 조회 로그 식별자 (gen_random_uuid()) |
| `userId` | UUID | FK | ❌ | Users 외래키 |
| `itemId` | UUID | FK | ❌ | Market_Items 외래키 |
| `viewedAt` | DATETIME | | ❌ | **[Partition Key]** 조회 일시 (파티셔닝 및 아카이빙 기준) |

## 2. 🔗 테이블 간 관계 (Relationships)

1. **`Users` (1) ↔ `User_Social_Accounts` (N)**: 한 명의 사용자가 여러 개의 소셜 계정을 연동.
2. **`Users` (1) ↔ `User_Tokens` (N)**: 한 명의 사용자가 여러 디바이스에서 토큰 세션 보유.
3. **`Users` (1) ↔ `Favorites` (N)**: 한 명의 사용자가 여러 품목을 즐겨찾기 가능.
4. **`Market_Items` (1) ↔ `Favorites` (N)**: 하나의 품목이 여러 사용자의 즐겨찾기에 추가됨.
5. **`Users` (1) ↔ `User_Views_Log` (N)**: 한 명의 사용자가 여러 품목의 조회 로그를 남김.
6. **`Market_Items` (1) ↔ `User_Views_Log` (N)**: 하나의 품목이 여러 사용자에게 조회됨.
7. **`Market_Items` (1) ↔ `Market_Item_Prices` (N)**: 하나의 품목이 날짜별로 여러 개의 가격 산출 이력을 가짐.

## 3. 🛡️ 무결성 및 인덱싱 정책 (Data Integrity & Indexing)

1. **복합 고유키 (Composite Unique Key) 제약조건 설정**
   - **`Favorites`**: `(userId, itemId)`에 대해 UNIQUE 제약을 설정하여 한 명의 유저가 동일한 품목을 2번 이상 중복해서 즐겨찾기에 넣는 것을 DB 단에서 원천 차단합니다.
   - **`Market_Item_Prices`**: `(itemId, marketDate)`에 대해 UNIQUE 제약을 설정하여 특정 품목의 같은 날짜 시세가 중복으로 생성되는 무결성 훼손을 방지합니다.

2. **토큰 수명 관리 (TTL 및 Purge Policy)**
   - **`User_Tokens.expiresAt`**: 해당 컬럼을 기준으로 RDBMS의 내장 이벤트 스케줄러(Event Scheduler) 또는 별도의 배치(Batch) 잡을 통해 유효기간이 지난 토큰들을 주기적으로 물리 삭제(Purge)하여 스토리지 낭비와 조회 성능 저하를 방지합니다.

3. **무한 적재 방지 및 쿼리 최적화 (Partitioning)**
   - **`User_Views_Log`**: 데이터 폭발을 방지하고 빠른 조회를 유지하기 위해 `viewedAt` 컬럼을 기준으로 **월별 파티셔닝(Monthly Partitioning)**을 적용합니다. 3개월(또는 6개월)이 지난 과거 데이터 파티션은 로그성 데이터 보관 정책(Retention Policy)에 따라 백업 후 Drop 처리합니다.

4. **논리적 삭제 (Soft Delete)**
   - **`Users.deletedAt`**: 회원 탈퇴 시 데이터를 물리적으로 즉각 삭제(Hard Delete)하지 않고 `deletedAt`에 타임스탬프를 기록합니다. 이를 통해 복구 기간을 부여하고, 과거 결제나 로그 기록 등 연관 데이터가 고아(Orphan) 상태가 되는 것을 막습니다.

5. **감사 추적 (Audit Trail)**
   - 시스템의 투명한 추적과 운영 이슈 파악을 위해 핵심 엔티티(`Raw_Records`, `Market_Items`, `Users` 등)에 `createdAt`, `updatedAt` 필드를 기본 규격으로 구성하였습니다.

6. **외래키(FK) 연쇄 삭제 정책 (Cascade)**
   - 모든 외래키(FK) 관계에는 종속 데이터가 방치되는 고아(Orphan) 현상을 막기 위해 `ON DELETE CASCADE`를 명시적으로 적용합니다. 부모 데이터(예: Users)가 물리 삭제될 경우, 그 하위 데이터(`User_Tokens`, `User_Social_Accounts` 등)도 자동으로 함께 지워집니다. (기본적으로 `Soft Delete`를 우선하므로 실제 물리 삭제 시에만 작동합니다.)
