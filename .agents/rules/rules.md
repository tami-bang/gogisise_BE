---
trigger: always_on
---

# 규칙 1
UI 컴포넌트 내부에서 직접 fetch나 axios를 호출하지 않는다.

# 규칙 2
모든 데이터 통신 로직은 반드시 src/api 폴더 내의 함수로 분리하여 작성한다.