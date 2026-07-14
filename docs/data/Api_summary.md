# 고기시세 API 명세 요약

지금까지 구현된 모든 API (Market, Users, Internal, Auth, Analytics)의 URL, Method, 핵심 DTO 예시를 정리한 표입니다.

| Category | Method | URL | Description | DTO / Request Body Example |
| :--- | :--- | :--- | :--- | :--- |
| **Market** | `GET` | `/api/v1/market/items` | 전체 축산물 품목 목록 조회 | `category`, `species` 등 쿼리 파라미터 |
| **Market** | `GET` | `/api/v1/market/items/:itemId/calculations` | 특정 품목 시세 계산 (원가, 마진 등) | `weight`, `margin` 등 쿼리 파라미터 |
| **Market** | `GET` | `/api/v1/market/items/:itemId/price-history` | 특정 품목 시세 추이 조회 | `startDate`, `endDate` 쿼리 파라미터 |
| **Users** | `GET` | `/api/v1/users/me` | 내 프로필 조회 | *None (Requires Auth Token)* |
| **Users** | `GET` | `/api/v1/users/me/favorites` | 내 즐겨찾기 목록 조회 | *None (Requires Auth Token)* |
| **Users** | `POST` | `/api/v1/users/me/favorites/:itemId` | 즐겨찾기 항목 추가 | *None (Requires Auth Token)* |
| **Users** | `DELETE`| `/api/v1/users/me/favorites/:itemId` | 즐겨찾기 항목 삭제 | *None (Requires Auth Token)* |
| **Internal** | `POST` | `/api/v1/internal/market/raw-records` | 외부 데이터 수집 및 등록용 내부 API | `{ "source": "ekapepia", "data": [...] }` (Needs Internal Key) |
| **Auth** | `POST` | `/api/v1/auth/signup` | 이메일/비밀번호 회원가입 | `{ "email": "...", "password": "...", "nickname": "..." }` |
| **Auth** | `POST` | `/api/v1/auth/login` | 이메일/비밀번호 로그인 | `{ "email": "...", "password": "..." }` |
| **Auth** | `POST` | `/api/v1/auth/kakao` | 카카오 소셜 로그인 | `{ "authorizationCode": "..." }` |
| **Auth** | `POST` | `/api/v1/auth/refresh` | Access Token 재발급 | 쿠키 기반 Refresh Token 사용 |
| **Auth** | `POST` | `/api/v1/auth/logout` | 로그아웃 (Refresh Token 무효화) | 쿠키 기반 Refresh Token 사용 |
| **Auth** | `POST` | `/api/v1/auth/find-email` | 가입된 이메일 찾기 | `{ "nickname": "..." }` |
| **Auth** | `POST` | `/api/v1/auth/send-reset-link`| 비밀번호 초기화 링크 전송 | `{ "email": "..." }` |
| **Analytics**| `POST` | `/api/v1/analytics/view` | 조회 이력(조회수) 기록 수집 | `{ "itemId": 1, "userId": 1 }` |
| **Analytics**| `GET` | `/api/v1/analytics/frequent-items`| 자주 찾는 품목 통계 조회 | `limit` 쿼리 파라미터 (기본 10) |
