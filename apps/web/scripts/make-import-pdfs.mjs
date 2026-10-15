/* global document, console */
import { chromium } from "@playwright/test";
import fs from "node:fs";
// Run from apps/web: node scripts/make-import-pdfs.mjs (T-1401: the PDFs of the test sheets).
const dir = "../../fixtures/import";
const b = await chromium.launch();
const page = await b.newPage();
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
for (const name of ["morning-light", "lantern-bay-minor", "harbor-lights-bars"]) {
  const text = fs.readFileSync(`${dir}/${name}.txt`, "utf8");
  await page.setContent(
    `<pre style="font: 12px/1.4 'Courier New', monospace; margin: 0">${esc(text)}</pre>`,
  );
  await page.pdf({
    path: `${dir}/${name}.pdf`,
    format: "Letter",
    margin: { top: "54px", left: "54px", right: "54px", bottom: "54px" },
  });
}
// A scan: the same sheet drawn as a picture, with no text layer.
const text = fs.readFileSync(`${dir}/morning-light.txt`, "utf8");
await page.setContent(`<canvas id="c" width="900" height="900"></canvas>`);
const png = await page.evaluate((t) => {
  const c = document.getElementById("c");
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, 900, 900);
  g.fillStyle = "#000";
  g.font = "16px monospace";
  t.split("\n").forEach((line, i) => g.fillText(line, 20, 30 + i * 22));
  return c.toDataURL("image/png");
}, text);
await page.setContent(`<img src="${png}" style="width: 100%">`);
await page.pdf({ path: `${dir}/scanned-sheet.pdf`, format: "Letter" });
await b.close();
console.log(
  fs
    .readdirSync(dir)
    .map((f) => `${f} ${fs.statSync(`${dir}/${f}`).size}`)
    .join("\n"),
);
