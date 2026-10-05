const fs=require('node:fs'),path=require('node:path');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
const vi=/[À-ỹĐđ]/u;
const strings=new Set();
for(const file of ['components/hoanxu.tsx','components/admin.tsx','components/ui.tsx','lib/api.ts']){
 const source=ts.createSourceFile(file,fs.readFileSync(path.join(root,'src',file),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(n){
  if(ts.isStringLiteral(n)&&vi.test(n.text))strings.add(n.text);
  if(ts.isJsxText(n)){const s=n.text.replace(/\s+/g,' ').trim();if(vi.test(s))strings.add(s)}
  ts.forEachChild(n,visit);
 }visit(source);
}
const backend=new Set();
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory())walk(p);else if(item.name.endsWith('.go')&&!item.name.endsWith('_test.go')){const text=fs.readFileSync(p,'utf8');for(const match of text.matchAll(/"([^"\n]*[À-ỹĐđ][^"\n]*)"/gu)){if(!match[1].includes('json:'))backend.add(match[1]);}}}}
if(process.env.BACKEND_REPO_DIR)walk(path.join(path.resolve(process.env.BACKEND_REPO_DIR),'internal'));
fs.mkdirSync(path.join(root,'private-data'),{recursive:true});
fs.writeFileSync(path.join(root,'private-data/i18n-inventory.json'),JSON.stringify({frontend:[...strings].sort(),backend:[...backend].sort()},null,2));
console.log(JSON.stringify({frontend:[...strings].sort(),backend:[...backend].sort()},null,2));
