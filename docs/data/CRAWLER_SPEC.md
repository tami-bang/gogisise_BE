# 📄 [크롤러 전용 설계 명세서] CRAWLER_SPEC.md

- **디렉토리**: `gogisise_BE/docs/data/CRAWLER_SPEC.md`
- **연관 명세서**: `INTERNAL_RAW_SPEC.md` (BE 적재 API 규격)
- **최종 수정**: 2026-07-15
- **수정 이력**: 최초 작성

---

## 1. 📐 전체 데이터 파이프라인

```
[금천미트 공식 API]
        │
        │  GET /api/display/v1/displayCategory/getDispCtgList
        │  POST /api/goods/v1/goods/dispGoodsList (카테고리 × 페이지)
        ▼
[GeumcheonScraper]  ← scraper.py
 - API 호출 (재시도 3회 포함)
 - 필드 추출 및 타입 변환
 - Pydantic 스키마 검증
 - 필수 필드 누락 시 skip + 로그
        │
        │  유효한 레코드만 전달
        ▼
[CrawlerService]  ← main.py
 - 배치 누적 (100건 단위)
 - 전체 수집 완료 후 BE API 호출
        │
        │  POST /api/v1/internal/market/raw-records
        │  Header: x-api-key: {INTERNAL_API_KEY}
        ▼
[NestJS Backend]  ← gogisise_BE
 - 중복 처리 (DB 고유키 + createMany skipDuplicates)
 - 데이터 가공 (displayName, searchKeywords 등)
        │
        ▼
[Supabase PostgreSQL]
```

---

## 2. 🔒 API 응답 필드 매핑 테이블

| 금천미트 API 필드 | 타입 | 내부 규격 필드 | 타입 | 변환 규칙 |
|---|---|---|---|---|
| `artcNm` | str | `rawProductName` | str | 원문 그대로. 없으면 `goodsNm` 대체 |
| `salePrc` | int | `price` | int | `int()` 강제 변환. 0이면 skip |
| `lsspeNm` | str | `species` | str | `"한우"/"육우"→"BEEF"`, `"한돈"→"PORK"`. 매핑 실패 시 skip |
| `strgMthdGbCd` | str | `storageType` | str | `"1"→"CHILLED"`, `"2"→"FROZEN"`. 그 외 skip |
| `lsprdGrdNm` | str | `grade` | str \| null | 등급 없으면 `None` 허용 |
| `mage` | str \| int | `ageInMonths` | int \| null | BEEF만 `int()` 변환. PORK는 `None` 고정. `"0"`이면 `None` |
| *(실행 시점)* | - | `collectedAt` | str | 크롤러 실행 시각 (KST ISO 8601) |
| *(고정)* | - | `sourceName` | str | `"GEUMCHEON"` 고정 |

---

## 3. 🚦 안정성 규칙 (The Rules)

### 3-1. 필수 필드 검증 (Skip 정책)

아래 조건 중 하나라도 해당하면 해당 레코드를 **조용히 skip**하고 WARN 로그를 남긴다.
코드를 멈추지 않는다.

| 조건 | 처리 |
|---|---|
| `rawProductName`이 비어있음 (`""` 또는 `None`) | skip |
| `price`가 0 이하이거나 `None` | skip |
| `species` 매핑 실패 (한우/한돈 외의 값) | skip |
| `storageType` 매핑 실패 (코드 1/2 외) | skip |
| `species == "BEEF"` 이고 `ageInMonths`가 파싱 불가 | `ageInMonths = None`으로 허용 (skip 안 함) |

### 3-2. API 장애 대응 (Retry 정책)

- **재시도 횟수**: 최대 **3회**
- **재시도 간격**: 첫 실패 후 `1초`, 두 번째 실패 후 `3초` (최대 3회 시도)
- **3회 모두 실패 시**: 해당 카테고리 skip + ERROR 로그 기록. 다음 카테고리 계속 진행.
- **전체 카테고리 수집 후 수집된 레코드가 0건이면**: BE API 호출 중단 + CRITICAL 로그

### 3-3. 속도 제한 (Rate Limit)

- 카테고리 간 요청: `time.sleep(0.5)` (0.5초 대기)
- 페이지 간 요청: `time.sleep(0.3)` (0.3초 대기)
- 목적: 금천미트 서버 부하 최소화 및 IP 차단 방지

### 3-4. 중복 처리 정책

- 동일 수집 세션 내 `(rawProductName, price, species)` 기준 중복은 크롤러에서 제거한다.
- 전달 재시도에 따른 중복은 BE DB의 `uk_raw_records_ingestion` 고유키와
  `skipDuplicates`에 위임한다.
- 수집 시각이 다른 동일 상품은 시계열 원본이므로 새 행으로 저장한다.

### 3-5. 인코딩 및 타입 강제 규칙

| 항목 | 규칙 |
|---|---|
| 문자 인코딩 | 모든 문자열: UTF-8 강제 |
| 가격 | `int()` 변환. 실패 시 skip |
| 월령 | `int()` 변환. 실패 시 `None` (skip 아님) |
| 날짜 | `datetime.datetime.now(tz=KST).isoformat()` 고정 |
| 빈 문자열 | `""` → `None`으로 정규화 후 필수 여부 판단 |

---

## 4. 📊 Pydantic 스키마 정의 (models.py)

```python
# crawler/models.py 핵심 구조
class RawRecord(BaseModel):
    sourceName:     str           # "GEUMCHEON" 고정
    collectedAt:    datetime      # timezone 포함 ISO 8601 KST로 직렬화
    rawProductName: str           # 상품명 원문 (필수, 비어있으면 안 됨)
    price:          int           # 1kg당 단가 (원), 1 이상
    species:        Literal["BEEF", "PORK"]
    storageType:    Literal["CHILLED", "FROZEN"]
    grade:          Optional[str] # 1++/1+/1/2/3/등외 or None
    ageInMonths:    Optional[int] # BEEF만 정수, PORK는 None

class BulkPayload(BaseModel):
    records: List[RawRecord]      # BE API 전송 단위 (1~100건)
```

---

## 5. 🚀 배치 실행 정책

| 항목 | 값 |
|---|---|
| 실행 주기 | 매일 새벽 03:00 KST (Vercel Cron / 외부 스케줄러) |
| 단위 배치 크기 | 100건 씩 BE API 전송 |
| 페이지당 수집 수 | 100건 (`pageSize=100`) |
| 타임아웃 | API 요청 당 15초 |
| 전체 예상 소요시간 | 전체 카테고리 기준 약 2~5분 |

---

## 6. 🗂 크롤러 디렉토리 구조

```
crawler/
├── main.py          # FastAPI 서버 + 배치 실행 엔드포인트
├── scraper.py       # 금천미트 API 호출 + 데이터 변환
├── models.py        # Pydantic 스키마 정의 (단일 진실 공급원)
├── config.py        # 환경변수 관리
├── requirements.txt # 의존성 목록
├── Dockerfile       # 컨테이너 배포
└── .env             # 로컬 전용 (gitignore)
```

---

## 7. ✅ 체크리스트 (구현 완료 기준)

- [x] 금천미트 API 연결 확인 (200 OK)
- [x] 핵심 필드 매핑 완성 (mage 직접 추출)
- [x] Pydantic 스키마 정의 (models.py)
- [x] Retry 로직 구현 (최대 3회 시도)
- [x] Rate Limit 적용 (0.5초 sleep)
- [x] Skip 정책 구현 (필수 필드 누락 시)
- [ ] 전체 카테고리 순회 검증
- [ ] BE API 연동 end-to-end 테스트
- [ ] 새벽 배치 스케줄러 등록
