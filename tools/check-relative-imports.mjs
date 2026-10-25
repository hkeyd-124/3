#!/usr/bin/env node
/**
 * check-relative-imports.mjs
 *
 * Quet toan bo .js / .mjs / .html trong repo, resolve moi import tuong doi
 * theo VI TRI FILE (khong phai vi tri trang), va bao cao import nao tro toi
 * file khong ton tai.
 *
 * Ly do ton tai: js/profile.js tung goi import("./firebase.js") trong khi
 * firebase.js nam o GOC repo -> resolve thanh /js/firebase.js (404) -> import
 * throw -> catch nuot loi -> tra "" -> avatar/cover am tham roi ve base64.
 * Loi nay lot qua 3 vong review (PR #30, #31, #32) vi khong ai chay import()
 * that; chi doc code va so hash thi khong thay duoc.
 *
 * Usage:  node tools/check-relative-imports.mjs [--root <dir>]
 * Exit:   0 = khong co import hong, 1 = co import hong
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve, extname, relative } from "node:path";

const SKIP_DIRS = new Set([
  "node_modules", ".git", ".skills", "dist", "build", ".vercel", "coverage",
]);
const EXTS = new Set([".js", ".mjs", ".html"]);

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, out);
    else if (EXTS.has(extname(name))) out.push(p);
  }
  return out;
}

/**
 * Blank out comments while PRESERVING byte offsets and newlines, so a spec
 * mentioned inside a comment (e.g. this file's own doc block) is not reported
 * as a real import, and reported line numbers stay correct.
 */
function stripComments(text) {
  const blank = (s) => s.replace(/[^\n]/g, " ");
  let out = text.replace(/\/\*[\s\S]*?\*\//g, blank);
  out = out.replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, p1) => p1 + blank(m.slice(p1.length)));
  return out;
}

function extractSpecs(file, rawText) {
  const specs = [];
  const ext = extname(file);
  const text = stripComments(rawText);
  const add = (raw, idx) => {
    if (typeof raw !== "string") return;
    const spec = raw.split("?")[0].split("#")[0];
    if (!spec.startsWith("./") && !spec.startsWith("../")) return;
    specs.push({ spec, line: rawText.slice(0, idx).split("\n").length });
  };
  const patterns = ext === ".html"
    ? [
        /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi,
        /\b(?:import|export)\b[^;]*?\bfrom\s*["']([^"']+)["']/g,
        /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
      ]
    : [
        /\b(?:import|export)\b[^;]*?\bfrom\s*["']([^"']+)["']/g,
        /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
        /\bimport\s*["']([^"']+)["']/g,
      ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text))) add(m[1], m.index);
  }
  return specs;
}

function resolves(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  const cands = [
    base,
    base + ".js",
    base + ".mjs",
    join(base, "index.js"),
    join(base, "index.mjs"),
  ];
  for (const c of cands) {
    try { if (existsSync(c) && statSync(c).isFile()) return true; } catch { /* ignore */ }
  }
  return false;
}

const rootIdx = process.argv.indexOf("--root");
const root = resolve(rootIdx !== -1 ? process.argv[rootIdx + 1] : process.cwd());

const files = walk(root);
let checked = 0;
const broken = [];

for (const f of files) {
  let text;
  try { text = readFileSync(f, "utf8"); } catch { continue; }
  for (const { spec, line } of extractSpecs(f, text)) {
    checked++;
    if (!resolves(f, spec)) {
      broken.push({
        file: relative(root, f),
        line,
        spec,
        target: relative(root, resolve(dirname(f), spec)),
      });
    }
  }
}

console.log(`scanned files    : ${files.length}`);
console.log(`relative imports : ${checked}`);
console.log(`broken           : ${broken.length}`);
if (broken.length) {
  console.log("");
  for (const b of broken) {
    console.log(`  BROKEN  ${b.file}:${b.line}  ->  ${b.spec}   (resolves to ${b.target}, does not exist)`);
  }
  process.exit(1);
}
console.log("OK - every relative import resolves to an existing file.");
