/** Stable only for the same PDF bytes and the same source candidate. */
export async function nationalPassageId(digest, source) {
  if (!digest || !source) return 'doc.'+crypto.randomUUID();
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([digest,source])));
  return 'pau.national.'+Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('');
}

export async function appendNationalPassages(corpus, existing, records, {upsertText,validateCorpus,now}) {
  const ids=new Set([...corpus.texts,...existing.texts].map(text=>text.id));
  let next=corpus, duplicates=0, saved=0;
  const documents=new Map();
  for (const {doc,digest,source,community,year,session,model,option,notes} of records) {
    if (community==='Comunidad Valenciana') throw Error('Utiliza el importador PAU CV para esta comunidad.');
    const id=await nationalPassageId(digest,source||JSON.stringify([option,doc.latin]));
    if (ids.has(id)) { duplicates++; continue; }
    const selectividad={...(community&&{community}),...(year&&{year}),...(session&&{session}),
      ...(model&&{model}),...(option&&{option})};
    next=upsertText(next,{title:doc.title,latin:doc.latin,author:doc.author??'',
      work:doc.work??'',reference:doc.reference??'',notes,selectividad,courseIds:['2bach'],origin:{kind:'own'}},id,now);
    documents.set(id,{...doc,author:doc.author||null,work:doc.work||null,reference:doc.reference||null,nationalPau:true});
    ids.add(id);
    saved++;
  }
  if (saved) next=validateCorpus({...next,texts:next.texts.map(text=>documents.has(text.id)
    ? {...text,teacherDocx:documents.get(text.id)}
    : text)});
  return {corpus:next,saved,duplicates};
}
