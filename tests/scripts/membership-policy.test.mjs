import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import ts from "typescript";
const source=await readFile(new URL("../../src/lib/membership-policy.ts",import.meta.url),"utf8");
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {previewPeriod}=await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
test("period preview clamps leap days from the original anchor without drift",()=>{
 for(const [months,anchor,today,start,end,previous] of [
  [6,"2026-01-01","2026-07-01","2026-07-01","2027-01-01","2026-01-01"],
  [1,"2024-01-31","2024-02-29","2024-02-29","2024-03-31","2024-01-31"],
  [1,"2026-01-31","2026-03-30","2026-02-28","2026-03-31","2026-01-31"],
  [5,"2026-01-31","2025-12-30","2025-08-31","2026-01-31","2025-03-31"],
  [1,"0099-01-31","0099-02-28","0099-02-28","0099-03-31","0099-01-31"],
 ]) assert.deepEqual(previewPeriod(months,anchor,today),{start,end,previous});
});
test("calendar preview rejects invalid policy dates and periods",()=>{
 for(const [months,anchor] of [[0,"2026-01-01"],[13,"2026-01-01"],[1.5,"2026-01-01"],[6,"2026-02-29"],[6,"0000-01-01"]]) assert.equal(previewPeriod(months,anchor),null);
});
