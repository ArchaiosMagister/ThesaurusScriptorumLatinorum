/**
 * Render Chromium de la ruta real de impresión: renderNotebookPrintPages().
 * No genera HTML alternativo ni imágenes de la hoja. Safari usa window.print()
 * con el mismo árbol y las mismas reglas @media print.
 */
import { chromium } from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';

const base='http://127.0.0.1:4173';
const server=spawn(process.execPath,['scripts/serve-static.mjs'],{
  stdio:['ignore','pipe','pipe'],detached:false,
});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
  let ready=false;
  for(let i=0;i<45;i++){
    try{const r=await fetch(base);if(r.ok){ready=true;break;}}catch{}
    await sleep(300);
  }
  if(!ready)throw new Error('Servidor dist no disponible para auditar impresión.');
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1240,height:1100},deviceScaleFactor:1});
    for(const kind of ['breve','largo','varios']){
      const data=JSON.parse(await readFile('audit-output/'+kind+'.json','utf8'));
      await page.goto(base,{waitUntil:'networkidle'});
      await page.evaluate(async(edition)=>{
        const {renderNotebookPrintPages}=await import('/ui/edition-app.js');
        document.body.append(renderNotebookPrintPages(edition));
      },data);
      await page.emulateMedia({media:'print'});
      // Impresión física A4 + media queries nativas; no "screenshot to PDF".
      await page.pdf({path:'audit-output/'+kind+'-webkit-css-chromium.pdf',
        printBackground:true,preferCSSPageSize:true});
      await page.emulateMedia({media:'screen'});
      const info=await page.locator('.edition-print-root .edition-paper').count();
      if(info!==data.placements.length)throw new Error(kind+': número incorrecto de apariciones DOM');
      const foot=await page.locator('.edition-print-root .edition-paper-footer').first().evaluate(e=>{
        const style=getComputedStyle(e);
        return {screen:style.display,visibleText:e.textContent};
      });
      if(!foot.visibleText)throw new Error('Pie provisional de la vista ausente');
      await page.screenshot({path:'audit-output/'+kind+'-pantalla.png',fullPage:false});
      console.log(kind+': impresión Chromium basada en '+info+' apariciones; pie original: '+foot.visibleText);
    }
    await page.close();
  }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
