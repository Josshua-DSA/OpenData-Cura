import assert from "node:assert/strict";
import { register } from "node:module";

register("./alias-loader.mjs", import.meta.url);

delete process.env.GEMINI_API_KEY;

const { POST } = await import("../src/app/api/v1/ask/route.ts");
const { getAllEnrichedRegions, buildRankings } = await import("../src/lib/regionDetector.ts");

const regions = getAllEnrichedRegions();
const regionByName = new Map(regions.map((region) => [region.name, region]));
const OUT_OF_SCOPE =
  "Maaf, saya hanya dapat membantu pertanyaan seputar data kesehatan Jawa Timur di Tilik Jatim, seperti wilayah prioritas, beban penyakit, fasilitas, skor kesehatan, stunting, dan rekomendasi program.";

let passed = 0;
let failed = 0;

async function ask(query, history = []) {
  const response = await POST(
    new Request("http://localhost/api/v1/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, history }),
    })
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.success, true);
  return payload.data.answer;
}

function check(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`PASS: ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL: ${name}`);
    console.log(`  ${error.message}`);
  }
}

function parseValue(value) {
  return Number(value.split(" ")[0].replace("%", "").replace(",", "."));
}

function parseBlocks(answer) {
  const starts = [...answer.matchAll(/(?:^|\n\n)Wilayah dengan /g)].map((match) =>
    match.index === 0 ? 0 : match.index + 2
  );

  return starts.map((start, index) => {
    const end = index + 1 < starts.length ? starts[index + 1] - 2 : answer.length;
    const chunk = answer.slice(start, end).trim();
    const items = [...chunk.matchAll(/^(\d+)\. (.+?): (.+)\.$/gm)].map((match) => ({
      rank: Number(match[1]),
      name: match[2],
      value: match[3],
    }));
    return { chunk, items };
  });
}

function assertFormat(answer) {
  assert.doesNotMatch(answer, /[*#`_~]/);
  assert.doesNotMatch(answer, /[—–]/);
  assert.doesNotMatch(answer, /\s-\s/);
  assert.doesNotMatch(answer, /Cura|HealthTrust|Gemini/i);
  const words = answer.trim().split(/\s+/).length;
  assert.ok(words <= 250, `Jawaban ${words} kata, melebihi batas 250`);
}

function assertOrder(items, order, valueOf) {
  for (let index = 1; index < items.length; index += 1) {
    const previous = valueOf(regionByName.get(items[index - 1].name));
    const current = valueOf(regionByName.get(items[index].name));
    if (order === "desc") {
      assert.ok(previous >= current, `Urutan turun salah di posisi ${index + 1}`);
    } else {
      assert.ok(previous <= current, `Urutan naik salah di posisi ${index + 1}`);
    }
  }
}

const answer1 = await ask("sebutkan 5 daerah dengan kritis tertinggi dan terendah");
check("1. Kritis tertinggi dan terendah menghasilkan dua blok berisi lima wilayah", () => {
  const blocks = parseBlocks(answer1);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].items.length, 5);
  assert.equal(blocks[1].items.length, 5);
  assert.match(blocks[0].chunk, /Klaster Critical/i);
  assert.match(blocks[1].chunk, /Klaster Critical/i);
  for (const block of blocks) {
    for (const item of block.items) {
      const region = regionByName.get(item.name);
      assert.ok(region, `Wilayah ${item.name} tidak ada di data`);
      assert.ok(region.bedRatio < 0.75, `${item.name} bukan klaster Critical`);
      assert.equal(parseValue(item.value), region.bedRatio);
    }
  }
  assertOrder(blocks[0].items, "desc", (region) => region.bedRatio);
  assertOrder(blocks[1].items, "asc", (region) => region.bedRatio);
  assertFormat(answer1);
});

const answer2 = await ask("stunting tertinggi dan terendah");
check("2. Stunting tertinggi dan terendah menghasilkan dua blok yang terverifikasi", () => {
  const blocks = parseBlocks(answer2);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].items.length, 5);
  assert.equal(blocks[1].items.length, 5);
  assert.match(blocks[0].chunk, /Prevalensi Stunting/i);
  assert.match(blocks[1].chunk, /Prevalensi Stunting/i);
  assertOrder(blocks[0].items, "desc", (region) => region.stunting);
  assertOrder(blocks[1].items, "asc", (region) => region.stunting);
  for (const block of blocks) {
    for (const item of block.items) {
      assert.equal(parseValue(item.value), regionByName.get(item.name).stunting);
    }
  }
  assertFormat(answer2);
});

