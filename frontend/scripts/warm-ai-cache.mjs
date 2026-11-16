const base = process.env.WARM_BASE_URL || "http://localhost:3001";
const res = await fetch(`${base}/api/v1/ask/warm`);
const json = await res.json();
console.log(JSON.stringify(json, null, 2));
