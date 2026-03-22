const BASE = process.env.SEARCH_BASE_URL || "http://localhost:5000/api/v1/products";

const tests = [
  "?q=shoes",
  "?category=bags&maxPrice=500",
  "?minPrice=100&maxPrice=50",
  "?q=&category=",
];

async function run() {
  for (const t of tests) {
    try {
      const res = await fetch(`${BASE}${t}`);
      const json = await res.json().catch(() => ({}));
      const payload = json?.data?.pagination ?? json?.pagination ?? json?.error ?? json;
      console.log(`${t} -> ${res.status}`, payload);
    } catch (error) {
      console.log(`${t} -> failed`, error?.message || error);
    }
  }
}

run();