const firstFollowUpAnswer = await ask("top 5 stunting tertinggi");
const secondFollowUpAnswer = await ask("kalau top 10 nya", [
  { role: "user", text: "top 5 stunting tertinggi" },
  { role: "model", text: firstFollowUpAnswer },
]);
check("3. Pertanyaan lanjutan mewarisi stunting dan mengubah N menjadi 10", () => {
  const blocks = parseBlocks(secondFollowUpAnswer);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].items.length, 10);
  assert.match(blocks[0].chunk, /Prevalensi Stunting/i);
  assert.doesNotMatch(blocks[0].chunk, /Skor Kesehatan/i);
  assertOrder(blocks[0].items, "desc", (region) => region.stunting);
  assertFormat(secondFollowUpAnswer);
});

const answer4 = await ask("stunting dan rasio tempat tidur terendah");
check("4. Dua indikator menghasilkan dua blok terendah yang terverifikasi", () => {
  const blocks = parseBlocks(answer4);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].items.length, 5);
  assert.equal(blocks[1].items.length, 5);
  const stuntingBlock = blocks.find((block) => /Prevalensi Stunting/i.test(block.chunk));
  const bedBlock = blocks.find((block) => /Rasio Tempat Tidur/i.test(block.chunk));
  assert.ok(stuntingBlock);
  assert.ok(bedBlock);
  assertOrder(stuntingBlock.items, "asc", (region) => region.stunting);
  assertOrder(bedBlock.items, "asc", (region) => region.bedRatio);
  assertFormat(answer4);
});

const tulungagungAnswer = await ask("rekomendasi program kabupaten Tulungagung");
const kotaKediriAnswer = await ask("rekomendasi program kota Kediri");
const kabupatenKediriAnswer = await ask("rekomendasi program kabupaten Kediri");
check("5. Rekomendasi wilayah menyebut wilayah yang benar dan membedakan kembar nama", () => {
  assert.match(tulungagungAnswer, /^Kabupaten Tulungagung\b/);
  assert.match(kotaKediriAnswer, /^Kota Kediri\b/);
  assert.match(kabupatenKediriAnswer, /^Kabupaten Kediri\b/);
  assert.notEqual(kotaKediriAnswer, kabupatenKediriAnswer);
  assertFormat(tulungagungAnswer);
  assertFormat(kotaKediriAnswer);
  assertFormat(kabupatenKediriAnswer);
});

const answer6 = await ask("top 3 wilayah yang perlu diperhatikan");
check("6. Prioritas perhatian tidak ditolak dan berisi tepat tiga wilayah", () => {
  const blocks = parseBlocks(answer6);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].items.length, 3);
  assert.match(answer6, /Skor Kesehatan/i);
  assertOrder(blocks[0].items, "asc", (region) => region.score);
  assertFormat(answer6);
});

const mathAnswer = await ask("1+1");
const recipeAnswer = await ask("resep nasi goreng");
check("7. Matematika dan resep ditolak dengan kalimat batas lingkup yang sama", () => {
  assert.equal(mathAnswer, OUT_OF_SCOPE);
  assert.equal(recipeAnswer, OUT_OF_SCOPE);
});

check("8. Semua blok peringkat memiliki jumlah dan urutan sesuai data sumber", () => {
  const queries = [
    "sebutkan 5 daerah dengan kritis tertinggi dan terendah",
    "stunting tertinggi dan terendah",
    "stunting dan rasio tempat tidur terendah",
    "top 3 wilayah yang perlu diperhatikan",
  ];
  for (const query of queries) {
    const rankings = buildRankings(query);
    assert.ok(rankings.length > 0);
    for (const ranking of rankings) {
      assert.equal(ranking.items.length, ranking.limit);
      assert.ok(ranking.limit <= 38);
      assert.match(ranking.rankingBlock, /^PERINGKAT \(.+?, .+?\)/);
      for (const item of ranking.items) {
        assert.equal(item.value, ranking.indicator.getValue(item.region));
      }
    }
  }
});

console.log(`\nHASIL: ${passed} lulus, ${failed} gagal`);
if (failed > 0) process.exitCode = 1;
