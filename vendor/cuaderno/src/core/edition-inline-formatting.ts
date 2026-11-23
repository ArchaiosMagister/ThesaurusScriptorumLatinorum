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


/** Las omisiones editoriales entre corchetes no son latín: deben ir en
 * redonda incluso dentro de un pasaje presentado íntegramente en cursiva.
 * No altera los offsets UTF-16 de subrayados ni el texto persistido. */
export interface LatinOmissionSegmentV1 {text:string;roman:boolean}
export function splitLatinOmissions(input:string):LatinOmissionSegmentV1[]{
  const output:LatinOmissionSegmentV1[]=[];
  const pattern=/\[\s*(?:…|\.{3})\s*\]/gu;
  let pos=0,match:RegExpExecArray|null;
  while((match=pattern.exec(input))!==null){
    if(match.index>pos)output.push({text:input.slice(pos,match.index),roman:false});
    output.push({text:match[0],roman:true});
    pos=match.index+match[0].length;
  }
  if(pos<input.length)output.push({text:input.slice(pos),roman:false});
  return output;
}
