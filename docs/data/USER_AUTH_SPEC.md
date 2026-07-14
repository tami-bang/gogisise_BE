# 📄 [산출물 3] 사용자 인증 및 관리를 위한 API 명세서 (USER_AUTH_SPEC.md)

<!-- 신규 추가된 인증 API 및 유저 명세서 문서입니다. (관심사 분리 원칙 적용 및 보안 고도화) -->
- **디렉토리 구조**: `docs/data/USER_AUTH_SPEC.md`
- **개요**: 유저 인증(로그인, 회원가입), 프로필, 즐겨찾기 관리 및 로그 적재를 담당하는 독립적인 API 규격. 철저한 관심사 분리(SoC) 원칙과 상용 수준의 강력한 보안(Security First) 아키텍처를 적용함.

## 🏗 공통 규격

### 1. 공통 응답 구조 (Wrapper)
**성공 응답:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_auth_01J2xabcde",
    "servedAt": "2026-07-13T09:20:00+09:00"
  }
}
```

**에러 응답 (공통 에러 규격) 및 에러 노출 정책:**
HTTP 상태 코드와 내부 비즈니스 로직용 `errorCode`를 분리하여 프론트엔드에서 즉각적인 에러 처리가 가능하도록 설계한다.
**[보안 필수]** `500 INTERNAL_SERVER_ERROR` 등 서버 내부 예외 발생 시, 데이터베이스 쿼리나 스택 트레이스(Stack Trace)는 절대 클라이언트로 노출되지 않도록 서버에서 필터링(Sanitize)하며 클라이언트 노출용 `message`만 안전하게 반환한다. 내부 상세 로그는 백엔드 로깅 시스템에만 기록된다.
```json
{
  "success": false,
  "error": {
    "errorCode": "AUTHENTICATION_REQUIRED",
    "message": "로그인이 만료되었거나 권한이 없습니다. 다시 로그인해 주세요."
  },
  "meta": {
    "requestId": "req_err_02K3xxyz",
    "servedAt": "2026-07-13T09:21:00+09:00"
  }
}
```

### 2. 💡 엔터프라이즈급 인증 및 보안 원칙 (Security First)
- **메모리 기반 `accessToken` 및 CSRF 방어**: `accessToken`은 로컬스토리지에 저장하지 않고 **프론트엔드 메모리(Zustand 등)에만 보관**하여 XSS를 방어한다. 또한 쿠키 기반 공격(CSRF)을 막기 위해 API 요청 시 `Authorization: Bearer` 헤더 또는 별도의 `X-CSRF-Token` 검증 로직을 병행한다.
- **RTR (Refresh Token Rotation) 기법 적용**: `refreshToken`은 `HttpOnly, Secure, SameSite=Strict` 쿠키로 발급되며, 보안을 위해 1회용(Rotation)으로 설계된다. 사용될 때마다 새로운 리프레시 토큰이 발급되며 만약 탈취된 과거 토큰이 재사용될 경우, 서버는 즉시 해당 세션의 모든 토큰 연쇄(Family)를 무효화(Blacklist) 처리한다.
- **Rate Limiting & Account Lockout (브루트 포스 방어)**: 인증 관련 API(로그인, 이메일 찾기 등)는 비정상적인 반복 요청(크리덴셜 스터핑)을 막기 위해 클라이언트 IP 및 계정 기반으로 Rate Limit을 적용하며, 연속 실패 시 일정 시간 계정을 잠그고 `429 Too Many Requests` 또는 특정 에러 코드를 반환한다.

---

## 1. 🔐 인증 및 유저 (Auth & User)

<!-- 회원가입 관련 엔드포인트 명세 -->
### 1.1. 일반 회원가입
- **URL:** `/api/v1/auth/signup`
- **Method:** `POST`
- **설명:** 자체 회원가입. (가입 후 자동 로그인 처리 옵션)

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123!",
  "nickname": "고기마스터"
}
```

**Response Body (Data 부분):**
```json
{
  "success": true,
  "data": {
    "userId": "usr_001",
    "email": "user@example.com",
    "nickname": "고기마스터"
  },
  "meta": { ... }
}
```

<!-- 일반 로그인 및 쿠키 리프레시 토큰 셋팅 -->
### 1.2. 일반 로그인 및 자동 로그인 (Brute Force 방어 대상)
- **URL:** `/api/v1/auth/login`
- **Method:** `POST`
- **설명:** 로그인. 5회 이상 실패 시 계정 잠금 처리 유발. `autoLogin` 시 RTR 기반의 새 `refreshToken`을 쿠키로 셋팅.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123!",
  "autoLogin": true
}
```

**Response Body (Data 부분):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5c...",
    "expiresIn": 3600,
    "user": {
      "userId": "usr_001",
      "nickname": "고기마스터"
    }
  },
  "meta": { ... }
}
```
*(참고: HTTP 응답 헤더에 `Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict` 필수 포함)*

