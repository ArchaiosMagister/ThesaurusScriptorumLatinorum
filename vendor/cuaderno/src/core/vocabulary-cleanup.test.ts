import test from 'node:test';
import assert from 'node:assert/strict';
import type {VocabularyEntryV1} from './edition-model.js';
import {isUnreviewedAutoVocabulary} from './vocabulary-cleanup.js';
const candidate:VocabularyEntryV1={
  id:'voc.1',lemma:'sunt',headword:'sunt',meaning:null,note:null,
  included:true,order:0,provenance:null,reviewState:'needs-review',
  origin:'generated',locked:false,
};
test('limpieza solo propone formas generadas sin glosa, conserva decisiones docentes',()=>{
  assert.equal(isUnreviewedAutoVocabulary(candidate),true);
  for(const protectedEntry of [
    {...candidate,id:'voc.2',origin:'manual' as const},
    {...candidate,id:'voc.3',locked:true},
    {...candidate,id:'voc.4',meaning:'ser'},
    {...candidate,id:'voc.5',note:'nota del docente'},
    {...candidate,id:'voc.6',reviewState:'manual' as const},
    {...candidate,id:'voc.7',reviewState:'verified' as const,
      provenance:{provider:'collatinus',recordId:'a',bankRevision:'v1',decisionId:null}},
  ])assert.equal(isUnreviewedAutoVocabulary(protectedEntry),false,protectedEntry.id);
  // Una forma identificada por banco pero NUNCA revisada ni glosada sigue
  // siendo solo propuesta automática y puede retirarse con consentimiento.
  assert.equal(isUnreviewedAutoVocabulary({...candidate,provenance:{
    provider:'banco',recordId:'rec',bankRevision:'sha',decisionId:null,
  }}),true);
});
