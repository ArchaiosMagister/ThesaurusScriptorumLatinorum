import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { extractNationalPdfPages } from './pau-national-pdf.js';
import { recognizeNationalExam } from './pau-national-profiles.js';

const [folder]=process.argv.slice(2);
if (!folder) throw Error('Indica el directorio local donde se extrajo el corpus.');
const assetRoot=new URL('../node_modules/pdfjs-dist/',import.meta.url).pathname;
const results={};
for (const name of (await readdir(folder)).filter(name=>/\.pdf$/iu.test(name)).sort()) {
  const file=new Blob([await readFile(join(folder,name))]);
  try {
    const extraction=await extractNationalPdfPages(file,{pdfjs,assetRoot});
    results[name]={textPages:extraction.pages.filter(rows=>rows.length).length,
      pages:extraction.pages.length,...recognizeNationalExam(extraction)};
  } catch (error) {
    results[name]={error:error.message,records:[]};
  }
}
console.log(JSON.stringify(results,null,2));
