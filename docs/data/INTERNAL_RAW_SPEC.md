# 📄 [산출물 1] 내부 데이터 적재용 API 명세서 (INTERNAL_RAW_SPEC.md)

- **디렉토리 구조**: `docs/data/INTERNAL_RAW_SPEC.md`
- **개요**: 파이썬 크롤러가 새벽마다 수집한 날것의 금천미트 데이터를 내부 DB에 Bulk 적재하기 위한 전용 규격. (데이터 관점의 백엔드 배경 적재 CRUD 중 **Create**에 해당)

## 🏗 공통 규격

### 1. 공통 응답 구조 (Wrapper)
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_internal_bulk_01",
    "servedAt": "2026-07-13T03:00:05+09:00"
  }
}
```

### 2. 적재 데이터 수집 및 매핑 규칙
- **단일 소스 고정**: `sourceName`은 다중 도매처 로직을 배제하고 `"GEUMCHEON"`으로 고정한다.
- **원본 유지 및 월령 수집 의무화**: 적재 시점에는 40개월 이상 데이터도 탈락시키지 않고 원본 그대로 전부 수집한다. 단, `species`가 `"BEEF"`(한우 암소)인 레코드는 크롤러가 상품명(예: `... (38개월)`) 등에서 개월 수를 정규식으로 파싱하여 `ageInMonths`에 반드시 정수로 밀어 넣어야 한다. 한돈은 `null`로 처리한다.

---

## 1. 📂 금천미트 원본 실매물 벌크 적재 (새벽 배치 데이터 적재 - Create)

- **URL:** `/api/v1/internal/market/raw-records`
- **Method:** `POST`
- **설명:** 매일 새벽 파이썬 크롤러가 금천미트 날것의 매물을 수집하여 내부 적재 API로 대량 밀어 넣습니다. (Bulk Insert)

### Request Body:
```json
{
  "records": [
    {
      "sourceName": "GEUMCHEON",
      "collectedAt": "2026-07-13T03:00:00+09:00",
      "rawProductName": "[금천] 한우 암소 안심 1++ (38개월)",
      "price": 38000,
      "species": "BEEF",
      "storageType": "CHILLED",
      "grade": "1++",
      "ageInMonths": 38
    },
    {
      "sourceName": "GEUMCHEON",
      "collectedAt": "2026-07-13T03:00:00+09:00",
      "rawProductName": "[금천] 암퇘지 삼겹살",
      "price": 21000,
      "species": "PORK",
      "storageType": "CHILLED",
      "grade": null,
      "ageInMonths": null
    }
  ]
}
```

### Response Body:
```json
{
  "success": true,
  "data": {
    "totalReceived": 2,
    "insertedCount": 2,
    "failedCount": 0
  },
  "meta": {
    "requestId": "req_internal_bulk_01",
    "servedAt": "2026-07-13T03:00:05+09:00"
  }
}
```

---

## 2. 📊 데이터 딕셔너리 (Internal Raw)

| 필드 | 타입 | 필수 여부 | Nullable | 설명 및 제약조건 |
| --- | --- | --- | --- | --- |
| `sourceName` | string | 필수 | ❌ 불가 | 수집처 (`"GEUMCHEON"` 고정) |
| `collectedAt` | string | 필수 | ❌ 불가 | 크롤링 시각 (ISO 8601, `+09:00`) |
| `rawProductName` | string | 필수 | ❌ 불가 | 쇼핑몰에 등록된 날것의 상품명 전체 |
| `price` | integer | 필수 | ❌ 불가 | 1kg당 단가 (원) |
| `species` | string | 필수 | ❌ 불가 | 축종 (`"BEEF"` \| `"PORK"`) |
| `storageType` | string | 필수 | ❌ 불가 | 보관 상태 (`"CHILLED"` \| `"FROZEN"`) |
| `grade` | string | 선택 | ✅ 가능 | 수집된 등급 (한돈 등 없는 경우 null) |
| `ageInMonths` | integer | 선택 | ✅ 가능 | 월령 (개월 수). 한우 암소 필수, 한돈은 null. |
