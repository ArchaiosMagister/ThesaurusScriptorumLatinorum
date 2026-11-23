import type { LatinText } from './model.js';
import {
  EDITION_SCHEMA_VERSION, type EditableFieldV1, type NotebookEditionV1,
  type PageFormatV1, type QuestionV1, type SourceLinkV1, type TextPlacementV1,
} from './edition-model.js';
import { validateEdition } from './edition-validation.js';
import {DEFAULT_EXTRA_LATIN_SPACING_PT,exactLatinLineHeightPt} from './latin-spacing.js';

/** Los IDs se inyectan: migraciones y pruebas pueden ser deterministas. */
export type NextId = () => string;
export const DEFAULT_PAGE_FORMAT_V1: Readonly<PageFormatV1> = {
  paper:'A4',fontFamily:'Palatino Linotype',fontSizePt:10.5,
  // Aproximación al modelo Pages A4: 2,5 cm verticales y 3 cm laterales.
  // Interlineado exacto: altura TOTAL de línea en puntos, no espacio añadido.
  marginsPt:{top:70.87,right:85.04,bottom:70.87,left:85.04},
  lineSpacingPt:exactLatinLineHeightPt(10.5,DEFAULT_EXTRA_LATIN_SPACING_PT),
  questionGapPt:7,showPoints:true,pageFooter:'page | total',
};
function field(value:string):EditableFieldV1 {
  return {value,origin:'template',locked:false,lastEditAt:null};
}
/** El contenido filológico se deja vacío: el modelo no inventa palabras. */
export function templateQuestions(nextId:NextId):QuestionV1[] {
  return [
    {id:nextId(),kind:'translation',enabled:true,statement:field('Traducción del texto.'),pointsHundredths:400,styleOverride:null},
    {id:nextId(),kind:'syntax',enabled:true,statement:field('Análisis sintáctico del texto.'),pointsHundredths:100,styleOverride:null},
    {id:nextId(),kind:'morphology',enabled:true,statement:field('Análisis morfológico de las palabras subrayadas.'),
      pointsHundredths:100,styleOverride:null,words:[]},
    {id:nextId(),kind:'choice',enabled:true,statement:field('Elige {required} de estas {offered} preguntas:'),
      pointsHundredths:200,styleOverride:null,requiredCount:2,options:[
        {id:nextId(),kind:'preverb',enabled:true,statement:field('Modificación preverbial.'),slots:[]},
        {id:nextId(),kind:'phonetics',enabled:true,statement:field('Evolución fonética.'),slots:[]},
        {id:nextId(),kind:'prefix',enabled:true,statement:field('Prefijos.'),slots:[]},
        {id:nextId(),kind:'latinism',enabled:true,statement:field('Latinismos.'),slots:[]},
      ]},
  ];
}
export interface PlacementSeedV1 {
  id:string;
  source:SourceLinkV1;
  title:string;
  latin:string;
  author:string|null;
  work:string|null;
  reference:string|null;
  grammaticalTagIds?:string[];
}
export function createPlacement(seed:PlacementSeedV1,nextId:NextId):TextPlacementV1 {
  return {id:seed.id,source:seed.source,
    text:{title:seed.title,latin:seed.latin,author:seed.author,work:seed.work,reference:seed.reference,markup:[]},
    questions:templateQuestions(nextId),vocabulary:[],grammaticalTagIds:[...(seed.grammaticalTagIds??[])],reviewFlags:[]};
}
export function placementFromCorpus(text:LatinText,id:string,importedAt:string,nextId:NextId):TextPlacementV1 {
  const placement = createPlacement({id,title:text.title,latin:text.latin,author:text.source.author,
    work:text.source.work,reference:text.source.reference,grammaticalTagIds:text.tagIds,
    source:{kind:'corpus',sourceId:text.id,urn:null,importedAt}},nextId);
  placement.vocabulary = (text.vocabulary ?? []).map(entry => ({...structuredClone(entry), id: nextId()}));
  return placement;
}
export interface EditionSeedV1 {
  id:string;
  legacyNotebookId:string|null;
  title:string;
  timestamp:string;
  placements:TextPlacementV1[];
}
export function createEdition(seed:EditionSeedV1):NotebookEditionV1 {
  return validateEdition({editionSchemaVersion:EDITION_SCHEMA_VERSION,id:seed.id,legacyNotebookId:seed.legacyNotebookId,
    title:seed.title,locale:'es',createdAt:seed.timestamp,updatedAt:seed.timestamp,
    format:structuredClone(DEFAULT_PAGE_FORMAT_V1),placements:seed.placements});
}
