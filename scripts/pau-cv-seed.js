// Migración aditiva, única y transaccional. Los textos siguen siendo propios y editables.
export const seedVersion = 1;
export const seedTimestamp = '2026-11-24T00:00:00.000Z';
export const seedCount = 88;
export const seedId = doc => 'pau.cv.' + doc.pauCv.toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/\.$/,'');
const identity = value => String(value ?? '').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const comparable = value => identity(value).replace(/\bextraordinaria\b/g,'julio').replace(/\bordinaria\b/g,'junio');
export function pauCvIdentity(text) {
  const raw = text.teacherDocx?.pauCv;
  if (typeof raw === 'string' && /^\d{4}\s+.+\s*\/\s*[AB]$/iu.test(raw)) return comparable(raw);
  if (!text.selectividad) return '';
  const note = /^PAU CV\s*·\s*(.+?)\s+(\d{4})\s*·\s*Opción\s+([AB])\b/iu.exec(text.notes ?? '');
  return note ? comparable(note[2]+' '+note[1]+' / '+note[3]) : '';
}
export function prepareSeed(corpus, existingTexts, records, validate) {
  if (corpus.pauCvSeedVersion >= seedVersion || !records.length) return corpus;
  if (records.length !== seedCount) throw new Error('El banco PAU CV está incompleto.');
  const identities = new Set(existingTexts.map(pauCvIdentity).filter(Boolean));
  const ids = new Set(existingTexts.map(t=>t.id));
  const entries=[];
  for(const {doc,year,notes} of records){
    const id=seedId(doc),key=pauCvIdentity({teacherDocx:doc});
    // Exact exam identity is enough: never overwrite a manually edited import.
    if(ids.has(id)||identities.has(key))continue;
    entries.push({id,title:doc.title,latin:doc.latin,
      source:{author:doc.author,work:doc.work,reference:doc.reference},
      notes,tagIds:[],createdAt:seedTimestamp,updatedAt:seedTimestamp,
      origin:{kind:'own'},courseIds:['2bach'],selectividad:{year,community:'Comunidad Valenciana'},teacherDocx:doc});
    ids.add(id);identities.add(key);
  }
  return validate({...corpus,texts:[...corpus.texts,...entries],pauCvSeedVersion:seedVersion});
}
export async function installPauCvSeed({repo,loadCombinedCorpus,validateCorpus,fetchRecords=async()=>{
  const response=await fetch(new URL('./atl-pau-cv-seed.json',import.meta.url));
  if(!response.ok)throw Error('No se ha podido cargar el banco PAU CV.');
  return response.json();
}}){
  const initial=await repo.load();
  if(initial.corpus.pauCvSeedVersion>=seedVersion)return false;
  const records=await fetchRecords();
  if(!Array.isArray(records))throw Error('El banco PAU CV no es válido.');
  // Read again after the asynchronous download, and never replace a concurrent edit.
  for(let attempt=0;attempt<3;attempt++){
    const current=await repo.load();
    if(current.corpus.pauCvSeedVersion>=seedVersion)return false;
    const existing=await loadCombinedCorpus();
    const next=prepareSeed(current.corpus,existing.texts,records,validateCorpus);
    if(next===current.corpus)return false;
    try{await repo.save(next,current.revision);return true;}
    catch(error){if(error.name!=='RevisionConflictError'||attempt===2)throw error;}
  }
  return false;
}
export function isPristineSeed(corpus) {
  return corpus.pauCvSeedVersion===seedVersion && corpus.texts.length===seedCount &&
    !corpus.tags.length && !corpus.notebooks.length && !corpus.textRevisions?.length &&
    corpus.texts.every(t=>t.teacherDocx?.pauCv && t.id===seedId(t.teacherDocx) &&
      t.createdAt===seedTimestamp && t.updatedAt===seedTimestamp && !t.tagIds.length && !t.reviewed && t.difficulty===undefined);
}
