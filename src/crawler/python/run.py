import sys
import json
import argparse
import asyncio
import logging

from scraper import GeumcheonScraper

# 로그 출력을 stderr로 변경하여 stdout에는 JSON 응답만 출력되도록 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stderr)]
)

async def main():
    parser = argparse.ArgumentParser(description="GeumcheonMeat Crawler CLI for NestJS integration")
    parser.add_argument("--action", choices=["peek", "crawl"], required=True, help="Action to perform")
    
    args = parser.parse_args()
    
    scraper = GeumcheonScraper()

    try:
        if args.action == "peek":
            # totalCount 가져오기
            counts = await asyncio.to_thread(scraper.peek_latest_metadata)
            output = {"success": True, "action": "peek", "data": counts}
            print(json.dumps(output, ensure_ascii=False))
            
        elif args.action == "crawl":
            # 전체 크롤링
            outcome = await asyncio.to_thread(scraper.scrape_all)
            # ScrapeOutcome 모델을 dict로 변환 (RawRecord 등 모두 포함)
            output = {
                "success": True,
                "action": "crawl",
                "data": outcome.model_dump(mode="json")
            }
            # stdout으로 json 덤프 출력
            print(json.dumps(output, ensure_ascii=False))
            
    except Exception as e:
        error_output = {"success": False, "action": args.action, "error": str(e)}
        print(json.dumps(error_output, ensure_ascii=False))
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
