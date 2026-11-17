import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "src", "data");

const load = async (name) => JSON.parse(await fs.readFile(path.join(DATA, name), "utf8"));
const [companies, studies, sources, milestones, mrd, mrdPriceRanges] = await Promise.all([
  load("companies.json"),
  load("studies.json"),
  load("sources.json"),
  load("milestones.json"),
  load("mrd.json"),
  load("mrd-price-ranges.json"),
]);

const sourceIds = new Set(sources.map((source) => source.id));
const companyIds = new Set(companies.map((company) => company.id));

function assertUnique(values, label) {
  const seen = new Set();
  for (const value of values) {
    assert.equal(seen.has(value), false, `${label} 重复：${value}`);
    seen.add(value);
  }
}

test("ids are unique and every reference resolves", () => {
  assertUnique(companies.map((company) => company.id), "企业 id");
  assertUnique(studies.map((study) => study.id), "研究 id");
  assertUnique(sources.map((source) => source.id), "信源 id");
  assertUnique(milestones.map((milestone) => milestone.id), "里程碑 id");
  // 旧版证据页地址 /leaderboard/evidence/{企业}/{下标} 依赖这一对键。
  assertUnique(studies.map((study) => `${study.companyId}#${study.legacyIndex}`), "旧版研究下标");

  for (const study of studies) {
    assert.equal(companyIds.has(study.companyId), true, `${study.id} 指向未知企业 ${study.companyId}`);
    for (const id of study.sources) assert.equal(sourceIds.has(id), true, `${study.id} 指向未知信源 ${id}`);
  }
  for (const company of companies) {
    for (const status of company.statuses) {
      for (const id of status.sources) assert.equal(sourceIds.has(id), true, `${company.id} 报证节点指向未知信源 ${id}`);
    }
  }
  for (const milestone of milestones) {
    if (milestone.companyId) {
      assert.equal(companyIds.has(milestone.companyId), true, `${milestone.id} 指向未知企业`);
    }
    assert.ok(milestone.sources.length > 0, `${milestone.id} 没有信源`);
    for (const id of milestone.sources) assert.equal(sourceIds.has(id), true, `${milestone.id} 指向未知信源 ${id}`);
  }
});

test("every study cites at least one source", () => {
  for (const study of studies) assert.ok(study.sources.length > 0, `${study.id} 没有信源`);
});

test("a source is either a public https link or a document rebuilt inside the site", () => {
  for (const source of sources) {
    if (source.url) {
      const url = new URL(source.url);
      assert.equal(url.protocol, "https:", `${source.id} 不是 https 链接`);
      assert.equal(source.document, undefined, `${source.id} 同时有公开链接和重建页`);
    } else {
      assert.ok(source.document?.blocks?.length > 0, `${source.id} 既没有公开链接也没有重建内容`);
      assert.ok(source.document.origin, `${source.id} 的重建页缺少出处`);
    }
  }
});

test("no local file path or working note leaks into published data", async () => {
  const files = [
    ...[
      "companies.json",
      "studies.json",
      "sources.json",
      "milestones.json",
      "pathfinder.json",
      "mrd.json",
      "mrd-price-ranges.json",
      "mrd-institution-prices.json",
    ].map((name) =>
      path.join(DATA, name)
    ),
    path.join(ROOT, "public", "llms.txt"),
    path.join(ROOT, "public", "mced-skill", "SKILL.md"),
    path.join(ROOT, "public", "mced-skill", "README.md"),
  ];
  const forbidden = [
    /file:\/\//i,
    /\/Users\//,
    /[A-Za-z]:\\\\/,
    /BaiduSync|materials\//,
    /本地(文件|材料|路径)|基线/,
  ];
  for (const file of files) {
    const text = await fs.readFile(file, "utf8");
    for (const pattern of forbidden) {
      assert.doesNotMatch(text, pattern, `${path.relative(ROOT, file)} 含有 ${pattern}`);
    }
  }
});

