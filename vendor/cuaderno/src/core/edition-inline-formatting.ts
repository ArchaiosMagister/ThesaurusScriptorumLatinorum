/** Cursivas explícitas en enunciados docentes, sin HTML ni formato oculto.
 * Una pareja de asteriscos alrededor de texto marca cursiva y se conserva
 * íntegra en NotebookEditionV1 para edición reversible.
 */
export interface InlineTextSegmentV1 {text:string;italic:boolean}
export function splitInlineItalics(input:string):InlineTextSegmentV1[]{
  const output:InlineTextSegmentV1[]=[];
  const pattern=/\*([^*\n]+)\*/gu;
  let pos=0,match:RegExpExecArray|null;
  while((match=pattern.exec(input))!==null){
    if(match.index>pos)output.push({text:input.slice(pos,match.index),italic:false});
    output.push({text:match[1]!,italic:true});
    pos=match.index+match[0].length;
  }
  if(pos<input.length)output.push({text:input.slice(pos),italic:false});
  return output;
}


/** Corchetes y omisiones editoriales en redonda; las restituciones latinas
 * conservan su cursiva. Los rangos se recortan después de reconocer las
 * omisiones en el texto completo, incluso si un subrayado las divide. */
export interface LatinOmissionSegmentV1 {text:string;roman:boolean}
export function splitLatinOmissions(input:string,start=0,end=input.length):LatinOmissionSegmentV1[]{
  const output:LatinOmissionSegmentV1[]=[];
  const pattern=/\[\s*(?:…|\.{3})\s*\]|[\[\]]/gu;
  const append=(from:number,to:number,roman:boolean):void=>{
    const a=Math.max(from,start),b=Math.min(to,end);
    if(a<b)output.push({text:input.slice(a,b),roman});
  };
  let pos=0,match:RegExpExecArray|null;
  while((match=pattern.exec(input))!==null){
    if(match.index>=end)break;
    append(pos,match.index,false);
    append(match.index,match.index+match[0].length,true);
    pos=match.index+match[0].length;
  }
  append(pos,input.length,false);
  return output;
}
