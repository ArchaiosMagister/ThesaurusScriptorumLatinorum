import assert from 'node:assert/strict';
import test from 'node:test';
import {proposeCollatinusGrammar,type CollatinusGrammarToken,type CollatinusGrammarCandidate} from './collatinus-grammar.js';

function candidate(lid:number,lemma:string,pos:string,im:string,...morphos:string[]):CollatinusGrammarCandidate{
  return {lid,lemma,pos,im,morphos};
}
function token(latin:string,w:string,cands:CollatinusGrammarCandidate[],group?:number[]):CollatinusGrammarToken{
  const s=latin.indexOf(w);
  return {w,s,e:s+w.length,sent:0,pb:'',sel:{lid:cands[0]!.lid,morpho:cands[0]!.morphos[0]!},
    cands,...(group?{group}:{})};
}
test('una lectura relativa de quod conserva la alternativa de conjunción',()=>{
  const latin='œ · quod dixit';
  const quod=token(latin,'quod',[
    candidate(18550,'quī','p','quae, quod, pron. rel.','acusativo neutro singular','nominativo neutro singular'),
    candidate(18641,'quŏd','c','conj. sub.',''),
  ]);
  const proposals=proposeCollatinusGrammar(latin,[quod]);
  assert.equal(proposals.length,1);
  assert.equal(proposals[0]?.tagId,'gram.pron.relativo');
  assert.equal(proposals[0]?.start,4);
  assert.ok(proposals[0]?.alternatives.some(s=>s.includes('conj. sub.')));
  assert.deepEqual(proposeCollatinusGrammar('otro pasaje',[quod]),[]);
});

test('el participio concordado con sum permite proponer pasiva compuesta',()=>{
  const latin='Missi erant';
  const tokens=[
    token(latin,'Missi',[candidate(13824,'mītto','v','is, ere, misi, missum',
      'participio de perfecto pasivo: nominativo masculino plural')],[0,1]),
    token(latin,'erant',[candidate(21493,'sŭm','v','es, esse, fui',
      'imperfecto de indicativo activo, 3ª pers. plural')],[0,1]),
  ];
  const proposal=proposeCollatinusGrammar(latin,tokens).find(row=>row.tagId==='gram.voz.pasiva');
  assert.equal(proposal?.start,0);
  assert.equal(proposal?.end,latin.length);
  assert.equal(proposal.syntaxReview,true);
  tokens[1]!.sent=1;
  assert.ok(!proposeCollatinusGrammar(latin,tokens).some(row=>row.tagId==='gram.voz.pasiva'));
});

test('un deponente con lectura pasiva no se propone como voz pasiva',()=>{
  const latin='Loquitur';
  const tokenData=token(latin,latin,[candidate(12724,'lŏquŏr','v','eris, i, locutus sum',
    'presente de indicativo pasivo, 3ª pers. singular')]);
  assert.deepEqual(proposeCollatinusGrammar(latin,[tokenData]).map(row=>row.tagId),['gram.deponente']);
});

test('gerundivo y gerundio se mantienen manuales y un cum sin oración no recibe interpretación',()=>{
  for(const [latin,analysis] of [['amandus','gerundivo: nominativo masculino singular'],
    ['amandi','gerundio: genitivo'],['cum','']] as const){
    const t=token(latin,latin,[candidate(1,latin,latin==='cum'?'rd':'v','',analysis)]);
    assert.deepEqual(proposeCollatinusGrammar(latin,[t]),[]);
  }
});

test('un infinitivo deponente emite una forma combinada y excluye la voz pasiva',()=>{
  const latin='loqui';
  const t=token(latin,latin,[
    candidate(1,'loquor','v','locutus sum','infinitivo de presente pasivo'),
    candidate(2,'loquo','v','','infinitivo de presente activo'),
  ]);
  const tags=proposeCollatinusGrammar(latin,[t]).map(item=>item.tagId);
  assert.deepEqual(tags.filter(tag=>tag.startsWith('gram.inf.')),['gram.inf.presente.deponente']);
  assert.ok(!tags.includes('gram.voz.pasiva'));
});

test('una perífrasis deponente con esse da una sola etiqueta de infinitivo',()=>{
  const latin='Locutus esse';
  const tokens=[
    token(latin,'Locutus',[candidate(1,'loquor','v','locutus sum',
      'participio de perfecto pasivo: nominativo masculino singular')],[0,1]),
    token(latin,'esse',[candidate(2,'sum','v','','infinitivo de presente activo')],[0,1]),
  ];
  const proposals=proposeCollatinusGrammar(latin,tokens).filter(item=>item.tagId.startsWith('gram.inf.'));
  assert.deepEqual(proposals.map(({start,end,tagId})=>[latin.slice(start,end),tagId]),
    [[latin,'gram.inf.perfecto.deponente']]);
});

test('una etiqueta confirmada excluye una forma rival en la misma ocurrencia',async()=>{
  const {conflictsWithGrammarForm}=await import('./grammar-tags.js');
  assert.equal(conflictsWithGrammarForm(['gram.inf.presente.activo'],'gram.inf.perfecto.activo'),true);
  assert.equal(conflictsWithGrammarForm(['gram.deponente'],'gram.voz.pasiva'),true);
  assert.equal(conflictsWithGrammarForm(['gram.inf.perfecto.deponente'],'gram.infinitivo'),false);
});
