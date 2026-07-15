import urllib.request
import json
import ssl
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://gw.ekcm.co.kr/api/goods/v1/goods/dispGoodsList"
# Let's use 140101 (국내산 한우 암소 > 안심) or something. Let's just pass "14" and noDispCtgRegYn="N".
# The crawler used "dispCtgNoList": ["140101"] or whatever leafs were.
for ctg in ["140101", "140201", "310101", "310201"]:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Content-Type": "application/json"}, data=json.dumps({"dispCtgNoList": [ctg], "pageNo": 1, "pageSize": 1}).encode("utf-8"))
    with urllib.request.urlopen(req, context=ctx) as res:
        data = json.loads(res.read().decode("utf-8"))
        payload = data.get("payload", [])
        if isinstance(payload, dict):
            items = payload.get("list") or payload.get("items") or payload.get("goodsList") or []
        else: items = payload
        if items:
            print(json.dumps(items[0], ensure_ascii=False, indent=2))
            break
