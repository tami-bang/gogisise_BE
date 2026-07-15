"""Crawler-to-backend data contract.

This module is the single source of truth for payloads sent to the NestJS
internal ingestion endpoint. Source API values are normalized in scraper.py;
only normalized values are accepted here.
"""

from datetime import datetime, timedelta
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


KST_OFFSET = timedelta(hours=9)


class ContractModel(BaseModel):
    """Reject undeclared fields so an upstream schema change is visible."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class RawRecord(ContractModel):
    """One validated Geumcheon product record sent to the backend."""

    sourceName: Literal["GEUMCHEON"] = "GEUMCHEON"
    collectedAt: datetime
    rawProductName: str = Field(min_length=1, max_length=500)
    species: Literal["BEEF", "PORK"]
    gender: Literal["암소"] | None = None
    storageType: Literal["CHILLED", "FROZEN"]
    category: str = Field(min_length=1)
    brand: str = Field(min_length=1)
    qualityGrade: Literal["1++", "1+", "1", "2", "3", "등외"] | None = None
    yieldGrade: Literal["A", "B"] | None = None
    ageMonths: int | None = Field(default=None, ge=1, le=240)
    pricePerKg: int = Field(gt=0, strict=True)

    @field_validator("collectedAt")
    @classmethod
    def require_kst_timestamp(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("collectedAt must include a timezone offset")
        if value.utcoffset() != KST_OFFSET:
            raise ValueError("collectedAt must use the +09:00 KST offset")
        return value

    @model_validator(mode="after")
    def validate_species_age(self) -> "RawRecord":
        if self.species == "PORK" and self.ageMonths is not None:
            raise ValueError("ageMonths must be null for PORK")
        return self


class BulkPayload(ContractModel):
    """POST /api/v1/internal/market/raw-records request body."""

    records: list[RawRecord] = Field(min_length=1, max_length=100)


class CrawlResult(ContractModel):
    """Observable result of one crawl job."""

    totalFetched: int = Field(default=0, ge=0)
    validRecords: int = Field(default=0, ge=0)
    skippedRecords: int = Field(default=0, ge=0)
    sentToBackend: int = Field(default=0, ge=0)
    backendInserted: int = Field(default=0, ge=0)
    errors: list[str] = Field(default_factory=list)


class ScrapeOutcome(ContractModel):
    """Internal hand-off from scraper to delivery service."""

    records: list[RawRecord] = Field(default_factory=list)
    result: CrawlResult
