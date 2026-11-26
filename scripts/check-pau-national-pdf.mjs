// Optional manual smoke test against locally downloaded official exams.
// node scripts/check-pau-national-pdf.mjs /path/to/latin_ii_pau_junio_2025.pdf
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { extractNationalPdfPages } from './pau-national-pdf.js';
import { scanCastillaLeonRows } from './pau-national-cyl.js';
const paths=process.argv.slice(2);
if(!paths.length)throw Error('Proporciona al menos un PDF oficial local.');
for(const path of paths){
  const bytes=await readFile(path);
  const {pages,warnings}=await extractNationalPdfPages({
    size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)
  },{pdfjs,assetRoot:new URL('../node_modules/pdfjs-dist/',import.meta.url).pathname});
  const scan=scanCastillaLeonRows(pages);
  console.log(JSON.stringify({file:basename(path),year:scan.year,community:scan.community,
    pages:pages.length,options:scan.options.map(o=>({option:o.option,author:o.author,work:o.work,rows:o.candidateRows.map(r=>r.text)})),
    sharedLexical:scan.sharedLexical,warnings:[...warnings,...scan.warnings]},null,2));
}