test("every MRD product is identified, classified and sourced cell by cell", () => {
  assert.ok(mrd.length >= 12, "MRD 矩阵至少覆盖 12 个产品");
  assertUnique(mrd.map((product) => product.id), "MRD 产品 id");
  assert.ok(mrd.some((product) => product.self), "MRD 矩阵应包含本司锚定产品");

  const cited = (entry, label) => {
    assert.ok(entry.sources.length > 0, `${label} 没有信源`);
    for (const id of entry.sources) assert.equal(sourceIds.has(id), true, `${label} 指向未知信源 ${id}`);
  };

  for (const product of mrd) {
    const label = `MRD ${product.id}`;
    if (product.companyId) assert.equal(companyIds.has(product.companyId), true, `${label} 指向未知企业`);
    assert.ok(["solid", "heme"].includes(product.category), `${label} 类别无效`);
    assert.ok(["tumor-informed", "tumor-naive", "hybrid", "undisclosed"].includes(product.approach), `${label} 技术路径无效`);
    assert.ok(["国内", "国外"].includes(product.region), `${label} 地区无效`);
    assert.ok(["个体化 panel", "固定 panel", "WGS", "免疫受体测序", "数字 PCR", "未公开"].includes(product.tracking), `${label} 追踪方式无效`);
    // tumor-naive 不测组织；实体瘤 tumor-informed 必须说明组织测的是什么(血液肿瘤的克隆鉴定不是组织测序)。
    if (product.approach === "tumor-naive") assert.equal(product.tissue, null, `${label} tumor-naive 不应有组织测序`);
    else if (product.category === "solid") assert.ok(["WES", "WGS", "panel", "undisclosed"].includes(product.tissue), `${label} 缺少组织测序类型`);
    cited(product, `${label} 技术选型`);

    for (const entry of product.lod) {
      cited(entry, `${label} 检出限 ${entry.label}`);
      assert.ok(entry.label && entry.basis, `${label} 检出限缺少原文数值或口径`);
      assert.ok(["peer-reviewed", "regulator", "vendor"].includes(entry.evidence), `${label} 检出限出处分量无效`);
      // 量纲与数值同有同无：没有量纲的数值无法与任何产品比较。
      assert.equal(entry.scale === null, entry.value === null, `${label} 检出限量纲与数值不一致`);
      assert.ok([null, "vaf", "tf", "cells"].includes(entry.scale), `${label} 检出限量纲无效`);
    }
    for (const entry of product.clinical) {
      cited(entry, `${label} 临床研究 ${entry.study}`);
      assert.ok(entry.cancer && entry.setting && entry.study, `${label} 临床研究缺少癌种、场景或研究名`);
      assert.ok(
        entry.sensitivity || entry.specificity || entry.baselineDetection || entry.hazardRatio || entry.leadTime || entry.outcome,
        `${label} 临床研究 ${entry.study} 没有任何指标`
      );
    }
    for (const entry of product.statuses) cited(entry, `${label} 报证 ${entry.label}`);
    for (const entry of product.prices) {
      cited(entry, `${label} 价格`);
      assert.ok(entry.amount === null ? entry.label && entry.status === "historical" : entry.amount > 0, `${label} 价格必须为正数，历史区间须有原文标签`);
      assert.ok(["USD", "CNY", "EUR", "GBP", "JPY"].includes(entry.currency), `${label} 币种无效`);
      assert.ok(entry.basis && entry.covers && /^\d{4}(-\d{2})?$/.test(entry.asOf), `${label} 价格缺少性质、覆盖内容或时间`);
    }
  }
});

test("MRD coverage spans both approaches and both regions, and price ranges are sourced", () => {
  const solid = mrd.filter((product) => product.category === "solid");
  for (const approach of ["tumor-informed", "tumor-naive"]) {
    for (const region of ["国内", "国外"]) {
      assert.ok(
        solid.some((product) => product.approach === approach && product.region === region),
        `MRD 矩阵缺少 ${region} ${approach} 产品`
      );
    }
  }
  for (const assay of ["WES", "WGS", "panel"]) {
    assert.ok(solid.some((product) => product.tissue === assay), `MRD 矩阵缺少组织 ${assay} 路线`);
  }
  // 站内信源地址是 /sources/{id}：id 只用 ASCII。
  for (const source of sources) assert.match(source.id, /^[a-z0-9][a-z0-9-]*$/, `信源 id 含非法字符：${source.id}`);
  for (const range of mrdPriceRanges) {
    assert.ok(range.range && range.covers && /^\d{4}(-\d{2})?$/.test(range.asOf), "MRD 行业报价缺少区间、购买方式或时间");
    assert.ok(range.sources.length > 0, "MRD 行业报价没有信源");
    for (const id of range.sources) assert.equal(sourceIds.has(id), true, `MRD 行业报价指向未知信源 ${id}`);
  }
});

test("the skill checksum matches the file and the install command verifies it under the same name", async () => {
  const skill = await fs.readFile(path.join(ROOT, "public", "mced-skill", "SKILL.md"));
  const checksum = await fs.readFile(path.join(ROOT, "public", "mced-skill", "SKILL.md.sha256"), "utf8");
  assert.equal(checksum, `${createHash("sha256").update(skill).digest("hex")}  SKILL.md\n`);

  // shasum -c 按校验文件里的文件名找文件：下载时必须保留 SKILL.md 这个名字。
  const page = await fs.readFile(path.join(ROOT, "src", "components", "agent", "AgentTabs.tsx"), "utf8");
  assert.match(page, /-o "\$tmp\/SKILL\.md" /);
  assert.match(page, /\(cd "\$tmp" && shasum -a 256 -c SKILL\.md\.sha256\)/);
});