<!-- 소셜 로그인(다중 연동 구조 고려) -->
### 1.3. 카카오 소셜 로그인
- **URL:** `/api/v1/auth/kakao`
- **Method:** `POST`
- **설명:** 카카오 인증 코드 전달 시 백엔드에서 자체 JWT 발급. (DB 구조상 `User_Social_Accounts` 테이블에 연동 맵핑 생성)

**Request Body:**
```json
{
  "kakaoAccessToken": "qWeRtYuIoP1234567890"
}
```

**Response Body (Data 부분):**
```json
{
  "success": true,
  "data": { ... },
  "meta": { ... }
}
```

### 1.4. 토큰 재발급 (RTR 기법)
- **URL:** `/api/v1/auth/refresh`
- **Method:** `POST`
- **설명:** 쿠키의 `refreshToken`을 검증하고 새로운 `accessToken`과 **새로운 `refreshToken`**을 재발급(Rotation)한다. 탈취 토큰 재사용 감지 시 `401` 및 세션 무효화 처리.

**Request Body:** `{}`

**Response Body (Data 부분):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5c...",
    "expiresIn": 3600
  },
  "meta": { ... }
}
```

### 1.5. 로그아웃 (Blacklist 처리)
- **URL:** `/api/v1/auth/logout`
- **Method:** `POST`
- **설명:** 클라이언트 토큰 폐기 및 서버 측 Redis Blacklist에 토큰 세션을 등재하여 즉각적인 무효화를 수행한다.

**Request Body:** `{}`

**Response Body (Data 부분):**
```json
{
  "success": true,
  "data": null,
  "meta": { ... }
}
```

### 1.6. 내 프로필 조회
- **URL:** `/api/v1/users/me`
- **Method:** `GET`
- **설명:** 현재 사용자의 상세 프로필 정보 반환. (연동된 소셜 계정 목록 포함)

---

<!-- 계정 분실 대비 API -->
### 1.7. 이메일 찾기 (마스킹 처리 및 Rate Limit)
- **URL:** `/api/v1/auth/find-email`
- **Method:** `POST`
- **설명:** 휴대폰 등 본인 인증 기반으로 이메일 마스킹 반환. 무차별 대입 방지를 위해 분당 요청 횟수를 엄격히 제한(Rate Limit).

**Response Body (Data 부분):**
```json
{
  "success": true,
  "data": { "maskedEmail": "us***@example.com" },
  "meta": { ... }
}
```

### 1.8. 비밀번호 초기화 (Magic Link 기반)
- **URL:** `/api/v1/auth/send-reset-link`
- **Method:** `POST`
- **설명:** 평문 임시 비밀번호를 전송하는 대신, 기한(예: 30분)이 정해진 안전한 보안 링크(Magic Link)를 발송하여 사용자가 직접 브라우저에서 새 비밀번호를 설정하도록 유도한다. (중간자 공격 방지)

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response Body (Data 부분):**
```json
{
  "success": true,
  "data": { "message": "비밀번호 재설정 링크가 이메일로 발송되었습니다." },
  "meta": { ... }
}
```

---

## 2. ⭐️ 관심 부위 즐겨찾기 관리 (Favorites)
*(모든 API는 헤더에 `Authorization: Bearer {token}` 필수. 누락 시 표준 에러 반환)*

### 2.1. 내 즐겨찾기 목록 조회 (`GET /api/v1/users/me/favorites`)
### 2.2. 즐겨찾기 추가 (`POST /api/v1/users/me/favorites/{itemId}`) - HTTP 204
### 2.3. 즐겨찾기 삭제 (`DELETE /api/v1/users/me/favorites/{itemId}`) - HTTP 204

---

## 3. 📈 개인화 통계 (Analytics)

### 3.1. 품목 조회 로그 기록 (데이터 폭발 통제)
- **URL:** `/api/v1/analytics/view`
- **Method:** `POST`
- **설명:** 트래픽 스파이크로 인한 DB 부하를 막기 위해, 클라이언트(프론트엔드)에서는 **디바운싱(Debouncing)**을 적용해 일정 시간 머문 건만 전송한다. 백엔드는 이를 즉시 DB에 꽂지 않고 **Redis 인메모리에 버퍼링**한 뒤 배치 워커를 통해 Bulk 삽입한다.

**Request Body:**
```json
{
  "itemId": "beef-tenderloin-1pp-chilled"
}
```

**Response Body (Data 부분):**
```json
{
  "success": true,
  "data": null,
  "meta": { ... }
}
```

### 3.2. 자주 보는 품목 TOP 목록 조회 (`GET /api/v1/analytics/frequent-items`)
- **설명:** 유저의 버퍼링 적재된 로그 기반 TOP N 상품 응답.

---

## 4. 🚨 에러 코드 및 데이터 딕셔너리

### 에러 매트릭스
| HTTP 코드 | 내부 `errorCode` | 발생 상황 및 보안 정책 |
| --- | --- | --- |
| `400` | `INVALID_REQUEST_BODY` | 입력 양식 파라미터 미준수 |
| `401` | `AUTHENTICATION_REQUIRED` | 토큰 누락/만료. Blacklist 등재 시 즉각 반환 |
| `401` | `LOGIN_FAILED` | 로그인 정보 불일치 (내부 에러 상세 노출 절대 금지) |
| `403` | `FORBIDDEN_ACTION` | 권한 외 리소스 접근 |
| `404` | `USER_NOT_FOUND` / `ITEM_NOT_FOUND`| 리소스 존재하지 않음 |
| `409` | `DUPLICATE_EMAIL` | 회원가입 시 중복 이메일 |
| `429` | `TOO_MANY_REQUESTS` | **브루트 포스 방어**: 계정 잠금 임계치 초과 또는 Rate Limit 도달 시 반환 |
| `500` | `INTERNAL_SERVER_ERROR` | 서버 내부 에러 (클라이언트용 안전 메시지만 전송, 스택 트레이스 노출 방어) |

### 데이터 딕셔너리 (DB 정규화 반영: Users 다중 소셜 연동 구조)

| 테이블 명 | 필드 명 | 타입 | 필수 여부 | Nullable | 설명 및 제약조건 |
| --- | --- | --- | --- | --- | --- |
| **Users** | `userId` | string | 필수 | ❌ 불가 | 유저 마스터 고유 식별자 (PK) |
| **Users** | `email` | string | 필수 | ❌ 불가 | 마스터 계정 통합 이메일 (유니크) |
| **Users** | `password` | string | 선택 | ✅ 가능 | 단방향 해싱 암호 (자체 가입 유저용, 소셜 전용은 null) |
| **Users** | `nickname` | string | 필수 | ❌ 불가 | 사용자 화면 표시 닉네임 |
| **Users** | `status` | string | 필수 | ❌ 불가 | 계정 상태 (`ACTIVE`, `LOCKED`, `BANNED`) |
| **User_Social_Accounts**| `socialId` | string | 필수 | ❌ 불가 | 소셜 연동 고유 식별자 (PK) |
| **User_Social_Accounts**| `userId` | string | 필수 | ❌ 불가 | Users 테이블 외래키 (1:N 다중 연동 지원) |
| **User_Social_Accounts**| `provider` | string | 필수 | ❌ 불가 | 제공자 (`"KAKAO"`, `"GOOGLE"` 등) |
| **User_Social_Accounts**| `providerUid` | string | 필수 | ❌ 불가 | 해당 소셜 플랫폼 내의 유저 식별값 |
| **User_Tokens** | `tokenId` | string | 필수 | ❌ 불가 | RTR 대응 토큰 세션 식별자 (PK) |
| **User_Tokens** | `userId` | string | 필수 | ❌ 불가 | Users 테이블 외래키 |
| **User_Tokens** | `refreshToken` | string | 필수 | ❌ 불가 | 암호화된 리프레시 토큰 해시값 |
| **User_Tokens** | `isBlacklisted`| boolean| 필수 | ❌ 불가 | 강제 무효화 여부 (토큰 탈취 대응용) |
| **Favorites** | `favoriteId` | string | 필수 | ❌ 불가 | 즐겨찾기 고유 식별자 (PK) |
| **Favorites** | `userId` | string | 필수 | ❌ 불가 | Users 테이블 외래키 |
| **Favorites** | `itemId` | string | 필수 | ❌ 불가 | 시세 품목 식별자 |
| **User_Views_Log**| `logId` | string | 필수 | ❌ 불가 | 품목 열람 로그 식별자 (PK) |
| **User_Views_Log**| `userId` | string | 필수 | ❌ 불가 | Users 테이블 외래키 |
| **User_Views_Log**| `itemId` | string | 필수 | ❌ 불가 | 열람한 품목 식별자 |
| **User_Views_Log**| `viewedAt` | datetime| 필수 | ❌ 불가 | 해당 품목을 조회한 일시 |
