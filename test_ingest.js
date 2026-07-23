const axios = require('axios');

async function main() {
  const url = 'https://gogisise-be-ten.vercel.app/crawler/ingest';
  
  const payload = {
    data: [
      {
        category_path: "국내산 한우 > 냉장 > 설도",
        statistics: {
          avg_price: 10000,
          min_price: 10000,
          max_price: 10000,
          total_count: 1
        },
        items: [
          {
            name: "테스트설도",
            price: 10000,
            brand: "테스트",
            detail_url: "http://test.com",
            goodsNo: "99999999",
            metadata: {
              age: 30,
              grade: "2", // 일부러 400 에러 유발 가능한값 넣어봄
              mfg_date: "20260719",
              weight_kg: 1.0,
              sale_price: 10000,
              species: "BEEF",
              storage_type: "CHILLED"
            }
          }
        ]
      }
    ]
  };

  try {
    const res = await axios.post(url, payload);
    console.log("성공:", res.data);
  } catch (err) {
    if (err.response) {
      console.log("400 에러 바디:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message);
    }
  }
}

main();
