/** Instantánea offline del contenido pertinente de cinco JSON docentes; Git blob SHA y campos originales.
 * NO elevar APTO_PROPUESTO a verificación individual. Actualizar solo tras auditoría explícita.
 * Fuente: ArchaiosMagister/GeneradorExamenes, main, 15/11/2026.
 */
import type { TeacherAcademicSourceSnapshotV1 } from '../core/academic-teacher-adapter.js';
export const TEACHER_ACADEMIC_SOURCE_SNAPSHOT_V1 = {
  "schemaVersion": 1,
  "repo": "ArchaiosMagister/GeneradorExamenes",
  "sources": {
    "preverb": {
      "path": "data/modificacion-preverbial-docente.json",
      "sha": "ffda3b14f6504a301bbe8848f393d7e2d50b36ac"
    },
    "prefix": {
      "path": "data/prefijos-docente.json",
      "sha": "805a0039dcc222ffb8ce50c4a4c5869a24c79559"
    },
    "latinism": {
      "path": "data/latinismos-docente.json",
      "sha": "1b160d775532e2395002847f0e56bdc3aeaef333"
    },
    "phonetics": {
      "path": "data/fonetica/banco_examenes.json",
      "sha": "26eacd0e439986f7ab00e48fe2f54a2406707658"
    },
    "morphology": {
      "path": "data/lemmas/verified-overrides.json",
      "sha": "52e0b127310773bcbf8eb92248edda5319dfbb35"
    }
  },
  "preverbs": [
    {
      "id": 1,
      "prompt": "ago",
      "enunciado": "ago, -ere, egi, actum",
      "derivatives": [
        "abigo",
        "adigo",
        "ambigo",
        "cogo",
        "dego",
        "exigo",
        "indago",
        "perago",
        "prodigo",
        "redigo",
        "subigo",
        "transigo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 2,
      "prompt": "arceo",
      "enunciado": "arceo, -ere, -cui",
      "derivatives": [
        "coerceo",
        "exerceo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 3,
      "prompt": "cado",
      "enunciado": "cado, -ere, cecidi, casum",
      "derivatives": [
        "accido",
        "concido",
        "decido",
        "excido",
        "incido",
        "occido",
        "recido"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 4,
      "prompt": "caedo",
      "enunciado": "caedo, -ere, cecidi, caesum",
      "derivatives": [
        "abscido",
        "circumcido",
        "concido",
        "decido",
        "excido",
        "incido",
        "occido",
        "praecido",
        "recido"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 5,
      "prompt": "cano",
      "enunciado": "cano, -ere, cecini, cantum",
      "derivatives": [
        "concino",
        "intercino",
        "occino",
        "praecino",
        "recino",
        "succino"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 6,
      "prompt": "capio",
      "enunciado": "capio, -ere, cepi, captum",
      "derivatives": [
        "accipio",
        "antecapio",
        "concipio",
        "decipio",
        "excipio",
        "incipio",
        "intercipio",
        "percipio",
        "praecipio",
        "recipio",
        "suscipio"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 7,
      "prompt": "carpo",
      "enunciado": "carpo, -ere, -psi, -ptum",
      "derivatives": [
        "concerpo",
        "decerpo",
        "discerpo",
        "excerpo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 8,
      "prompt": "cedo",
      "enunciado": "cedo, -ere, cessi, cessum",
      "derivatives": [
        "abscedo",
        "accedo",
        "antecedo",
        "concedo",
        "decedo",
        "discedo",
        "excedo",
        "incedo",
        "intercedo",
        "praecedo",
        "procedo",
        "recedo",
        "retrocedo",
        "secedo",
        "succedo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 9,
      "prompt": "cerno",
      "enunciado": "cerno, -ere, -crevi, -cretum",
      "derivatives": [
        "decerno",
        "discerno",
        "excerno",
        "secerno"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 10,
      "prompt": "cieo",
      "enunciado": "cieo, -ere, civi, citum",
      "derivatives": [
        "accio",
        "concieo",
        "excio",
        "percieo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 11,
      "prompt": "clamo",
      "enunciado": "clamo, -are, -avi, -atum",
      "derivatives": [
        "acclamo",
        "conclamo",
        "declamo",
        "exclamo",
        "inclamo",
        "proclamo",
        "reclamo",
        "succlamo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 12,
      "prompt": "claudo",
      "enunciado": "claudo, -ere, clausi, clausum",
      "derivatives": [
        "concludo",
        "excludo",
        "includo",
        "intercludo",
        "occludo",
        "praecludo",
        "recludo",
        "secludo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 13,
      "prompt": "colo",
      "enunciado": "colo, -ere, colui, cultum",
      "derivatives": [
        "accolo",
        "excolo",
        "incolo",
        "percolo",
        "recolo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 14,
      "prompt": "creo",
      "enunciado": "creo, -are, -avi, -atum",
      "derivatives": [
        "concreo",
        "procreo",
        "recreo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 15,
      "prompt": "cubo",
      "enunciado": "cubo, -are, -ui, -itum",
      "derivatives": [
        "accubo",
        "excubo",
        "incubo",
        "recubo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 16,
      "prompt": "curo",
      "enunciado": "curo, -are, -avi, -atum",
      "derivatives": [
        "accuro",
        "percuro",
        "procuro"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 17,
      "prompt": "curro",
      "enunciado": "curro, -ere, cucurri, cursum",
      "derivatives": [
        "accurro",
        "concurro",
        "decurro",
        "discurro",
        "excurro",
        "incurro",
        "intercurro",
        "occurro",
        "percurro",
        "praecurro",
        "procurro",
        "recurro",
        "succurro",
        "transcurro"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 18,
      "prompt": "dico",
      "enunciado": "dico, -ere, dixi, dictum",
      "derivatives": [
        "abdico",
        "addico",
        "benedico",
        "contradico",
        "dedico",
        "edico",
        "indico",
        "interdico",
        "maledico",
        "praedico"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 19,
      "prompt": "disco",
      "enunciado": "disco, -ere, didici, discitum",
      "derivatives": [
        "addisco",
        "condisco",
        "dedisco",
        "edisco",
        "perdisco",
        "praedisco"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 20,
      "prompt": "do",
      "enunciado": "do, dare, dedi, datum",
      "derivatives": [
        "abdo",
        "abscondo",
        "addo",
        "circumdo",
        "condo",
        "dedo",
        "edo",
        "indo",
        "obdo",
        "perdo",
        "prodo",
        "recondo",
        "reddo",
        "subdo",
        "trado",
        "vendo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 21,
      "prompt": "doceo",
      "enunciado": "doceo, -ere, -cui, doctum",
      "derivatives": [
        "edoceo",
        "perdoceo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 22,
      "prompt": "duco",
      "enunciado": "duco, -ere, duxi, ductum",
      "derivatives": [
        "abduco",
        "adduco",
        "circumduco",
        "conduco",
        "deduco",
        "diduco",
        "educo",
        "induco",
        "introduco",
        "obduco",
        "perduco",
        "produco",
        "reduco",
        "seduco",
        "subduco",
        "traduco"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 23,
      "prompt": "emo",
      "enunciado": "emo, -ere, emi, emptum",
      "derivatives": [
        "adimo",
        "coemo",
        "como",
        "demo",
        "dirimo",
        "eximo",
        "interimo",
        "perimo",
        "promo",
        "redimo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 24,
      "prompt": "eo",
      "enunciado": "eo, ire, ivi, itum",
      "derivatives": [
        "abeo",
        "adeo",
        "ambio",
        "circumeo",
        "coeo",
        "exeo",
        "ineo",
        "intereo",
        "obeo",
        "pereo",
        "praeeo",
        "praetereo",
        "prodeo",
        "redeo",
        "subeo",
        "transeo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 25,
      "prompt": "facio",
      "enunciado": "facio, -ere, feci, factum",
      "derivatives": [
        "afficio",
        "calefacio",
        "conficio",
        "deficio",
        "efficio",
        "inficio",
        "interficio",
        "perficio",
        "praeficio",
        "proficio",
        "reficio",
        "satisfacio",
        "sufficio"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 26,
      "prompt": "fero",
      "enunciado": "fero, ferre, tuli, latum",
      "derivatives": [
        "affero",
        "antefero",
        "aufero",
        "circumfero",
        "confero",
        "defero",
        "differo",
        "effero",
        "infero",
        "offero",
        "perfero",
        "praefero",
        "profero",
        "refero",
        "suffero",
        "transfero"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 27,
      "prompt": "figo",
      "enunciado": "figo, -ere, fixi, fixum",
      "derivatives": [
        "affigo",
        "configo",
        "defigo",
        "infigo",
        "praefigo",
        "refigo",
        "suffigo",
        "transfigo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 28,
      "prompt": "fingo",
      "enunciado": "fingo, -ere, finxi, fictum",
      "derivatives": [
        "affingo",
        "confingo",
        "diffingo",
        "effingo",
        "refingo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 29,
      "prompt": "flecto",
      "enunciado": "flecto, -ere, flexi, flexum",
      "derivatives": [
        "circumflecto",
        "deflecto",
        "inflecto",
        "reflecto"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 30,
      "prompt": "for",
      "enunciado": "for, fari, fatus sum",
      "derivatives": [
        "affor",
        "effor",
        "praefor",
        "profor"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 31,
      "prompt": "frango",
      "enunciado": "frango, -ere, fregi, fractum",
      "derivatives": [
        "confringo",
        "diffringo",
        "effringo",
        "infringo",
        "perfringo",
        "refringo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 32,
      "prompt": "fugio",
      "enunciado": "fugio, -ere, fugi, -giturus",
      "derivatives": [
        "aufugio",
        "confugio",
        "defugio",
        "diffugio",
        "effugio",
        "perfugio",
        "profugio",
        "refugio",
        "subterfugio",
        "transfugio"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 33,
      "prompt": "fundo",
      "enunciado": "fundo, -ere, fudi, fusum",
      "derivatives": [
        "affundo",
        "circumfundo",
        "confundo",
        "defundo",
        "diffundo",
        "effundo",
        "infundo",
        "offundo",
        "perfundo",
        "profundo",
        "refundo",
        "suffundo",
        "transfundo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 34,
      "prompt": "gigno",
      "enunciado": "geno (gigno), -ere, genui, genitum",
      "derivatives": [
        "ingigno",
        "progigno",
        "progenero"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 35,
      "prompt": "gero",
      "enunciado": "gero, -ere, gessi, gestum",
      "derivatives": [
        "aggero",
        "belligero",
        "congero",
        "digero",
        "egero",
        "ingero",
        "regero",
        "suggero"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 36,
      "prompt": "gradior",
      "enunciado": "gradior, gradi, gressus sum",
      "derivatives": [
        "aggredior",
        "congredior",
        "digredior",
        "egredior",
        "ingredior",
        "praegredior",
        "progredior",
        "regredior",
        "transgredior"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 37,
      "prompt": "habeo",
      "enunciado": "habeo, -ere, -ui, -itum",
      "derivatives": [
        "adhibeo",
        "cohibeo",
        "debeo",
        "exhibeo",
        "inhibeo",
        "perhibeo",
        "posthabeo",
        "praebeo",
        "prohibeo",
        "redhibeo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 38,
      "prompt": "haereo",
      "enunciado": "haereo, -ere, haesi, haesum",
      "derivatives": [
        "adhaereo",
        "cohaereo",
        "inhaereo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 39,
      "prompt": "iacio",
      "enunciado": "iacio, -ere, ieci, iactum",
      "derivatives": [
        "abicio",
        "adicio",
        "conicio",
        "deicio",
        "disicio",
        "eicio",
        "inicio",
        "intericio",
        "obicio",
        "proicio",
        "reicio",
        "subicio",
        "traicio"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 40,
      "prompt": "iungo",
      "enunciado": "iungo, -ere, iunxi, iunctum",
      "derivatives": [
        "adiungo",
        "coniungo",
        "disiungo",
        "iniungo",
        "seiungo",
        "subiungo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 41,
      "prompt": "labor",
      "enunciado": "labor, -i, lapsus sum",
      "derivatives": [
        "allabor",
        "collabor",
        "delabor",
        "elabor",
        "illabor",
        "prolabor",
        "relabor",
        "sublabor"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 42,
      "prompt": "lego",
      "enunciado": "lego, -ere, -legi, lectum",
      "derivatives": [
        "colligo",
        "deligo",
        "diligo",
        "eligo",
        "intellego",
        "neglego",
        "perlego",
        "praelego",
        "relego",
        "seligo",
        "sublego"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 43,
      "prompt": "levo",
      "enunciado": "levo, -are, -avi, -atum",
      "derivatives": [
        "allevo",
        "elevo",
        "relevo",
        "sublevo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 44,
      "prompt": "ligo",
      "enunciado": "ligo, -are, -avi, -atum",
      "derivatives": [
        "alligo",
        "colligo",
        "deligo",
        "obligo",
        "praeligo",
        "religo",
        "subligo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 45,
      "prompt": "maneo",
      "enunciado": "maneo, -ere, mansi, mansum",
      "derivatives": [
        "immaneo",
        "permaneo",
        "remaneo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 46,
      "prompt": "misceo",
      "enunciado": "misceo, -ere, -cui, mixtum",
      "derivatives": [
        "admisceo",
        "commisceo",
        "immisceo",
        "intermisceo",
        "permisceo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 47,
      "prompt": "mitto",
      "enunciado": "mitto, -ere, misi, missum",
      "derivatives": [
        "admitto",
        "amitto",
        "circummitto",
        "committo",
        "demitto",
        "dimitto",
        "emitto",
        "immitto",
        "intermitto",
        "omitto",
        "permitto",
        "praemitto",
        "praetermitto",
        "promitto",
        "remitto",
        "submitto",
        "transmitto"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 48,
      "prompt": "moneo",
      "enunciado": "moneo, -ere, -ui, -itum",
      "derivatives": [
        "admoneo",
        "commoneo",
        "praemoneo",
        "summoneo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 49,
      "prompt": "moror",
      "enunciado": "moror, -ari, -atus sum",
      "derivatives": [
        "commoror",
        "demoror",
        "immoror",
        "remoror"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 50,
      "prompt": "moveo",
      "enunciado": "moveo, -ere, movi, motum",
      "derivatives": [
        "admoveo",
        "amoveo",
        "commoveo",
        "demoveo",
        "dimoveo",
        "emoveo",
        "permoveo",
        "promoveo",
        "removeo",
        "summoveo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 51,
      "prompt": "muto",
      "enunciado": "muto, -are, -avi, -atum",
      "derivatives": [
        "commuto",
        "demuto",
        "immuto",
        "permuto",
        "transmuto"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 52,
      "prompt": "nosco",
      "enunciado": "nosco, -ere, novi, notum",
      "derivatives": [
        "agnosco",
        "cognosco",
        "dignosco",
        "ignosco",
        "internosco",
        "recognosco"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 53,
      "prompt": "nuntio",
      "enunciado": "nuntio, -are, -avi, -atum",
      "derivatives": [
        "annuntio",
        "denuntio",
        "enuntio",
        "internuntio",
        "pronuntio",
        "renuntio"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 54,
      "prompt": "orior",
      "enunciado": "orior, oriri, ortus sum",
      "derivatives": [
        "aborior",
        "adorior",
        "coorior",
        "exorior"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 55,
      "prompt": "oro",
      "enunciado": "oro, -are, -avi, -atum",
      "derivatives": [
        "adoro",
        "exoro",
        "peroro"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 56,
      "prompt": "paro",
      "enunciado": "paro, -are, -avi, -atum",
      "derivatives": [
        "apparo",
        "comparo",
        "impero",
        "praeparo",
        "reparo",
        "separo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 57,
      "prompt": "pello",
      "enunciado": "pello, -ere, pepuli, pulsum",
      "derivatives": [
        "appello",
        "compello",
        "depello",
        "dispello",
        "expello",
        "impello",
        "interpello",
        "propello",
        "repello"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 58,
      "prompt": "pendo",
      "enunciado": "pendo, -ere, pependi, pensum",
      "derivatives": [
        "appendo",
        "dependo",
        "expendo",
        "impendo",
        "perpendo",
        "rependo",
        "suspendo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 59,
      "prompt": "peto",
      "enunciado": "peto, -ere, -ivi, -itum",
      "derivatives": [
        "appeto",
        "competo",
        "expeto",
        "impeto",
        "oppeto",
        "repeto",
        "suppeto"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 60,
      "prompt": "plecto",
      "enunciado": "plecto, -ere, plexi, plexum",
      "derivatives": [
        "amplector",
        "complector",
        "implecto"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 61,
      "prompt": "pleo",
      "enunciado": "pleo, -ere, -plevi, -pletum",
      "derivatives": [
        "compleo",
        "expleo",
        "impleo",
        "oppleo",
        "repleo",
        "suppleo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 62,
      "prompt": "pono",
      "enunciado": "pono, -ere, -sui, -situm",
      "derivatives": [
        "antepono",
        "appono",
        "circumpono",
        "compono",
        "depono",
        "dispono",
        "expono",
        "impono",
        "interpono",
        "oppono",
        "postpono",
        "praepono",
        "propono",
        "repono",
        "sepono",
        "superpono",
        "suppono",
        "transpono"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 63,
      "prompt": "porto",
      "enunciado": "porto, -are, -avi, -atum",
      "derivatives": [
        "apporto",
        "asporto",
        "comporto",
        "deporto",
        "exporto",
        "importo",
        "reporto",
        "supporto",
        "transporto"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 64,
      "prompt": "prehendo",
      "enunciado": "prehendo, -ere, -di, -sum",
      "derivatives": [
        "apprehendo",
        "comprehendo",
        "deprehendo",
        "reprehendo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 65,
      "prompt": "precor",
      "enunciado": "precor, -ari, -atus sum",
      "derivatives": [
        "comprecor",
        "deprecor",
        "imprecor"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 66,
      "prompt": "premo",
      "enunciado": "premo, -ere, pressi, pressum",
      "derivatives": [
        "apprimo",
        "comprimo",
        "deprimo",
        "exprimo",
        "imprimo",
        "opprimo",
        "reprimo",
        "supprimo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 67,
      "prompt": "pugno",
      "enunciado": "pugno, -are, -avi, -atum",
      "derivatives": [
        "depugno",
        "expugno",
        "impugno",
        "oppugno",
        "propugno",
        "repugno"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 68,
      "prompt": "puto",
      "enunciado": "puto, -are, -avi, -atum",
      "derivatives": [
        "amputo",
        "computo",
        "deputo",
        "disputo",
        "imputo",
        "reputo",
        "supputo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 69,
      "prompt": "quaero",
      "enunciado": "quaero, -ere, -sivi, -situm",
      "derivatives": [
        "acquiro",
        "conquiro",
        "disquiro",
        "exquiro",
        "inquiro",
        "perquiro",
        "requiro"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 70,
      "prompt": "quatio",
      "enunciado": "quatio, -ere, quassum",
      "derivatives": [
        "concutio",
        "decutio",
        "discutio",
        "excutio",
        "incutio",
        "percutio",
        "recutio",
        "succutio"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 71,
      "prompt": "rapio",
      "enunciado": "rapio, -ere, -pui, -ptum",
      "derivatives": [
        "abripio",
        "arripio",
        "corripio",
        "deripio",
        "diripio",
        "eripio",
        "praeripio",
        "proripio",
        "surripio"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 72,
      "prompt": "rego",
      "enunciado": "rego, -ere, rexi, rectum",
      "derivatives": [
        "arrigo",
        "corrigo",
        "dirigo",
        "erigo",
        "pergo",
        "porrigo",
        "surgo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 73,
      "prompt": "rogo",
      "enunciado": "rogo, -are, -avi, -atum",
      "derivatives": [
        "abrogo",
        "arrogo",
        "derogo",
        "erogo",
        "interrogo",
        "irrogo",
        "obrogo",
        "prorogo",
        "subrogo",
        "surrogo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 74,
      "prompt": "rumpo",
      "enunciado": "rumpo, -ere, rupi, ruptum",
      "derivatives": [
        "abrumpo",
        "corrumpo",
        "dirumpo",
        "erumpo",
        "interrumpo",
        "irrumpo",
        "perrumpo",
        "prorumpo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 75,
      "prompt": "salio",
      "enunciado": "salio, -ire, -lui, saltum",
      "derivatives": [
        "absilio",
        "assilio",
        "circumsilio",
        "desilio",
        "dissilio",
        "exsilio",
        "insilio",
        "prosilio",
        "resilio",
        "subsilio",
        "transilio"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 76,
      "prompt": "sapio",
      "enunciado": "sapio, -ere, -pui",
      "derivatives": [
        "desipio",
        "resipio"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 77,
      "prompt": "scando",
      "enunciado": "scando, -ere, -ndi, -nsum",
      "derivatives": [
        "ascendo",
        "conscendo",
        "descendo",
        "inscendo",
        "transcendo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 78,
      "prompt": "scio",
      "enunciado": "scio, -ire, -ivi, scitum",
      "derivatives": [
        "conscio",
        "nescio",
        "praescio",
        "rescio"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 79,
      "prompt": "scribo",
      "enunciado": "scribo, -ere, -psi, -ptum",
      "derivatives": [
        "ascribo",
        "circumscribo",
        "conscribo",
        "describo",
        "inscribo",
        "perscribo",
        "praescribo",
        "proscribo",
        "rescribo",
        "subscribo",
        "transcribo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 80,
      "prompt": "seco",
      "enunciado": "seco, -are, -cui, sectum",
      "derivatives": [
        "circumseco",
        "deseco",
        "disseco",
        "exseco",
        "perseco",
        "praeseco",
        "reseco",
        "subseco"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 81,
      "prompt": "sedeo",
      "enunciado": "sedeo, -ere, sedi, sessum",
      "derivatives": [
        "assideo",
        "circumsedeo",
        "desideo",
        "dissideo",
        "insideo",
        "obsideo",
        "possideo",
        "praesideo",
        "resideo",
        "supersedeo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 82,
      "prompt": "sentio",
      "enunciado": "sentio, -ire, sensi, sensum",
      "derivatives": [
        "assentio",
        "consentio",
        "dissentio",
        "persentio",
        "praesentio"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 83,
      "prompt": "sequor",
      "enunciado": "sequor, sequi, secutus sum",
      "derivatives": [
        "assequor",
        "consequor",
        "exsequor",
        "insequor",
        "obsequor",
        "persequor",
        "prosequor",
        "subsequor"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 84,
      "prompt": "sero",
      "enunciado": "sero, -ere, -rui, sertum",
      "derivatives": [
        "assero",
        "consero",
        "desero",
        "dissero",
        "exsero",
        "insero"
      ],
      "ambiguousPrompt": true
    },
    {
      "id": 85,
      "prompt": "sero",
      "enunciado": "sero, -ere, sevi, satum",
      "derivatives": [
        "consero",
        "dissero",
        "insero",
        "obsero"
      ],
      "ambiguousPrompt": true
    },
    {
      "id": 86,
      "prompt": "sino",
      "enunciado": "sino, -ere, sivi, situm",
      "derivatives": [
        "desino"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 87,
      "prompt": "sisto",
      "enunciado": "sisto, -ere, stiti, statum",
      "derivatives": [
        "absisto",
        "assisto",
        "circumsisto",
        "consisto",
        "desisto",
        "exsisto",
        "insisto",
        "obsisto",
        "persisto",
        "resisto",
        "subsisto"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 88,
      "prompt": "solvo",
      "enunciado": "solvo, -ere, solvi, solutum",
      "derivatives": [
        "absolvo",
        "dissolvo",
        "exsolvo",
        "persolvo",
        "resolvo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 89,
      "prompt": "specio",
      "enunciado": "specio (spicio), -ere, spexi, spectum",
      "derivatives": [
        "aspicio",
        "circumspicio",
        "conspicio",
        "despicio",
        "inspicio",
        "introspicio",
        "perspicio",
        "prospicio",
        "respicio",
        "suspicio"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 90,
      "prompt": "spiro",
      "enunciado": "spiro, -are, -avi, -atum",
      "derivatives": [
        "aspiro",
        "conspiro",
        "exspiro",
        "inspiro",
        "respiro",
        "suspiro"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 91,
      "prompt": "statuo",
      "enunciado": "statuo, -ere, -ui, -tutum",
      "derivatives": [
        "constituo",
        "destituo",
        "instituo",
        "prostituo",
        "restituo",
        "substituo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 92,
      "prompt": "sterno",
      "enunciado": "sterno, -ere, stravi, stratum",
      "derivatives": [
        "consterno",
        "insterno",
        "prosterno",
        "substerno"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 93,
      "prompt": "sto",
      "enunciado": "sto, -are, steti, staturus",
      "derivatives": [
        "asto",
        "antisto",
        "circumsto",
        "consto",
        "disto",
        "exsto",
        "insto",
        "obsto",
        "persto",
        "praesto",
        "prosto",
        "resto",
        "supersto"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 94,
      "prompt": "stringo",
      "enunciado": "stringo, -ere, -nxi, -ctum",
      "derivatives": [
        "astringo",
        "constringo",
        "destringo",
        "distringo",
        "obstringo",
        "perstringo",
        "praestringo",
        "restringo",
        "substringo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 95,
      "prompt": "struo",
      "enunciado": "struo, -ere, -uxi, -uctum",
      "derivatives": [
        "astruo",
        "circumstruo",
        "construo",
        "destruo",
        "exstruo",
        "instruo",
        "obstruo",
        "praestruo",
        "substruo",
        "superstruo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 96,
      "prompt": "sum",
      "enunciado": "sum, esse, fui",
      "derivatives": [
        "absum",
        "adsum",
        "desum",
        "insum",
        "intersum",
        "obsum",
        "possum",
        "praesum",
        "prosum",
        "subsum",
        "supersum"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 97,
      "prompt": "sumo",
      "enunciado": "sumo, -ere, sumpsi, sumptum",
      "derivatives": [
        "absumo",
        "assumo",
        "consumo",
        "desumo",
        "insumo",
        "praesumo",
        "resumo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 98,
      "prompt": "tango",
      "enunciado": "tango, -ere, tetigi, tactum",
      "derivatives": [
        "attingo",
        "contingo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 99,
      "prompt": "tego",
      "enunciado": "tego, -ere, texi, tectum",
      "derivatives": [
        "contego",
        "detego",
        "intego",
        "obtego",
        "protego",
        "retego"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 100,
      "prompt": "tendo",
      "enunciado": "tendo, -ere, tetendi, tensum",
      "derivatives": [
        "attendo",
        "contendo",
        "distendo",
        "extendo",
        "intendo",
        "obtendo",
        "ostendo",
        "portendo",
        "praetendo",
        "protendo",
        "retendo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 101,
      "prompt": "teneo",
      "enunciado": "teneo, -ere, tenui, tentum",
      "derivatives": [
        "abstineo",
        "attineo",
        "contineo",
        "detineo",
        "distineo",
        "obtineo",
        "pertineo",
        "retineo",
        "sustineo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 102,
      "prompt": "tollo",
      "enunciado": "tollo, -ere, sustuli, sublatum",
      "derivatives": [
        "attollo",
        "extollo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 103,
      "prompt": "torqueo",
      "enunciado": "torqueo, -ere, torsi, tortum",
      "derivatives": [
        "contorqueo",
        "detorqueo",
        "distorqueo",
        "extorqueo",
        "intorqueo",
        "obtorqueo",
        "retorqueo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 104,
      "prompt": "traho",
      "enunciado": "traho, -ere, traxi, tractum",
      "derivatives": [
        "abstraho",
        "attraho",
        "contraho",
        "detraho",
        "distraho",
        "extraho",
        "protraho",
        "retraho",
        "subtraho"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 105,
      "prompt": "tueor",
      "enunciado": "tueor, tueri, tutus sum",
      "derivatives": [
        "contueor",
        "intueor"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 106,
      "prompt": "turbo",
      "enunciado": "turbo, -are, -atum",
      "derivatives": [
        "conturbo",
        "disturbo",
        "exturbo",
        "interturbo",
        "perturbo",
        "proturbo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 107,
      "prompt": "tundo",
      "enunciado": "tundo, -ere, tutudi, tunsum",
      "derivatives": [
        "contundo",
        "extundo",
        "obtundo",
        "pertundo",
        "retundo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 108,
      "prompt": "vado",
      "enunciado": "vado, -ere, vasi, -vasum",
      "derivatives": [
        "evado",
        "invado",
        "pervado"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 109,
      "prompt": "vagor",
      "enunciado": "vagor, -ari, -atus sum",
      "derivatives": [
        "evagor",
        "pervagor"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 110,
      "prompt": "vasto",
      "enunciado": "vasto, -are, -avi, -atum",
      "derivatives": [
        "devasto",
        "pervasto"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 111,
      "prompt": "veho",
      "enunciado": "veho, -ere, vexi, vectum",
      "derivatives": [
        "adveho",
        "aveho",
        "circumvehor",
        "conveho",
        "deveho",
        "eveho",
        "inveho",
        "perveho",
        "praevehor",
        "proveho",
        "reveho",
        "subveho",
        "transveho"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 112,
      "prompt": "vello",
      "enunciado": "vello, -ere, velli, vulsum",
      "derivatives": [
        "avello",
        "convello",
        "divello",
        "evello",
        "revello"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 113,
      "prompt": "venio",
      "enunciado": "venio, -ire, veni, ventum",
      "derivatives": [
        "advenio",
        "antevenio",
        "circumvenio",
        "convenio",
        "devenio",
        "evenio",
        "intervenio",
        "invenio",
        "obvenio",
        "pervenio",
        "praevenio",
        "provenio",
        "revenio",
        "subvenio",
        "supervenio"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 114,
      "prompt": "verto",
      "enunciado": "verto, -ere, -rsi, -rsum",
      "derivatives": [
        "adverto",
        "animadverto",
        "averto",
        "circumverto",
        "converto",
        "deverto",
        "diverto",
        "everto",
        "inverto",
        "obverto",
        "perverto",
        "praeverto",
        "reverto",
        "subverto",
        "transverto"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 115,
      "prompt": "video",
      "enunciado": "video, -ere, vidi, visum",
      "derivatives": [
        "invideo",
        "praevideo",
        "provideo"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 116,
      "prompt": "vivo",
      "enunciado": "vivo, -ere, vixi, victum",
      "derivatives": [
        "convivo",
        "revivisco"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 117,
      "prompt": "voco",
      "enunciado": "voco, -are, -avi, -atum",
      "derivatives": [
        "advoco",
        "avoco",
        "convoco",
        "devoco",
        "evoco",
        "invoco",
        "provoco",
        "revoco"
      ],
      "ambiguousPrompt": false
    },
    {
      "id": 118,
      "prompt": "volo",
      "enunciado": "volo, -are, -avi, -atum",
      "derivatives": [
        "advolo",
        "avolo",
        "circumvolo",
        "convolo",
        "devolo",
        "evolo",
        "involo",
        "pervolo",
        "provolo",
        "revolo",
        "subvolo",
        "supervolo",
        "transvolo"
      ],
      "ambiguousPrompt": true
    },
    {
      "id": 119,
      "prompt": "volo",
      "enunciado": "volo, velle, volui",
      "derivatives": [
        "malo",
        "nolo"
      ],
      "ambiguousPrompt": true
    },
    {
      "id": 120,
      "prompt": "volvo",
      "enunciado": "volvo, -ere, volvi, volutum",
      "derivatives": [
        "circumvolvo",
        "convolvo",
        "devolvo",
        "evolvo",
        "involvo",
        "obvolvo",
        "provolvo",
        "revolvo"
      ],
      "ambiguousPrompt": false
    }
  ],
  "prefixes": [
    {
      "prompt": "Adjunto",
      "prefix": "AD-/A-",
      "meaningHint": "dirección, proximidad o adición",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Admirar",
      "prefix": "AD-/A-",
      "meaningHint": "dirección, proximidad o adición",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Admonición",
      "prefix": "AD-/A-",
      "meaningHint": "dirección, proximidad o adición",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Adormecer",
      "prefix": "AD-/A-",
      "meaningHint": "dirección, proximidad o adición",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Adquirir",
      "prefix": "AD-/A-",
      "meaningHint": "dirección, proximidad o adición",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Adverbio",
      "prefix": "AD-/A-",
      "meaningHint": "dirección, proximidad o adición",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Adyacente",
      "prefix": "AD-/A-",
      "meaningHint": "dirección, proximidad o adición",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Afligir",
      "prefix": "AD-/A-",
      "meaningHint": "dirección, proximidad o adición",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Agredir",
      "prefix": "AD-/A-",
      "meaningHint": "dirección, proximidad o adición",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Aprehender",
      "prefix": "AD-/A-",
      "meaningHint": "dirección, proximidad o adición",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Anteayer",
      "prefix": "ANTE-/ANTI- (anterioridad)",
      "meaningHint": "anterioridad espacial o temporal",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Antebrazo",
      "prefix": "ANTE-/ANTI- (anterioridad)",
      "meaningHint": "anterioridad espacial o temporal",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Antecapilla",
      "prefix": "ANTE-/ANTI- (anterioridad)",
      "meaningHint": "anterioridad espacial o temporal",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Antecedente",
      "prefix": "ANTE-/ANTI- (anterioridad)",
      "meaningHint": "anterioridad espacial o temporal",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Antecesor",
      "prefix": "ANTE-/ANTI- (anterioridad)",
      "meaningHint": "anterioridad espacial o temporal",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Antediluviano",
      "prefix": "ANTE-/ANTI- (anterioridad)",
      "meaningHint": "anterioridad espacial o temporal",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Antelación",
      "prefix": "ANTE-/ANTI- (anterioridad)",
      "meaningHint": "anterioridad espacial o temporal",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Antemano",
      "prefix": "ANTE-/ANTI- (anterioridad)",
      "meaningHint": "anterioridad espacial o temporal",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Anteojos",
      "prefix": "ANTE-/ANTI- (anterioridad)",
      "meaningHint": "anterioridad espacial o temporal",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Anteponer",
      "prefix": "ANTE-/ANTI- (anterioridad)",
      "meaningHint": "anterioridad espacial o temporal",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Antiácido",
      "prefix": "ANTI- (oposición)",
      "meaningHint": "oposición, contra",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Antiadherente",
      "prefix": "ANTI- (oposición)",
      "meaningHint": "oposición, contra",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Antiaéreo",
      "prefix": "ANTI- (oposición)",
      "meaningHint": "oposición, contra",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Antialérgico",
      "prefix": "ANTI- (oposición)",
      "meaningHint": "oposición, contra",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Antiarrugas",
      "prefix": "ANTI- (oposición)",
      "meaningHint": "oposición, contra",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Antibiótico",
      "prefix": "ANTI- (oposición)",
      "meaningHint": "oposición, contra",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Anticonceptivo",
      "prefix": "ANTI- (oposición)",
      "meaningHint": "oposición, contra",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Anticristo",
      "prefix": "ANTI- (oposición)",
      "meaningHint": "oposición, contra",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Anticuerpo",
      "prefix": "ANTI- (oposición)",
      "meaningHint": "oposición, contra",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Antídoto",
      "prefix": "ANTI- (oposición)",
      "meaningHint": "oposición, contra",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Antifaz",
      "prefix": "ANTE-/ANTI- (anterioridad)",
      "meaningHint": "posición delante del rostro (valor espacial de ante-/anti-)",
      "meaningStatus": "revisado: anti- de antifaz no expresa oposición; valor de ante- delante"
    },
    {
      "prompt": "Antivírico",
      "prefix": "ANTI- (oposición)",
      "meaningHint": "oposición, contra",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Circuncidar",
      "prefix": "CIRCUN-",
      "meaningHint": "alrededor",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Circundar",
      "prefix": "CIRCUN-",
      "meaningHint": "alrededor",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Circunferencia",
      "prefix": "CIRCUN-",
      "meaningHint": "alrededor",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Circunflejo",
      "prefix": "CIRCUN-",
      "meaningHint": "alrededor",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Circunloquio",
      "prefix": "CIRCUN-",
      "meaningHint": "alrededor",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Circunnavegar",
      "prefix": "CIRCUN-",
      "meaningHint": "alrededor",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Circunscribir",
      "prefix": "CIRCUN-",
      "meaningHint": "alrededor",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Circunspección",
      "prefix": "CIRCUN-",
      "meaningHint": "alrededor",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Circunstancia",
      "prefix": "CIRCUN-",
      "meaningHint": "alrededor",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Circunvalación",
      "prefix": "CIRCUN-",
      "meaningHint": "alrededor",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Cisalpino",
      "prefix": "CIS-",
      "meaningHint": "de este lado",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Cisandino",
      "prefix": "CIS-",
      "meaningHint": "de este lado",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Cisexual",
      "prefix": "CIS-",
      "meaningHint": "de este lado",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Cisgénero",
      "prefix": "CIS-",
      "meaningHint": "de este lado",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Cisjordania",
      "prefix": "CIS-",
      "meaningHint": "de este lado",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Cismontano",
      "prefix": "CIS-",
      "meaningHint": "de este lado",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Cispadano",
      "prefix": "CIS-",
      "meaningHint": "de este lado",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Coautor",
      "prefix": "CON-/COL-/COM-/COR-/CO-",
      "meaningHint": "unión, compañía o acción conjunta",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Colaborar",
      "prefix": "CON-/COL-/COM-/COR-/CO-",
      "meaningHint": "unión, compañía o acción conjunta",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Compadre",
      "prefix": "CON-/COL-/COM-/COR-/CO-",
      "meaningHint": "unión, compañía o acción conjunta",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Compilar",
      "prefix": "CON-/COL-/COM-/COR-/CO-",
      "meaningHint": "unión, compañía o acción conjunta",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Compuerta",
      "prefix": "CON-/COL-/COM-/COR-/CO-",
      "meaningHint": "unión, compañía o acción conjunta",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Concordia",
      "prefix": "CON-/COL-/COM-/COR-/CO-",
      "meaningHint": "unión, compañía o acción conjunta",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Confluencia",
      "prefix": "CON-/COL-/COM-/COR-/CO-",
      "meaningHint": "unión, compañía o acción conjunta",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Confluir",
      "prefix": "CON-/COL-/COM-/COR-/CO-",
      "meaningHint": "unión, compañía o acción conjunta",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Convivir",
      "prefix": "CON-/COL-/COM-/COR-/CO-",
      "meaningHint": "unión, compañía o acción conjunta",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Cooperación",
      "prefix": "CON-/COL-/COM-/COR-/CO-",
      "meaningHint": "unión, compañía o acción conjunta",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Correligionario",
      "prefix": "CON-/COL-/COM-/COR-/CO-",
      "meaningHint": "unión, compañía o acción conjunta",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Contraataque",
      "prefix": "CONTRA-",
      "meaningHint": "oposición o sentido contrario",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Contrabando",
      "prefix": "CONTRA-",
      "meaningHint": "oposición o sentido contrario",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Contraceptivo",
      "prefix": "CONTRA-",
      "meaningHint": "oposición o sentido contrario",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Contradecir",
      "prefix": "CONTRA-",
      "meaningHint": "oposición o sentido contrario",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Contradicción",
      "prefix": "CONTRA-",
      "meaningHint": "oposición o sentido contrario",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Contraindicado",
      "prefix": "CONTRA-",
      "meaningHint": "oposición o sentido contrario",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Contranatural",
      "prefix": "CONTRA-",
      "meaningHint": "oposición o sentido contrario",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Contraparte",
      "prefix": "CONTRA-",
      "meaningHint": "oposición o sentido contrario",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Contrapeso",
      "prefix": "CONTRA-",
      "meaningHint": "oposición o sentido contrario",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Contrarreforma",
      "prefix": "CONTRA-",
      "meaningHint": "oposición o sentido contrario",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Decaer",
      "prefix": "DE-",
      "meaningHint": "separación, descenso o privación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Decaído",
      "prefix": "DE-",
      "meaningHint": "separación, descenso o privación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Decapitar",
      "prefix": "DE-",
      "meaningHint": "separación, descenso o privación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Decolorar",
      "prefix": "DE-",
      "meaningHint": "separación, descenso o privación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Deducir",
      "prefix": "DE-",
      "meaningHint": "separación, descenso o privación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Deferencia",
      "prefix": "DE-",
      "meaningHint": "separación, descenso o privación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Definir",
      "prefix": "DE-",
      "meaningHint": "separación, descenso o privación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Deformar",
      "prefix": "DE-",
      "meaningHint": "separación, descenso o privación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Degradante",
      "prefix": "DE-",
      "meaningHint": "separación, descenso o privación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Delimitar",
      "prefix": "DE-",
      "meaningHint": "separación, descenso o privación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Demente",
      "prefix": "DE-",
      "meaningHint": "separación, descenso o privación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Depender",
      "prefix": "DE-",
      "meaningHint": "separación, descenso o privación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Difundir",
      "prefix": "DI-/DIS-",
      "meaningHint": "separación, diversidad o negación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Dilatar",
      "prefix": "DI-/DIS-",
      "meaningHint": "separación, diversidad o negación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Dimanar",
      "prefix": "DI-/DIS-",
      "meaningHint": "separación, diversidad o negación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Discapacidad",
      "prefix": "DI-/DIS-",
      "meaningHint": "separación, diversidad o negación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Disconformidad",
      "prefix": "DI-/DIS-",
      "meaningHint": "separación, diversidad o negación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Discordia",
      "prefix": "DI-/DIS-",
      "meaningHint": "separación, diversidad o negación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Disentir",
      "prefix": "DI-/DIS-",
      "meaningHint": "separación, diversidad o negación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Disfuncional",
      "prefix": "DI-/DIS-",
      "meaningHint": "separación, diversidad o negación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Dislocar",
      "prefix": "DI-/DIS-",
      "meaningHint": "separación, diversidad o negación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Disputar",
      "prefix": "DI-/DIS-",
      "meaningHint": "separación, diversidad o negación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Divergir",
      "prefix": "DI-/DIS-",
      "meaningHint": "separación, diversidad o negación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Diversión",
      "prefix": "DI-/DIS-",
      "meaningHint": "separación, diversidad o negación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Dividir",
      "prefix": "DI-/DIS-",
      "meaningHint": "separación, diversidad o negación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Eficaz",
      "prefix": "E-",
      "meaningHint": "salida o movimiento hacia fuera",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Efusión",
      "prefix": "E-",
      "meaningHint": "salida o movimiento hacia fuera",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Eliminar",
      "prefix": "E-",
      "meaningHint": "salida o movimiento hacia fuera",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Eludir",
      "prefix": "E-",
      "meaningHint": "salida o movimiento hacia fuera",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Emanar",
      "prefix": "E-",
      "meaningHint": "salida o movimiento hacia fuera",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Emergencia",
      "prefix": "E-",
      "meaningHint": "salida o movimiento hacia fuera",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Emigrar",
      "prefix": "E-",
      "meaningHint": "salida o movimiento hacia fuera",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Emoción",
      "prefix": "E-",
      "meaningHint": "salida o movimiento hacia fuera",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Evadir",
      "prefix": "E-",
      "meaningHint": "salida o movimiento hacia fuera",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Evaporación",
      "prefix": "E-",
      "meaningHint": "salida o movimiento hacia fuera",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Exacción",
      "prefix": "EX-",
      "meaningHint": "salida, exterioridad o privación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Exagerar",
      "prefix": "EX-",
      "meaningHint": "salida, exterioridad o privación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Exánime",
      "prefix": "EX-",
      "meaningHint": "salida, exterioridad o privación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Excedente",
      "prefix": "EX-",
      "meaningHint": "salida, exterioridad o privación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Excéntrico",
      "prefix": "EX-",
      "meaningHint": "salida, exterioridad o privación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Exclamación",
      "prefix": "EX-",
      "meaningHint": "salida, exterioridad o privación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Exclamar",
      "prefix": "EX-",
      "meaningHint": "salida, exterioridad o privación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Excónsul",
      "prefix": "EX-",
      "meaningHint": "salida, exterioridad o privación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Exhumar",
      "prefix": "EX-",
      "meaningHint": "salida, exterioridad o privación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Exigir",
      "prefix": "EX-",
      "meaningHint": "salida, exterioridad o privación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Exterminar",
      "prefix": "EX-",
      "meaningHint": "salida, exterioridad o privación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Extraer",
      "prefix": "EXTRA-",
      "meaningHint": "fuera de, más allá de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Extrafino",
      "prefix": "EXTRA-",
      "meaningHint": "fuera de, más allá de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Extrajudicial",
      "prefix": "EXTRA-",
      "meaningHint": "fuera de, más allá de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Extralimitar",
      "prefix": "EXTRA-",
      "meaningHint": "fuera de, más allá de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Extramuros",
      "prefix": "EXTRA-",
      "meaningHint": "fuera de, más allá de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Extraoficial",
      "prefix": "EXTRA-",
      "meaningHint": "fuera de, más allá de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Extraordinario",
      "prefix": "EXTRA-",
      "meaningHint": "fuera de, más allá de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Extraplano",
      "prefix": "EXTRA-",
      "meaningHint": "fuera de, más allá de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Extrapolación",
      "prefix": "EXTRA-",
      "meaningHint": "fuera de, más allá de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Extrarradio",
      "prefix": "EXTRA-",
      "meaningHint": "fuera de, más allá de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Extraterrestre",
      "prefix": "EXTRA-",
      "meaningHint": "fuera de, más allá de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Extravertido",
      "prefix": "EXTRA-",
      "meaningHint": "fuera de, más allá de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Extraviar",
      "prefix": "EXTRA-",
      "meaningHint": "fuera de, más allá de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Ilegal",
      "prefix": "IN-/IL-/IM-",
      "meaningHint": "negación o interioridad según la palabra",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Ilógico",
      "prefix": "IN-/IL-/IM-",
      "meaningHint": "negación o interioridad según la palabra",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Impaciencia",
      "prefix": "IN-/IL-/IM-",
      "meaningHint": "negación o interioridad según la palabra",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Impasible",
      "prefix": "IN-/IL-/IM-",
      "meaningHint": "negación o interioridad según la palabra",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Importar",
      "prefix": "IN-/IL-/IM-",
      "meaningHint": "negación o interioridad según la palabra",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Imprevisto",
      "prefix": "IN-/IL-/IM-",
      "meaningHint": "negación o interioridad según la palabra",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Inaudito",
      "prefix": "IN-/IL-/IM-",
      "meaningHint": "negación o interioridad según la palabra",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Incluir",
      "prefix": "IN-/IL-/IM-",
      "meaningHint": "negación o interioridad según la palabra",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Incoloro",
      "prefix": "IN-/IL-/IM-",
      "meaningHint": "negación o interioridad según la palabra",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Infrecuente",
      "prefix": "IN-/IL-/IM-",
      "meaningHint": "negación o interioridad según la palabra",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Inmortal",
      "prefix": "IN-/IL-/IM-",
      "meaningHint": "negación o interioridad según la palabra",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Inoperante",
      "prefix": "IN-/IL-/IM-",
      "meaningHint": "negación o interioridad según la palabra",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Infradotar",
      "prefix": "INFRA-",
      "meaningHint": "debajo de, inferioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Infraestructura",
      "prefix": "INFRA-",
      "meaningHint": "debajo de, inferioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Infrahumano",
      "prefix": "INFRA-",
      "meaningHint": "debajo de, inferioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Inframundo",
      "prefix": "INFRA-",
      "meaningHint": "debajo de, inferioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Infrarrojo",
      "prefix": "INFRA-",
      "meaningHint": "debajo de, inferioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Infrasonido",
      "prefix": "INFRA-",
      "meaningHint": "debajo de, inferioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Infrautilizar",
      "prefix": "INFRA-",
      "meaningHint": "debajo de, inferioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Infravalorar",
      "prefix": "INFRA-",
      "meaningHint": "debajo de, inferioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Infravivienda",
      "prefix": "INFRA-",
      "meaningHint": "debajo de, inferioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Intercalar",
      "prefix": "INTER-",
      "meaningHint": "entre, en medio de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Interceder",
      "prefix": "INTER-",
      "meaningHint": "entre, en medio de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Intercostal",
      "prefix": "INTER-",
      "meaningHint": "entre, en medio de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Interdependencia",
      "prefix": "INTER-",
      "meaningHint": "entre, en medio de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Interferencia",
      "prefix": "INTER-",
      "meaningHint": "entre, en medio de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Interfono",
      "prefix": "INTER-",
      "meaningHint": "entre, en medio de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Interlocutor",
      "prefix": "INTER-",
      "meaningHint": "entre, en medio de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Intermedio",
      "prefix": "INTER-",
      "meaningHint": "entre, en medio de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Interministerial",
      "prefix": "INTER-",
      "meaningHint": "entre, en medio de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Internacional",
      "prefix": "INTER-",
      "meaningHint": "entre, en medio de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Interplanetario",
      "prefix": "INTER-",
      "meaningHint": "entre, en medio de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Interrelacionar",
      "prefix": "INTER-",
      "meaningHint": "entre, en medio de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Intervenir",
      "prefix": "INTER-",
      "meaningHint": "entre, en medio de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Intracelular",
      "prefix": "INTRA-",
      "meaningHint": "dentro de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Intracraneal",
      "prefix": "INTRA-",
      "meaningHint": "dentro de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Intradérmico",
      "prefix": "INTRA-",
      "meaningHint": "dentro de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Intradía",
      "prefix": "INTRA-",
      "meaningHint": "dentro de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Intramuros",
      "prefix": "INTRA-",
      "meaningHint": "dentro de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Intramuscular",
      "prefix": "INTRA-",
      "meaningHint": "dentro de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Intransitivo",
      "prefix": "INTRA-",
      "meaningHint": "dentro de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Intratable",
      "prefix": "INTRA-",
      "meaningHint": "dentro de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Intraurbano",
      "prefix": "INTRA-",
      "meaningHint": "dentro de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Intravenoso",
      "prefix": "INTRA-",
      "meaningHint": "dentro de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Percusión",
      "prefix": "PER-",
      "meaningHint": "a través de, completamente",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Percutáneo",
      "prefix": "PER-",
      "meaningHint": "a través de, completamente",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Perdurable",
      "prefix": "PER-",
      "meaningHint": "a través de, completamente",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Perfecto",
      "prefix": "PER-",
      "meaningHint": "a través de, completamente",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Perjurar",
      "prefix": "PER-",
      "meaningHint": "a través de, completamente",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Permuta",
      "prefix": "PER-",
      "meaningHint": "a través de, completamente",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Pernoctar",
      "prefix": "PER-",
      "meaningHint": "a través de, completamente",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Perseguir",
      "prefix": "PER-",
      "meaningHint": "a través de, completamente",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Perturbar",
      "prefix": "PER-",
      "meaningHint": "a través de, completamente",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Pervertir",
      "prefix": "PER-",
      "meaningHint": "a través de, completamente",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Pervivir",
      "prefix": "PER-",
      "meaningHint": "a través de, completamente",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Posbélico",
      "prefix": "POS-/POST-",
      "meaningHint": "después de, posterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Posdata",
      "prefix": "POS-/POST-",
      "meaningHint": "después de, posterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Posgrado",
      "prefix": "POS-/POST-",
      "meaningHint": "después de, posterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Posguerra",
      "prefix": "POS-/POST-",
      "meaningHint": "después de, posterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Posmoderno",
      "prefix": "POS-/POST-",
      "meaningHint": "después de, posterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Posponer",
      "prefix": "POS-/POST-",
      "meaningHint": "después de, posterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Postdata",
      "prefix": "POS-/POST-",
      "meaningHint": "después de, posterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Postdoctoral",
      "prefix": "POS-/POST-",
      "meaningHint": "después de, posterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Postergar",
      "prefix": "POS-/POST-",
      "meaningHint": "después de, posterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Postónico",
      "prefix": "POS-/POST-",
      "meaningHint": "después de, posterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Postoperatorio",
      "prefix": "POS-/POST-",
      "meaningHint": "después de, posterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Postparto",
      "prefix": "POS-/POST-",
      "meaningHint": "después de, posterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Preaviso",
      "prefix": "PRE-",
      "meaningHint": "antes de, anterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Precaución",
      "prefix": "PRE-",
      "meaningHint": "antes de, anterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Preclaro",
      "prefix": "PRE-",
      "meaningHint": "antes de, anterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Predecir",
      "prefix": "PRE-",
      "meaningHint": "antes de, anterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Predicción",
      "prefix": "PRE-",
      "meaningHint": "antes de, anterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Preescolar",
      "prefix": "PRE-",
      "meaningHint": "antes de, anterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Preferencia",
      "prefix": "PRE-",
      "meaningHint": "antes de, anterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Prefijar",
      "prefix": "PRE-",
      "meaningHint": "antes de, anterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Prefijo",
      "prefix": "PRE-",
      "meaningHint": "antes de, anterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Prehistoria",
      "prefix": "PRE-",
      "meaningHint": "antes de, anterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Prejuicio",
      "prefix": "PRE-",
      "meaningHint": "antes de, anterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Prematuro",
      "prefix": "PRE-",
      "meaningHint": "antes de, anterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Premonición",
      "prefix": "PRE-",
      "meaningHint": "antes de, anterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Prever",
      "prefix": "PRE-",
      "meaningHint": "antes de, anterioridad",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Proamnistía",
      "prefix": "PRO-",
      "meaningHint": "hacia delante, en favor de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Proclamar",
      "prefix": "PRO-",
      "meaningHint": "hacia delante, en favor de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Procónsul",
      "prefix": "PRO-",
      "meaningHint": "hacia delante, en favor de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Progenitor",
      "prefix": "PRO-",
      "meaningHint": "hacia delante, en favor de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Progenitura",
      "prefix": "PRO-",
      "meaningHint": "hacia delante, en favor de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Progubernamental",
      "prefix": "PRO-",
      "meaningHint": "hacia delante, en favor de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Promotor",
      "prefix": "PRO-",
      "meaningHint": "hacia delante, en favor de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Promover",
      "prefix": "PRO-",
      "meaningHint": "hacia delante, en favor de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Pronombre",
      "prefix": "PRO-",
      "meaningHint": "hacia delante, en favor de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Proponer",
      "prefix": "PRO-",
      "meaningHint": "hacia delante, en favor de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Proseguir",
      "prefix": "PRO-",
      "meaningHint": "hacia delante, en favor de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Proyecto",
      "prefix": "PRO-",
      "meaningHint": "hacia delante, en favor de",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Recámara",
      "prefix": "RE-/RED-",
      "meaningHint": "repetición, retroceso o intensificación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Recargar",
      "prefix": "RE-/RED-",
      "meaningHint": "repetición, retroceso o intensificación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Reconstruir",
      "prefix": "RE-/RED-",
      "meaningHint": "repetición, retroceso o intensificación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Redención",
      "prefix": "RE-/RED-",
      "meaningHint": "repetición, retroceso o intensificación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Referencia",
      "prefix": "RE-/RED-",
      "meaningHint": "repetición, retroceso o intensificación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Refluir",
      "prefix": "RE-/RED-",
      "meaningHint": "repetición, retroceso o intensificación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Renombre",
      "prefix": "RE-/RED-",
      "meaningHint": "repetición, retroceso o intensificación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Reponer",
      "prefix": "RE-/RED-",
      "meaningHint": "repetición, retroceso o intensificación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Reprobar",
      "prefix": "RE-/RED-",
      "meaningHint": "repetición, retroceso o intensificación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Repugnar",
      "prefix": "RE-/RED-",
      "meaningHint": "repetición, retroceso o intensificación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Reseco",
      "prefix": "RE-/RED-",
      "meaningHint": "repetición, retroceso o intensificación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Resistencia",
      "prefix": "RE-/RED-",
      "meaningHint": "repetición, retroceso o intensificación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Resurrección",
      "prefix": "RE-/RED-",
      "meaningHint": "repetición, retroceso o intensificación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Revivir",
      "prefix": "RE-/RED-",
      "meaningHint": "repetición, retroceso o intensificación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Retroactivo",
      "prefix": "RETRO-",
      "meaningHint": "hacia atrás",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Retroalimentación",
      "prefix": "RETRO-",
      "meaningHint": "hacia atrás",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Retroceder",
      "prefix": "RETRO-",
      "meaningHint": "hacia atrás",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Retrógrado",
      "prefix": "RETRO-",
      "meaningHint": "hacia atrás",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Retroiluminar",
      "prefix": "RETRO-",
      "meaningHint": "hacia atrás",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Retropropulsión",
      "prefix": "RETRO-",
      "meaningHint": "hacia atrás",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Retrospección",
      "prefix": "RETRO-",
      "meaningHint": "hacia atrás",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Retrospectiva",
      "prefix": "RETRO-",
      "meaningHint": "hacia atrás",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Retrotraer",
      "prefix": "RETRO-",
      "meaningHint": "hacia atrás",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Retrovisor",
      "prefix": "RETRO-",
      "meaningHint": "hacia atrás",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Sofrito",
      "prefix": "SUB(S)-/SU(S)-/SO(S)-",
      "meaningHint": "debajo de, subordinación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Soterrar",
      "prefix": "SUB(S)-/SU(S)-/SO(S)-",
      "meaningHint": "debajo de, subordinación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Subacuático",
      "prefix": "SUB(S)-/SU(S)-/SO(S)-",
      "meaningHint": "debajo de, subordinación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Subarrendar",
      "prefix": "SUB(S)-/SU(S)-/SO(S)-",
      "meaningHint": "debajo de, subordinación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Subconsciente",
      "prefix": "SUB(S)-/SU(S)-/SO(S)-",
      "meaningHint": "debajo de, subordinación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Subdelegado",
      "prefix": "SUB(S)-/SU(S)-/SO(S)-",
      "meaningHint": "debajo de, subordinación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Subempleo",
      "prefix": "SUB(S)-/SU(S)-/SO(S)-",
      "meaningHint": "debajo de, subordinación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Submarino",
      "prefix": "SUB(S)-/SU(S)-/SO(S)-",
      "meaningHint": "debajo de, subordinación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Subordinación",
      "prefix": "SUB(S)-/SU(S)-/SO(S)-",
      "meaningHint": "debajo de, subordinación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Subsiguiente",
      "prefix": "SUB(S)-/SU(S)-/SO(S)-",
      "meaningHint": "debajo de, subordinación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Subsuelo",
      "prefix": "SUB(S)-/SU(S)-/SO(S)-",
      "meaningHint": "debajo de, subordinación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Subterráneo",
      "prefix": "SUB(S)-/SU(S)-/SO(S)-",
      "meaningHint": "debajo de, subordinación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Subyugar",
      "prefix": "SUB(S)-/SU(S)-/SO(S)-",
      "meaningHint": "debajo de, subordinación",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Transacción",
      "prefix": "TRANS-/TRA-/TRAS-",
      "meaningHint": "a través de, al otro lado, cambio",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Transalpino",
      "prefix": "TRANS-/TRA-/TRAS-",
      "meaningHint": "a través de, al otro lado, cambio",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Transatlántico",
      "prefix": "TRANS-/TRA-/TRAS-",
      "meaningHint": "a través de, al otro lado, cambio",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Transcribir",
      "prefix": "TRANS-/TRA-/TRAS-",
      "meaningHint": "a través de, al otro lado, cambio",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Transeunte",
      "prefix": "TRANS-/TRA-/TRAS-",
      "meaningHint": "a través de, al otro lado, cambio",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Transeúnte",
      "prefix": "TRANS-/TRA-/TRAS-",
      "meaningHint": "a través de, al otro lado, cambio",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Transfiguración",
      "prefix": "TRANS-/TRA-/TRAS-",
      "meaningHint": "a través de, al otro lado, cambio",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Transformar",
      "prefix": "TRANS-/TRA-/TRAS-",
      "meaningHint": "a través de, al otro lado, cambio",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Transición",
      "prefix": "TRANS-/TRA-/TRAS-",
      "meaningHint": "a través de, al otro lado, cambio",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Translúcido",
      "prefix": "TRANS-/TRA-/TRAS-",
      "meaningHint": "a través de, al otro lado, cambio",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Trasalpino",
      "prefix": "TRANS-/TRA-/TRAS-",
      "meaningHint": "a través de, al otro lado, cambio",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Trascendental",
      "prefix": "TRANS-/TRA-/TRAS-",
      "meaningHint": "a través de, al otro lado, cambio",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Trasladar",
      "prefix": "TRANS-/TRA-/TRAS-",
      "meaningHint": "a través de, al otro lado, cambio",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Traslúcido",
      "prefix": "TRANS-/TRA-/TRAS-",
      "meaningHint": "a través de, al otro lado, cambio",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Trastienda",
      "prefix": "TRANS-/TRA-/TRAS-",
      "meaningHint": "a través de, al otro lado, cambio",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Travestismo",
      "prefix": "TRANS-/TRA-/TRAS-",
      "meaningHint": "a través de, al otro lado, cambio",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Ulterior",
      "prefix": "ULTER-/ULTRA-",
      "meaningHint": "más allá de, exceso",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Ultraderecha",
      "prefix": "ULTER-/ULTRA-",
      "meaningHint": "más allá de, exceso",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Ultraligero",
      "prefix": "ULTER-/ULTRA-",
      "meaningHint": "más allá de, exceso",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Ultramar",
      "prefix": "ULTER-/ULTRA-",
      "meaningHint": "más allá de, exceso",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Ultramarino",
      "prefix": "ULTER-/ULTRA-",
      "meaningHint": "más allá de, exceso",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Ultrarrápido",
      "prefix": "ULTER-/ULTRA-",
      "meaningHint": "más allá de, exceso",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Ultrasensible",
      "prefix": "ULTER-/ULTRA-",
      "meaningHint": "más allá de, exceso",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Ultrasónico",
      "prefix": "ULTER-/ULTRA-",
      "meaningHint": "más allá de, exceso",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Ultrasonido",
      "prefix": "ULTER-/ULTRA-",
      "meaningHint": "más allá de, exceso",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Ultratumba",
      "prefix": "ULTER-/ULTRA-",
      "meaningHint": "más allá de, exceso",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    },
    {
      "prompt": "Ultravioleta",
      "prefix": "ULTER-/ULTRA-",
      "meaningHint": "más allá de, exceso",
      "meaningStatus": "orientativo; requiere validación semántica caso por caso"
    }
  ],
  "latinisms": [
    {
      "number": 1,
      "prompt": "a posteriori",
      "answer": "Después de examinar el asunto; posteriormente."
    },
    {
      "number": 2,
      "prompt": "a priori",
      "answer": "Antes de examinar el asunto; previamente."
    },
    {
      "number": 3,
      "prompt": "ab initio",
      "answer": "Desde el principio; también desde tiempo inmemorial."
    },
    {
      "number": 4,
      "prompt": "accessit",
      "answer": "Recompensa inmediatamente inferior al premio en certámenes."
    },
    {
      "number": 5,
      "prompt": "ad hoc",
      "answer": "Hecho o dispuesto especialmente para un fin determinado; adecuado para ese fin."
    },
    {
      "number": 6,
      "prompt": "ad infinitum",
      "answer": "Indefinidamente, sin límite."
    },
    {
      "number": 7,
      "prompt": "ad kalendas graecas",
      "answer": "En un plazo que nunca se cumplirá; nunca."
    },
    {
      "number": 8,
      "prompt": "ad nauseam",
      "answer": "Hasta la náusea; de manera excesivamente repetitiva."
    },
    {
      "number": 9,
      "prompt": "addenda",
      "answer": "Apéndice, especialmente de un libro; literalmente, lo que debe añadirse."
    },
    {
      "number": 10,
      "prompt": "alias",
      "answer": "Apodo o sobrenombre; también 'por otro nombre'."
    },
    {
      "number": 11,
      "prompt": "alma mater",
      "answer": "Universidad; literalmente, madre nutricia."
    },
    {
      "number": 12,
      "prompt": "alter ego",
      "answer": "Persona de plena confianza que puede representar a otra; también reflejo de otra persona."
    },
    {
      "number": 13,
      "prompt": "ante meridiem",
      "answer": "Antes del mediodía; para señalar horas anteriores a las doce."
    },
    {
      "number": 14,
      "prompt": "bis",
      "answer": "Repetición o pieza fuera de programa; también adjunto a un número o una persona equivalente."
    },
    {
      "number": 15,
      "prompt": "campus",
      "answer": "Conjunto de terrenos y edificios de una universidad."
    },
    {
      "number": 16,
      "prompt": "carpe diem",
      "answer": "Exhortación a aprovechar el presente ante la fugacidad del tiempo."
    },
    {
      "number": 17,
      "prompt": "casus belli",
      "answer": "Motivo de guerra o de cualquier conflicto."
    },
    {
      "number": 18,
      "prompt": "corpus",
      "answer": "Conjunto extenso y ordenado de datos o textos que sirven para investigar."
    },
    {
      "number": 19,
      "prompt": "cum laude",
      "answer": "Calificación máxima, especialmente de ciertos doctorados."
    },
    {
      "number": 20,
      "prompt": "curriculum",
      "answer": "Plan de estudios; historial formativo; curriculum vitae: relación de méritos, cargos y datos biográficos."
    },
    {
      "number": 21,
      "prompt": "de facto",
      "answer": "De hecho, sin ajustarse necesariamente a una norma jurídica previa."
    },
    {
      "number": 22,
      "prompt": "de iure",
      "answer": "De derecho, por disposición de la ley; se contrapone a de facto."
    },
    {
      "number": 23,
      "prompt": "deficit",
      "answer": "Falta o escasez; diferencia negativa entre recursos y obligaciones o gastos."
    },
    {
      "number": 24,
      "prompt": "delirium tremens",
      "answer": "Delirio con agitación y alucinaciones relacionado con alcoholismo crónico."
    },
    {
      "number": 25,
      "prompt": "desiderata",
      "answer": "Conjunto o relación de cosas que se echan en falta y se desean."
    },
    {
      "number": 26,
      "prompt": "deus ex machina",
      "answer": "Intervención inesperada que resuelve un conflicto; originalmente, divinidad que descendía al escenario por un mecanismo teatral."
    },
    {
      "number": 27,
      "prompt": "etcétera",
      "answer": "Y lo demás; abreviatura etc."
    },
    {
      "number": 28,
      "prompt": "ex abrupto",
      "answer": "De repente, de manera brusca o imprevista."
    },
    {
      "number": 29,
      "prompt": "ex aequo",
      "answer": "En igualdad para compartir una posición o un premio."
    },
    {
      "number": 30,
      "prompt": "ex libris",
      "answer": "Etiqueta o sello que indica la propiedad de un libro."
    },
    {
      "number": 31,
      "prompt": "ex professo",
      "answer": "De propósito, con intención; también exprofeso."
    },
    {
      "number": 32,
      "prompt": "extramuros",
      "answer": "Fuera del recinto de una ciudad o población."
    },
    {
      "number": 33,
      "prompt": "gratis et amore",
      "answer": "Gratuitamente; de gracia y por amor."
    },
    {
      "number": 34,
      "prompt": "grosso modo",
      "answer": "Aproximadamente, a grandes rasgos."
    },
    {
      "number": 35,
      "prompt": "habitat",
      "answer": "Medio o lugar con condiciones adecuadas para la vida de un organismo; también entorno personal o construido."
    },
    {
      "number": 36,
      "prompt": "honoris causa",
      "answer": "Distinción académica otorgada por méritos especiales."
    },
    {
      "number": 37,
      "prompt": "horror vacui",
      "answer": "Tendencia a llenar todo el espacio, especialmente en decoración."
    },
    {
      "number": 38,
      "prompt": "idem",
      "answer": "El mismo, lo mismo."
    },
    {
      "number": 39,
      "prompt": "in absentia",
      "answer": "En ausencia."
    },
    {
      "number": 40,
      "prompt": "in extremis",
      "answer": "En los últimos instantes de una vida o de una situación comprometida."
    },
    {
      "number": 41,
      "prompt": "in fraganti",
      "answer": "En el momento mismo de cometer un delito o acto censurable."
    },
    {
      "number": 42,
      "prompt": "in medias res",
      "answer": "En plena acción; especialmente, modo de iniciar una narración."
    },
    {
      "number": 43,
      "prompt": "in memoriam",
      "answer": "En memoria o recuerdo de alguien."
    },
    {
      "number": 44,
      "prompt": "in mente",
      "answer": "En la mente, mentalmente."
    },
    {
      "number": 45,
      "prompt": "in situ",
      "answer": "En el lugar, en el sitio."
    },
    {
      "number": 46,
      "prompt": "in vitro",
      "answer": "Realizado en laboratorio por métodos experimentales, frente a in vivo."
    },
    {
      "number": 47,
      "prompt": "inter nos",
      "answer": "Entre nosotros."
    },
    {
      "number": 48,
      "prompt": "ipso facto",
      "answer": "Inmediatamente, en el acto, por el hecho mismo."
    },
    {
      "number": 49,
      "prompt": "lapsus",
      "answer": "Error involuntario; lapsus calami: error al escribir; lapsus linguae: error al hablar."
    },
    {
      "number": 50,
      "prompt": "mare magnum",
      "answer": "Confusión, desorden o multitud abundante de personas o cosas."
    },
    {
      "number": 51,
      "prompt": "mea culpa",
      "answer": "Reconocimiento de la propia culpa."
    },
    {
      "number": 52,
      "prompt": "memorandum",
      "answer": "Informe o nota recordatoria; comunicación diplomática o cuaderno de apuntes."
    },
    {
      "number": 53,
      "prompt": "modus operandi",
      "answer": "Forma característica de actuar o trabajar para alcanzar un fin."
    },
    {
      "number": 54,
      "prompt": "modus vivendi",
      "answer": "Modo de vivir o ganarse la vida; también acuerdo transitorio entre partes."
    },
    {
      "number": 55,
      "prompt": "motu proprio",
      "answer": "Por propia iniciativa y libremente; también documento pontificio o real."
    },
    {
      "number": 56,
      "prompt": "mutatis mutandis",
      "answer": "Cambiando lo que deba cambiarse."
    },
    {
      "number": 57,
      "prompt": "numerus clausus",
      "answer": "Limitación del número de plazas de una institución."
    },
    {
      "number": 58,
      "prompt": "opera prima",
      "answer": "Primera obra de un autor."
    },
    {
      "number": 59,
      "prompt": "peccata minuta",
      "answer": "Falta leve o cosa de poca importancia."
    },
    {
      "number": 60,
      "prompt": "per capita",
      "answer": "Por cabeza, por cada individuo."
    },
    {
      "number": 61,
      "prompt": "per se",
      "answer": "Por sí o por sí mismo."
    },
    {
      "number": 62,
      "prompt": "persona non grata",
      "answer": "Persona rechazada por un Gobierno o institución."
    },
    {
      "number": 63,
      "prompt": "placebo",
      "answer": "Sustancia sin acción terapéutica propia que produce efecto favorable por la expectativa de quien la recibe."
    },
    {
      "number": 64,
      "prompt": "placet",
      "answer": "Aprobación u opinión favorable; en diplomacia, consentimiento para la representación de otro Estado."
    },
    {
      "number": 65,
      "prompt": "plus",
      "answer": "Complemento o suplemento adicional, monetario o no."
    },
    {
      "number": 66,
      "prompt": "post meridiem",
      "answer": "Después del mediodía; horas posteriores a las doce."
    },
    {
      "number": 67,
      "prompt": "post mortem",
      "answer": "Después de la muerte."
    },
    {
      "number": 68,
      "prompt": "primus inter pares",
      "answer": "El primero entre iguales."
    },
    {
      "number": 69,
      "prompt": "quid",
      "answer": "Esencia, cuestión principal o porqué de algo."
    },
    {
      "number": 70,
      "prompt": "quid pro quo",
      "answer": "Cosa recibida por otra equivalente; también confusión de una cosa o persona con otra."
    },
    {
      "number": 71,
      "prompt": "quorum",
      "answer": "Número de miembros necesario para tomar ciertos acuerdos; cuórum."
    },
    {
      "number": 72,
      "prompt": "rara avis",
      "answer": "Persona o cosa excepcional, fuera de lo común."
    },
    {
      "number": 73,
      "prompt": "referendum",
      "answer": "Consulta o procedimiento de votación popular de decisiones trascendentes; también petición diplomática de instrucciones."
    },
    {
      "number": 74,
      "prompt": "requiem",
      "answer": "Composición musical de la misa de difuntos."
    },
    {
      "number": 75,
      "prompt": "rictus",
      "answer": "Gesto o contracción del rostro o de los labios."
    },
    {
      "number": 76,
      "prompt": "rigor mortis",
      "answer": "Rigidez cadavérica."
    },
    {
      "number": 77,
      "prompt": "sine die",
      "answer": "Sin fecha o plazo fijo."
    },
    {
      "number": 78,
      "prompt": "sine qua non",
      "answer": "Condición indispensable para algo."
    },
    {
      "number": 79,
      "prompt": "statu quo",
      "answer": "Estado de cosas en un momento determinado."
    },
    {
      "number": 80,
      "prompt": "stricto sensu",
      "answer": "En sentido estricto."
    },
    {
      "number": 81,
      "prompt": "sui generis",
      "answer": "De género singular, peculiar o excepcional."
    },
    {
      "number": 82,
      "prompt": "superavit",
      "answer": "Exceso de ingresos sobre gastos, de haber sobre debe, o abundancia."
    },
    {
      "number": 83,
      "prompt": "ultimatum",
      "answer": "Resolución o exigencia terminante y definitiva."
    },
    {
      "number": 84,
      "prompt": "vademécum",
      "answer": "Manual breve de consulta inmediata; también cartapacio escolar."
    },
    {
      "number": 85,
      "prompt": "vade retro",
      "answer": "Expresión para rechazar a alguien o algo; vete atrás."
    },
    {
      "number": 86,
      "prompt": "verbi gratia",
      "answer": "Por ejemplo."
    },
    {
      "number": 87,
      "prompt": "vox populi",
      "answer": "Conocido o repetido por todos; voz del pueblo."
    }
  ],
  "phonetics": [
    {
      "id": "EVF-0001",
      "latin": "abbatem",
      "castellano": "abad",
      "normas": [
        "N15",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "PATRIMONIAL",
      "fuente": ""
    },
    {
      "id": "EVF-0007",
      "latin": "advocatum",
      "castellano": "abogado",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "PATRIMONIAL",
      "fuente": ""
    },
    {
      "id": "EVF-0008",
      "latin": "ætatem",
      "castellano": "edad",
      "normas": [
        "N12",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "PATRIMONIAL",
      "fuente": ""
    },
    {
      "id": "EVF-0009",
      "latin": "alienam",
      "castellano": "ajena",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "PATRIMONIAL",
      "fuente": ""
    },
    {
      "id": "EVF-0015",
      "latin": "ampullam",
      "castellano": "ampolla",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "PATRIMONIAL",
      "fuente": ""
    },
    {
      "id": "EVF-0016",
      "latin": "ansam",
      "castellano": "asa",
      "normas": [
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "PATRIMONIAL",
      "fuente": ""
    },
    {
      "id": "EVF-0022",
      "latin": "aquam",
      "castellano": "agua",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "PATRIMONIAL",
      "fuente": ""
    },
    {
      "id": "EVF-0024",
      "latin": "asĭnum",
      "castellano": "asno",
      "normas": [
        "N01",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://fegalaz.usc.es/~gamallo/aulas/etim/mater_fonetica.htm"
    },
    {
      "id": "EVF-0025",
      "latin": "aucam",
      "castellano": "oca",
      "normas": [
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://fegalaz.usc.es/~gamallo/aulas/etim/mater_fonetica.htm"
    },
    {
      "id": "EVF-0028",
      "latin": "auricŭlam",
      "castellano": "oreja",
      "normas": [
        "N01",
        "N12",
        "N16",
        "N20"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://fegalaz.usc.es/~gamallo/aulas/etim/mater_fonetica.htm"
    },
    {
      "id": "EVF-0029",
      "latin": "aurum",
      "castellano": "oro",
      "normas": [
        "N01",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://fegalaz.usc.es/~gamallo/aulas/etim/mater_fonetica.htm"
    },
    {
      "id": "EVF-0031",
      "latin": "aut",
      "castellano": "o",
      "normas": [
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://fegalaz.usc.es/~gamallo/aulas/etim/mater_fonetica.htm"
    },
    {
      "id": "EVF-0033",
      "latin": "bŏnam",
      "castellano": "buena",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://fegalaz.usc.es/~gamallo/aulas/etim/mater_fonetica.htm"
    },
    {
      "id": "EVF-0034",
      "latin": "cadere",
      "castellano": "caer",
      "normas": [
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://fegalaz.usc.es/~gamallo/aulas/etim/mater_fonetica.htm"
    },
    {
      "id": "EVF-0035",
      "latin": "cæcare",
      "castellano": "cegar",
      "normas": [
        "N12",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://fegalaz.usc.es/~gamallo/aulas/etim/mater_fonetica.htm"
    },
    {
      "id": "EVF-0036",
      "latin": "cæcum",
      "castellano": "ciego",
      "normas": [
        "N01",
        "N07",
        "N12",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://fegalaz.usc.es/~gamallo/aulas/etim/mater_fonetica.htm"
    },
    {
      "id": "EVF-0039",
      "latin": "cælum",
      "castellano": "cielo",
      "normas": [
        "N01",
        "N07",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://fegalaz.usc.es/~gamallo/aulas/etim/mater_fonetica.htm"
    },
    {
      "id": "EVF-0041",
      "latin": "cænum",
      "castellano": "cieno",
      "normas": [
        "N01",
        "N07",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://fegalaz.usc.es/~gamallo/aulas/etim/mater_fonetica.htm"
    },
    {
      "id": "EVF-0043",
      "latin": "calĕntem",
      "castellano": "caliente",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://fegalaz.usc.es/~gamallo/aulas/etim/mater_fonetica.htm"
    },
    {
      "id": "EVF-0045",
      "latin": "cannam",
      "castellano": "caña",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://academialatin.com/teoria-evolucion-de-palabras-latinas-al-espanol/"
    },
    {
      "id": "EVF-0046",
      "latin": "capere",
      "castellano": "caber",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.apuntes-selectividad.com/latin/evolucion-del-latin-al-castellano/"
    },
    {
      "id": "EVF-0047",
      "latin": "capillum",
      "castellano": "cabello",
      "normas": [
        "N01",
        "N13",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://academialatin.com/teoria-evolucion-de-palabras-latinas-al-espanol/"
    },
    {
      "id": "EVF-0048",
      "latin": "capram",
      "castellano": "cabra",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://mediateca.educa.madrid.org/video/y697o5xtrtvoux2e"
    },
    {
      "id": "EVF-0049",
      "latin": "caput",
      "castellano": "cabo",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iedra.es/palabras/cabo"
    },
    {
      "id": "EVF-0051",
      "latin": "catenam",
      "castellano": "cadena",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.apuntes-selectividad.com/latin/evolucion-del-latin-al-castellano/"
    },
    {
      "id": "EVF-0053",
      "latin": "causam",
      "castellano": "cosa",
      "normas": [
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.apuntes-selectividad.com/latin/evolucion-del-latin-al-castellano/"
    },
    {
      "id": "EVF-0054",
      "latin": "cĕntum",
      "castellano": "ciento",
      "normas": [
        "N01",
        "N07",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://academialatin.com/teoria-evolucion-de-palabras-latinas-al-espanol/"
    },
    {
      "id": "EVF-0056",
      "latin": "cĕrvum",
      "castellano": "ciervo",
      "normas": [
        "N01",
        "N07",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://academialatin.com/teoria-evolucion-de-palabras-latinas-al-espanol/"
    },
    {
      "id": "EVF-0057",
      "latin": "chŏrdam",
      "castellano": "cuerda",
      "normas": [
        "N07",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.apuntes-selectividad.com/latin/evolucion-del-latin-al-castellano/"
    },
    {
      "id": "EVF-0059",
      "latin": "clamare",
      "castellano": "llamar",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.apuntes-selectividad.com/latin/evolucion-fonetica-del-latin-al-castellano-ejemplos/"
    },
    {
      "id": "EVF-0060",
      "latin": "clavem",
      "castellano": "llave",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.apuntes-selectividad.com/latin/evolucion-fonetica-del-latin-al-castellano-ejemplos/"
    },
    {
      "id": "EVF-0062",
      "latin": "collum",
      "castellano": "cuello",
      "normas": [
        "N01",
        "N07",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://academialatin.com/teoria-evolucion-de-palabras-latinas-al-espanol/"
    },
    {
      "id": "EVF-0063",
      "latin": "comitem",
      "castellano": "conde",
      "normas": [
        "N04",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.apuntes-selectividad.com/latin/evolucion-del-latin-al-castellano/"
    },
    {
      "id": "EVF-0064",
      "latin": "compărāre",
      "castellano": "comprar",
      "normas": [
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.apuntes-selectividad.com/latin/evolucion-del-latin-al-castellano/"
    },
    {
      "id": "EVF-0068",
      "latin": "consilium",
      "castellano": "consejo",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://academialatin.com/teoria-evolucion-de-palabras-latinas-al-espanol/"
    },
    {
      "id": "EVF-0069",
      "latin": "cŏrium",
      "castellano": "cuero",
      "normas": [
        "N01",
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.apuntes-selectividad.com/latin/evolucion-del-latin-al-castellano/"
    },
    {
      "id": "EVF-0070",
      "latin": "cŏrnu",
      "castellano": "cuerno",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://academialatin.com/teoria-evolucion-de-palabras-latinas-al-espanol/"
    },
    {
      "id": "EVF-0071",
      "latin": "cŏrpus",
      "castellano": "cuerpo",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://academialatin.com/teoria-evolucion-de-palabras-latinas-al-espanol/"
    },
    {
      "id": "EVF-0072",
      "latin": "coturnicem",
      "castellano": "codorniz",
      "normas": [
        "N01",
        "N03",
        "N13",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.apuntes-selectividad.com/latin/evolucion-del-latin-al-castellano/"
    },
    {
      "id": "EVF-0073",
      "latin": "credere",
      "castellano": "creer",
      "normas": [
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.apuntes-selectividad.com/latin/evolucion-del-latin-al-castellano/"
    },
    {
      "id": "EVF-0074",
      "latin": "crucem",
      "castellano": "cruz",
      "normas": [
        "N03",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://academialatin.com/teoria-evolucion-de-palabras-latinas-al-espanol/"
    },
    {
      "id": "EVF-0077",
      "latin": "cucullum",
      "castellano": "cogollo",
      "normas": [
        "N01",
        "N13",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iedra.es/palabras/cogollo"
    },
    {
      "id": "EVF-0078",
      "latin": "cultellum",
      "castellano": "cuchillo",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://academialatin.com/teoria-evolucion-de-palabras-latinas-al-espanol/"
    },
    {
      "id": "EVF-0079",
      "latin": "cunicŭlum",
      "castellano": "conejo",
      "normas": [
        "N01",
        "N16",
        "N20"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/5711"
    },
    {
      "id": "EVF-0080",
      "latin": "cupam",
      "castellano": "cuba",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.apuntes-selectividad.com/latin/evolucion-del-latin-al-castellano/"
    },
    {
      "id": "EVF-0081",
      "latin": "cuppam",
      "castellano": "copa",
      "normas": [
        "N01",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://mediateca.educa.madrid.org/video/y697o5xtrtvoux2e"
    },
    {
      "id": "EVF-0083",
      "latin": "datum",
      "castellano": "dado",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://academialatin.com/teoria-evolucion-de-palabras-latinas-al-espanol/"
    },
    {
      "id": "EVF-0084",
      "latin": "dĕcem",
      "castellano": "diez",
      "normas": [
        "N03",
        "N07",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://academialatin.com/teoria-evolucion-de-palabras-latinas-al-espanol/"
    },
    {
      "id": "EVF-0086",
      "latin": "decollare",
      "castellano": "degollar",
      "normas": [
        "N13",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://academialatin.com/teoria-evolucion-de-palabras-latinas-al-espanol/"
    },
    {
      "id": "EVF-0087",
      "latin": "delĭcātum",
      "castellano": "delgado",
      "normas": [
        "N01",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.apuntes-selectividad.com/latin/evolucion-fonetica-del-latin-al-castellano-ejemplos/"
    },
    {
      "id": "EVF-0092",
      "latin": "directum",
      "castellano": "derecho",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.delcastellano.com/evolucion/derecho-directu/"
    },
    {
      "id": "EVF-0093",
      "latin": "dixi",
      "castellano": "dije",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.apuntes-selectividad.com/latin/evolucion-del-latin-al-castellano/"
    },
    {
      "id": "EVF-0096",
      "latin": "dŏmĭnam",
      "castellano": "dueña",
      "normas": [
        "N07",
        "N13",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.apuntes-selectividad.com/latin/evolucion-fonetica-del-latin-al-castellano-de-cultismos-a-palabras-patrimoniales/"
    },
    {
      "id": "EVF-0097",
      "latin": "dŏmĭnum",
      "castellano": "dueño",
      "normas": [
        "N01",
        "N07",
        "N13",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.apuntes-selectividad.com/latin/evolucion-fonetica-del-latin-al-castellano-de-cultismos-a-palabras-patrimoniales/"
    },
    {
      "id": "EVF-0098",
      "latin": "draconem",
      "castellano": "dragón",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iessapostol.educarex.es/latin/fonetica_pau.html"
    },
    {
      "id": "EVF-0099",
      "latin": "dubĭtare",
      "castellano": "dudar",
      "normas": [
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iessapostol.educarex.es/latin/fonetica_pau.html"
    },
    {
      "id": "EVF-0100",
      "latin": "duplicare",
      "castellano": "doblegar",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/7572"
    },
    {
      "id": "EVF-0103",
      "latin": "exitum",
      "castellano": "ejido",
      "normas": [
        "N01",
        "N13",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.apuntes-selectividad.com/latin/evolucion-del-latin-al-castellano/"
    },
    {
      "id": "EVF-0104",
      "latin": "fabam",
      "castellano": "haba",
      "normas": [
        "N05"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iessapostol.educarex.es/latin/fonetica_pau.html"
    },
    {
      "id": "EVF-0105",
      "latin": "fabŭlam",
      "castellano": "habla",
      "normas": [
        "N05",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://descargas.intef.es/recursos_educativos/RED_ES/03_Eso/3/S_3_034_2025_0632/la_etimologa.html"
    },
    {
      "id": "EVF-0106",
      "latin": "factum",
      "castellano": "hecho",
      "normas": [
        "N01",
        "N05",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.apuntes-selectividad.com/latin/evolucion-fonetica-del-latin-al-castellano-de-cultismos-a-palabras-patrimoniales/"
    },
    {
      "id": "EVF-0107",
      "latin": "facturam",
      "castellano": "hechura",
      "normas": [
        "N05",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/10767"
    },
    {
      "id": "EVF-0109",
      "latin": "fænum",
      "castellano": "heno",
      "normas": [
        "N01",
        "N05",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iessapostol.educarex.es/latin/fonetica_pau.html"
    },
    {
      "id": "EVF-0110",
      "latin": "farinam",
      "castellano": "harina",
      "normas": [
        "N05"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iessapostol.educarex.es/latin/fonetica_pau.html"
    },
    {
      "id": "EVF-0111",
      "latin": "fatum",
      "castellano": "hado",
      "normas": [
        "N01",
        "N05",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iessapostol.educarex.es/latin/fonetica_pau.html"
    },
    {
      "id": "EVF-0112",
      "latin": "fĕbrem",
      "castellano": "fiebre",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iessapostol.educarex.es/latin/fonetica_pau.html"
    },
    {
      "id": "EVF-0113",
      "latin": "femĭnam",
      "castellano": "hembra",
      "normas": [
        "N05",
        "N19"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iessapostol.educarex.es/latin/fonetica_pau.html"
    },
    {
      "id": "EVF-0114",
      "latin": "fĕrrum",
      "castellano": "hierro",
      "normas": [
        "N01",
        "N05",
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iessapostol.educarex.es/latin/fonetica_pau.html"
    },
    {
      "id": "EVF-0117",
      "latin": "fĕstam",
      "castellano": "fiesta",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iessapostol.educarex.es/latin/fonetica_pau.html"
    },
    {
      "id": "EVF-0118",
      "latin": "ficum",
      "castellano": "higo",
      "normas": [
        "N01",
        "N05",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.edu.xunta.gal/centros/iescastroalobrevilagarcia/system/files/evolucion_y_ejercicios.pdf"
    },
    {
      "id": "EVF-0119",
      "latin": "filiam",
      "castellano": "hija",
      "normas": [
        "N05",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.apuntes-selectividad.com/latin/evolucion-fonetica-del-latin-al-castellano-de-cultismos-a-palabras-patrimoniales/"
    },
    {
      "id": "EVF-0120",
      "latin": "filictum",
      "castellano": "helecho",
      "normas": [
        "N01",
        "N05",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ciervalengua.wordpress.com/wp-content/uploads/2011/11/evolucic3b3n-fonc3a9tica-del-latc3adn-al-castellano.pdf"
    },
    {
      "id": "EVF-0121",
      "latin": "filium",
      "castellano": "hijo",
      "normas": [
        "N01",
        "N05",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.apuntes-selectividad.com/latin/evolucion-fonetica-del-latin-al-castellano-de-cultismos-a-palabras-patrimoniales/"
    },
    {
      "id": "EVF-0122",
      "latin": "filum",
      "castellano": "hilo",
      "normas": [
        "N01",
        "N05"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iessapostol.educarex.es/latin/fonetica_pau.html"
    },
    {
      "id": "EVF-0124",
      "latin": "flammam",
      "castellano": "llama",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.apuntes-selectividad.com/latin/evolucion-fonetica-del-latin-al-castellano-de-cultismos-a-palabras-patrimoniales/"
    },
    {
      "id": "EVF-0125",
      "latin": "fœdum",
      "castellano": "feo",
      "normas": [
        "N01",
        "N12",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iessapostol.educarex.es/latin/fonetica_pau.html"
    },
    {
      "id": "EVF-0126",
      "latin": "fŏllem",
      "castellano": "fuelle",
      "normas": [
        "N07",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iessapostol.educarex.es/latin/fonetica_pau.html"
    },
    {
      "id": "EVF-0127",
      "latin": "fŏntem",
      "castellano": "fuente",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iessapostol.educarex.es/latin/fonetica_pau.html"
    },
    {
      "id": "EVF-0128",
      "latin": "formam",
      "castellano": "horma",
      "normas": [
        "N05"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iessapostol.educarex.es/latin/fonetica_pau.html"
    },
    {
      "id": "EVF-0129",
      "latin": "fŏrtem",
      "castellano": "fuerte",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iessapostol.educarex.es/latin/fonetica_pau.html"
    },
    {
      "id": "EVF-0130",
      "latin": "fŏrtia",
      "castellano": "fuerza",
      "normas": [
        "N07",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iessapostol.educarex.es/latin/fonetica_pau.html"
    },
    {
      "id": "EVF-0131",
      "latin": "forum",
      "castellano": "fuero",
      "normas": [
        "N01",
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://elmiradoriu.wordpress.com/2024/01/30/lista-de-550-dobletes-de-palabras-patrimoniales-cultismos/"
    },
    {
      "id": "EVF-0133",
      "latin": "fricāre",
      "castellano": "fregar",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iessapostol.educarex.es/latin/fonetica_pau.html"
    },
    {
      "id": "EVF-0134",
      "latin": "frigĭdum",
      "castellano": "frío",
      "normas": [
        "N01",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://elmiradoriu.wordpress.com/2024/01/30/lista-de-550-dobletes-de-palabras-patrimoniales-cultismos/"
    },
    {
      "id": "EVF-0135",
      "latin": "fumum",
      "castellano": "humo",
      "normas": [
        "N01",
        "N05"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iessapostol.educarex.es/latin/fonetica_pau.html"
    },
    {
      "id": "EVF-0136",
      "latin": "fundum",
      "castellano": "hondo",
      "normas": [
        "N01",
        "N05"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iessapostol.educarex.es/latin/fonetica_pau.html"
    },
    {
      "id": "EVF-0137",
      "latin": "furcam",
      "castellano": "horca",
      "normas": [
        "N01",
        "N05"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iessapostol.educarex.es/latin/fonetica_pau.html"
    },
    {
      "id": "EVF-0138",
      "latin": "fustigare",
      "castellano": "hostigar",
      "normas": [
        "N01",
        "N05"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://diccet.com/2020/11/22/hostiar/"
    },
    {
      "id": "EVF-0140",
      "latin": "gĕlum",
      "castellano": "hielo",
      "normas": [
        "N01",
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/10894"
    },
    {
      "id": "EVF-0141",
      "latin": "gemmam",
      "castellano": "yema",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://diarium.usal.es/joluin/files/2019/03/Diccionario-etimologico-Y-Z.pdf"
    },
    {
      "id": "EVF-0142",
      "latin": "germanum",
      "castellano": "hermano",
      "normas": [
        "N01",
        "N02"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://s821eb5c17568d0c8.jimcontent.com/download/version/1330643059/module/5974389676/name/EVOLUCI%C3%93N%20FON%C3%89TICA%20DEL%20CASTELLANO.pdf"
    },
    {
      "id": "EVF-0143",
      "latin": "gracŭlum",
      "castellano": "grajo",
      "normas": [
        "N01",
        "N16",
        "N20"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iessapostol.educarex.es/latin/fonetica_pau.html"
    },
    {
      "id": "EVF-0144",
      "latin": "grŏssum",
      "castellano": "grueso",
      "normas": [
        "N01",
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0145",
      "latin": "grunnire",
      "castellano": "gruñir",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0146",
      "latin": "hĕrbam",
      "castellano": "hierba",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0148",
      "latin": "heredĭtātem",
      "castellano": "heredad",
      "normas": [
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0149",
      "latin": "homĭnem",
      "castellano": "hombre",
      "normas": [
        "N19"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0150",
      "latin": "hŏrtum",
      "castellano": "huerto",
      "normas": [
        "N01",
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0155",
      "latin": "insŭlam",
      "castellano": "isla",
      "normas": [
        "N15",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0156",
      "latin": "integrum",
      "castellano": "entero",
      "normas": [
        "N01",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://edea.juntadeandalucia.es/bancorecursos/file/eedd9f2c-2177-4e3b-b8ec-a1fce6b9b5e3/1/es-an_2012092413_9144852.zip/ODE-5e2c15a1-88f7-3be1-bb1b-d2662680f846/21_el_lxico_latino_cultismos_palabras_patrimoniales_y_dobletes.html?temp.hb=true&temp.hn=true"
    },
    {
      "id": "EVF-0158",
      "latin": "iudicem",
      "castellano": "juez",
      "normas": [
        "N13",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0160",
      "latin": "iurare",
      "castellano": "jurar",
      "normas": [
        "N06"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0164",
      "latin": "labŏrāre",
      "castellano": "labrar",
      "normas": [
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0165",
      "latin": "lacrimam",
      "castellano": "lágrima",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0166",
      "latin": "lactem",
      "castellano": "leche",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0167",
      "latin": "lactucam",
      "castellano": "lechuga",
      "normas": [
        "N13",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0168",
      "latin": "lacum",
      "castellano": "lago",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0171",
      "latin": "latrare",
      "castellano": "ladrar",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0172",
      "latin": "latronem",
      "castellano": "ladrón",
      "normas": [
        "N03",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0174",
      "latin": "laudare",
      "castellano": "loar",
      "normas": [
        "N12",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0175",
      "latin": "legem",
      "castellano": "ley",
      "normas": [
        "N13",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0176",
      "latin": "legere",
      "castellano": "leer",
      "normas": [
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0178",
      "latin": "lenticŭlam",
      "castellano": "lenteja",
      "normas": [
        "N16",
        "N20"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0179",
      "latin": "ligare",
      "castellano": "liar",
      "normas": [
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0180",
      "latin": "litem",
      "castellano": "lid",
      "normas": [
        "N03",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0181",
      "latin": "littĕram",
      "castellano": "letra",
      "normas": [
        "N01",
        "N15",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0182",
      "latin": "luctam",
      "castellano": "lucha",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0183",
      "latin": "lupum",
      "castellano": "lobo",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0186",
      "latin": "macrum",
      "castellano": "magro",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0187",
      "latin": "magistram",
      "castellano": "maestra",
      "normas": [
        "N01",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0188",
      "latin": "magistrum",
      "castellano": "maestro",
      "normas": [
        "N01",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0189",
      "latin": "maiorem",
      "castellano": "mayor",
      "normas": [
        "N06"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0190",
      "latin": "maium",
      "castellano": "mayo",
      "normas": [
        "N01",
        "N06"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0193",
      "latin": "martium",
      "castellano": "marzo",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0194",
      "latin": "mascŭlum",
      "castellano": "macho",
      "normas": [
        "N01",
        "N13",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0195",
      "latin": "mataxam",
      "castellano": "madeja",
      "normas": [
        "N13",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0196",
      "latin": "materiam",
      "castellano": "madera",
      "normas": [
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0197",
      "latin": "matrem",
      "castellano": "madre",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0198",
      "latin": "maurum",
      "castellano": "moro",
      "normas": [
        "N01",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0199",
      "latin": "maxillam",
      "castellano": "mejilla",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0200",
      "latin": "meliorem",
      "castellano": "mejor",
      "normas": [
        "N03",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0201",
      "latin": "mendicare",
      "castellano": "mendigar",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0202",
      "latin": "mensem",
      "castellano": "mes",
      "normas": [
        "N03",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0203",
      "latin": "mĕtum",
      "castellano": "miedo",
      "normas": [
        "N01",
        "N07",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0204",
      "latin": "milium",
      "castellano": "mijo",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0205",
      "latin": "mŏllem",
      "castellano": "muelle",
      "normas": [
        "N07",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0208",
      "latin": "mulierem",
      "castellano": "mujer",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0209",
      "latin": "multum",
      "castellano": "mucho",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0211",
      "latin": "mutabĭlem",
      "castellano": "mudable",
      "normas": [
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0212",
      "latin": "nĕbŭlam",
      "castellano": "niebla",
      "normas": [
        "N07",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0213",
      "latin": "nigram",
      "castellano": "negra",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0214",
      "latin": "noctem",
      "castellano": "noche",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0215",
      "latin": "nomĭnem",
      "castellano": "nombre",
      "normas": [
        "N19"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0217",
      "latin": "octo",
      "castellano": "ocho",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0218",
      "latin": "ocŭlos",
      "castellano": "ojos",
      "normas": [
        "N16",
        "N20"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0219",
      "latin": "ocŭlum",
      "castellano": "ojo",
      "normas": [
        "N01",
        "N16",
        "N20"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0220",
      "latin": "ollam",
      "castellano": "olla",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0221",
      "latin": "opĕram",
      "castellano": "obra",
      "normas": [
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0222",
      "latin": "ovicŭlam",
      "castellano": "oveja",
      "normas": [
        "N01",
        "N16",
        "N20"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0223",
      "latin": "pacem",
      "castellano": "paz",
      "normas": [
        "N03",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0225",
      "latin": "palumbam",
      "castellano": "paloma",
      "normas": [
        "N01",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0226",
      "latin": "pannum",
      "castellano": "paño",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0228",
      "latin": "pariētem",
      "castellano": "pared",
      "normas": [
        "N03",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0229",
      "latin": "patrem",
      "castellano": "padre",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0230",
      "latin": "paucum",
      "castellano": "poco",
      "normas": [
        "N01",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0231",
      "latin": "pectus",
      "castellano": "pecho",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0232",
      "latin": "perdicem",
      "castellano": "perdiz",
      "normas": [
        "N03",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0233",
      "latin": "pericŭlum",
      "castellano": "peligro",
      "normas": [
        "N01",
        "N11",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0234",
      "latin": "pĕrnam",
      "castellano": "pierna",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0235",
      "latin": "petram",
      "castellano": "piedra",
      "normas": [
        "N07",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0236",
      "latin": "pineam",
      "castellano": "piña",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0237",
      "latin": "pinnam",
      "castellano": "peña",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0238",
      "latin": "planctum",
      "castellano": "llanto",
      "normas": [
        "N01",
        "N13",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0240",
      "latin": "plicare",
      "castellano": "llegar",
      "normas": [
        "N01",
        "N13",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://loquens.revistas.csic.es/index.php/loquens/article/download/78/228?inline=1"
    },
    {
      "id": "EVF-0242",
      "latin": "pluviam",
      "castellano": "lluvia",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0243",
      "latin": "podium",
      "castellano": "poyo",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0244",
      "latin": "pœnam",
      "castellano": "pena",
      "normas": [
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0245",
      "latin": "pŏpŭlum",
      "castellano": "pueblo",
      "normas": [
        "N01",
        "N07",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0246",
      "latin": "pŏrcum",
      "castellano": "puerco",
      "normas": [
        "N01",
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0247",
      "latin": "pŏrtam",
      "castellano": "puerta",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0250",
      "latin": "proximum",
      "castellano": "prójimo",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0251",
      "latin": "pugnum",
      "castellano": "puño",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0252",
      "latin": "pullum",
      "castellano": "pollo",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0253",
      "latin": "quattuor",
      "castellano": "cuatro",
      "normas": [
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0255",
      "latin": "radicem",
      "castellano": "raíz",
      "normas": [
        "N03",
        "N13",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0256",
      "latin": "radium",
      "castellano": "rayo",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0258",
      "latin": "rallum",
      "castellano": "rallo",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://stel.ub.edu/diccaxv/listings/NeologismsIndex/page%3A274/sort%3Avocablo/direction%3Aasc/myLanguage%3Aes"
    },
    {
      "id": "EVF-0259",
      "latin": "rancidum",
      "castellano": "rancio",
      "normas": [
        "N01",
        "N13",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/17372"
    },
    {
      "id": "EVF-0261",
      "latin": "rapum",
      "castellano": "rabo",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0263",
      "latin": "recipere",
      "castellano": "recibir",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.ub.edu/gradia/help.php"
    },
    {
      "id": "EVF-0264",
      "latin": "regem",
      "castellano": "rey",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0266",
      "latin": "rodēre",
      "castellano": "roer",
      "normas": [
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0267",
      "latin": "rŏtam",
      "castellano": "rueda",
      "normas": [
        "N07",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0268",
      "latin": "sacratum",
      "castellano": "sagrado",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0269",
      "latin": "sagitta",
      "castellano": "saeta",
      "normas": [
        "N01",
        "N15",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0270",
      "latin": "salutem",
      "castellano": "salud",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0271",
      "latin": "saporem",
      "castellano": "sabor",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0272",
      "latin": "sationem",
      "castellano": "sazón",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0273",
      "latin": "scamnum",
      "castellano": "escaño",
      "normas": [
        "N01",
        "N13",
        "N14"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0274",
      "latin": "schŏlam",
      "castellano": "escuela",
      "normas": [
        "N07",
        "N14"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0275",
      "latin": "scutarium",
      "castellano": "escudero",
      "normas": [
        "N01",
        "N14",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0276",
      "latin": "scutum",
      "castellano": "escudo",
      "normas": [
        "N01",
        "N14",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0277",
      "latin": "sĕcat",
      "castellano": "siega",
      "normas": [
        "N07",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0280",
      "latin": "sĕmper",
      "castellano": "siempre",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0282",
      "latin": "seniorem",
      "castellano": "señor",
      "normas": [
        "N03",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0283",
      "latin": "sensum",
      "castellano": "seso",
      "normas": [
        "N01",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/19480"
    },
    {
      "id": "EVF-0284",
      "latin": "serpĕntem",
      "castellano": "serpiente",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0285",
      "latin": "sĕrvam",
      "castellano": "sierva",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0288",
      "latin": "sigĭllum",
      "castellano": "sello",
      "normas": [
        "N01",
        "N13",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0289",
      "latin": "signa",
      "castellano": "seña",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0290",
      "latin": "similiare",
      "castellano": "semejar",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0291",
      "latin": "sitim",
      "castellano": "sed",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0294",
      "latin": "sŏlet",
      "castellano": "suele",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0295",
      "latin": "sŏlĭdum",
      "castellano": "sueldo",
      "normas": [
        "N01",
        "N07",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0296",
      "latin": "sŏmnum",
      "castellano": "sueño",
      "normas": [
        "N01",
        "N07",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0297",
      "latin": "spartum",
      "castellano": "esparto",
      "normas": [
        "N01",
        "N14"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0298",
      "latin": "spathŭlam",
      "castellano": "espalda",
      "normas": [
        "N11",
        "N14",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dicciomed.usal.es/lexema/objeto-plano-y-alargado"
    },
    {
      "id": "EVF-0299",
      "latin": "spatium",
      "castellano": "espacio",
      "normas": [
        "N01",
        "N13",
        "N14"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0300",
      "latin": "specŭlum",
      "castellano": "espejo",
      "normas": [
        "N01",
        "N14",
        "N20"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0301",
      "latin": "spicam",
      "castellano": "espiga",
      "normas": [
        "N14",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0303",
      "latin": "sponsam",
      "castellano": "esposa",
      "normas": [
        "N14",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0304",
      "latin": "sponsum",
      "castellano": "esposo",
      "normas": [
        "N01",
        "N14",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0305",
      "latin": "squamam",
      "castellano": "escama",
      "normas": [
        "N14",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0306",
      "latin": "stabĭlem",
      "castellano": "estable",
      "normas": [
        "N14",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0309",
      "latin": "super",
      "castellano": "sobre",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0310",
      "latin": "supĕrāre",
      "castellano": "sobrar",
      "normas": [
        "N01",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0312",
      "latin": "tædam",
      "castellano": "tea",
      "normas": [
        "N12",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0314",
      "latin": "taurum",
      "castellano": "toro",
      "normas": [
        "N01",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0315",
      "latin": "tectum",
      "castellano": "techo",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0316",
      "latin": "tegŭlam",
      "castellano": "teja",
      "normas": [
        "N13",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0317",
      "latin": "tĕnĕrum",
      "castellano": "tierno",
      "normas": [
        "N01",
        "N07",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0319",
      "latin": "tĕrram",
      "castellano": "tierra",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0320",
      "latin": "tĕstum",
      "castellano": "tiesto",
      "normas": [
        "N01",
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0321",
      "latin": "texere",
      "castellano": "tejer",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0322",
      "latin": "timēte",
      "castellano": "temed",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0323",
      "latin": "tingit",
      "castellano": "tiñe",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0324",
      "latin": "totum",
      "castellano": "todo",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0326",
      "latin": "urticam",
      "castellano": "ortiga",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0327",
      "latin": "vadeam",
      "castellano": "vaya",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0328",
      "latin": "vaginam",
      "castellano": "vaina",
      "normas": [
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0331",
      "latin": "vĕntrem",
      "castellano": "vientre",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0332",
      "latin": "vetāre",
      "castellano": "vedar",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0333",
      "latin": "vexare",
      "castellano": "vejar",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0334",
      "latin": "villum",
      "castellano": "vello",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/21571"
    },
    {
      "id": "EVF-0335",
      "latin": "vindĭcāre",
      "castellano": "vengar",
      "normas": [
        "N01",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0336",
      "latin": "vineam",
      "castellano": "viña",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0337",
      "latin": "virtutem",
      "castellano": "virtud",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0338",
      "latin": "vitam",
      "castellano": "vida",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0339",
      "latin": "vitem",
      "castellano": "vid",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0341",
      "latin": "vittam",
      "castellano": "veta",
      "normas": [
        "N01",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0343",
      "latin": "voluntatem",
      "castellano": "voluntad",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0345",
      "latin": "angustum",
      "castellano": "angosto",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0347",
      "latin": "augustum",
      "castellano": "agosto",
      "normas": [
        "N01",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0350",
      "latin": "bibere",
      "castellano": "beber",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0351",
      "latin": "blitum",
      "castellano": "bledo",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0353",
      "latin": "buccam",
      "castellano": "boca",
      "normas": [
        "N01",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0358",
      "latin": "cibum",
      "castellano": "cebo",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0359",
      "latin": "circare",
      "castellano": "cercar",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0360",
      "latin": "cistam",
      "castellano": "cesta",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0362",
      "latin": "committere",
      "castellano": "cometer",
      "normas": [
        "N01",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0363",
      "latin": "continere",
      "castellano": "contener",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0365",
      "latin": "corrumpere",
      "castellano": "corromper",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0366",
      "latin": "cumbam",
      "castellano": "comba",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0367",
      "latin": "cuminum",
      "castellano": "comino",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0370",
      "latin": "currere",
      "castellano": "correr",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0371",
      "latin": "curtare",
      "castellano": "cortar",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0372",
      "latin": "curtum",
      "castellano": "corto",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0374",
      "latin": "duplare",
      "castellano": "doblar",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0380",
      "latin": "gubernare",
      "castellano": "gobernar",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0382",
      "latin": "gulosum",
      "castellano": "goloso",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0383",
      "latin": "gurdum",
      "castellano": "gordo",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0384",
      "latin": "guttam",
      "castellano": "gota",
      "normas": [
        "N01",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0385",
      "latin": "imperatorem",
      "castellano": "emperador",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://lalengua.es/etimologias/em/"
    },
    {
      "id": "EVF-0390",
      "latin": "inimicum",
      "castellano": "enemigo",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0391",
      "latin": "intrare",
      "castellano": "entrar",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0395",
      "latin": "linguam",
      "castellano": "lengua",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0400",
      "latin": "lutum",
      "castellano": "lodo",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0403",
      "latin": "minorem",
      "castellano": "menor",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0404",
      "latin": "minutum",
      "castellano": "menudo",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/13720"
    },
    {
      "id": "EVF-0405",
      "latin": "muscam",
      "castellano": "mosca",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0406",
      "latin": "mustum",
      "castellano": "mosto",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0408",
      "latin": "navigare",
      "castellano": "navegar",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0411",
      "latin": "nigrum",
      "castellano": "negro",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0412",
      "latin": "novitatem",
      "castellano": "novedad",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0413",
      "latin": "nucalem",
      "castellano": "nogal",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://nombrescomunes.jbb.gov.co/site/combinacion?q=1511"
    },
    {
      "id": "EVF-0416",
      "latin": "ordinare",
      "castellano": "ordenar",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0419",
      "latin": "picare",
      "castellano": "pegar",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0421",
      "latin": "pilum",
      "castellano": "pelo",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0425",
      "latin": "providere",
      "castellano": "proveer",
      "normas": [
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0426",
      "latin": "putare",
      "castellano": "podar",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0427",
      "latin": "puteum",
      "castellano": "pozo",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0428",
      "latin": "recuperare",
      "castellano": "recobrar",
      "normas": [
        "N01",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0431",
      "latin": "siccum",
      "castellano": "seco",
      "normas": [
        "N01",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0432",
      "latin": "silvam",
      "castellano": "selva",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0433",
      "latin": "sinum",
      "castellano": "seno",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0435",
      "latin": "spissum",
      "castellano": "espeso",
      "normas": [
        "N01",
        "N14",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0441",
      "latin": "supportare",
      "castellano": "soportar",
      "normas": [
        "N01",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0442",
      "latin": "surdum",
      "castellano": "sordo",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0443",
      "latin": "timorem",
      "castellano": "temor",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0448",
      "latin": "truncum",
      "castellano": "tronco",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0449",
      "latin": "turpem",
      "castellano": "torpe",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0450",
      "latin": "turrem",
      "castellano": "torre",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0451",
      "latin": "tussem",
      "castellano": "tos",
      "normas": [
        "N01",
        "N03",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0452",
      "latin": "ulmum",
      "castellano": "olmo",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0453",
      "latin": "umbilicum",
      "castellano": "ombligo",
      "normas": [
        "N01",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0454",
      "latin": "undam",
      "castellano": "onda",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0457",
      "latin": "viridem",
      "castellano": "verde",
      "normas": [
        "N01",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0488",
      "latin": "aptare",
      "castellano": "atar",
      "normas": [
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0489",
      "latin": "comitatum",
      "castellano": "condado",
      "normas": [
        "N01",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iedra.es/palabras/condado"
    },
    {
      "id": "EVF-0501",
      "latin": "rupturam",
      "castellano": "rotura",
      "normas": [
        "N01",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0502",
      "latin": "sæptum",
      "castellano": "seto",
      "normas": [
        "N01",
        "N12",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0505",
      "latin": "semitam",
      "castellano": "senda",
      "normas": [
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/19266"
    },
    {
      "id": "EVF-0507",
      "latin": "septem",
      "castellano": "siete",
      "normas": [
        "N07",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0510",
      "latin": "facere",
      "castellano": "hacer",
      "normas": [
        "N05",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0511",
      "latin": "falconem",
      "castellano": "halcón",
      "normas": [
        "N05"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0513",
      "latin": "fel",
      "castellano": "hiel",
      "normas": [
        "N05",
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0514",
      "latin": "ferire",
      "castellano": "herir",
      "normas": [
        "N05"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0516",
      "latin": "fibram",
      "castellano": "hebra",
      "normas": [
        "N01",
        "N05"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/10754"
    },
    {
      "id": "EVF-0517",
      "latin": "findere",
      "castellano": "hender",
      "normas": [
        "N01",
        "N05"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0518",
      "latin": "formicam",
      "castellano": "hormiga",
      "normas": [
        "N05",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0519",
      "latin": "fossam",
      "castellano": "huesa",
      "normas": [
        "N05",
        "N07",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/9905"
    },
    {
      "id": "EVF-0520",
      "latin": "fungum",
      "castellano": "hongo",
      "normas": [
        "N01",
        "N05"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0521",
      "latin": "furonem",
      "castellano": "hurón",
      "normas": [
        "N05"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0522",
      "latin": "furtum",
      "castellano": "hurto",
      "normas": [
        "N01",
        "N05"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0523",
      "latin": "fuscum",
      "castellano": "hosco",
      "normas": [
        "N01",
        "N05"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0526",
      "latin": "iacere",
      "castellano": "yacer",
      "normas": [
        "N06",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iedra.es/palabras/yacer"
    },
    {
      "id": "EVF-0527",
      "latin": "iactare",
      "castellano": "echar",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iedra.es/palabras/echar"
    },
    {
      "id": "EVF-0528",
      "latin": "iam",
      "castellano": "ya",
      "normas": [
        "N06"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0532",
      "latin": "iocum",
      "castellano": "juego",
      "normas": [
        "N01",
        "N06",
        "N07",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0538",
      "latin": "iuncum",
      "castellano": "junco",
      "normas": [
        "N01",
        "N06"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0545",
      "latin": "verrucam",
      "castellano": "verruga",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0547",
      "latin": "vallem",
      "castellano": "valle",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0548",
      "latin": "ventum",
      "castellano": "viento",
      "normas": [
        "N01",
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0555",
      "latin": "bene",
      "castellano": "bien",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0556",
      "latin": "bonum",
      "castellano": "bueno",
      "normas": [
        "N01",
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0562",
      "latin": "desertum",
      "castellano": "desierto",
      "normas": [
        "N01",
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0563",
      "latin": "equam",
      "castellano": "yegua",
      "normas": [
        "N07",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0565",
      "latin": "ferum",
      "castellano": "fiero",
      "normas": [
        "N01",
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0566",
      "latin": "focum",
      "castellano": "fuego",
      "normas": [
        "N01",
        "N07",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0569",
      "latin": "hederam",
      "castellano": "hiedra",
      "normas": [
        "N07",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0572",
      "latin": "hostem",
      "castellano": "hueste",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0573",
      "latin": "leporem",
      "castellano": "liebre",
      "normas": [
        "N07",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0574",
      "latin": "mel",
      "castellano": "miel",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0575",
      "latin": "membrum",
      "castellano": "miembro",
      "normas": [
        "N01",
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0576",
      "latin": "messem",
      "castellano": "mies",
      "normas": [
        "N03",
        "N07",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0578",
      "latin": "molam",
      "castellano": "muela",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0580",
      "latin": "nostrum",
      "castellano": "nuestro",
      "normas": [
        "N01",
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0581",
      "latin": "novem",
      "castellano": "nueve",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0582",
      "latin": "pedem",
      "castellano": "pie",
      "normas": [
        "N03",
        "N07",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0584",
      "latin": "pellem",
      "castellano": "piel",
      "normas": [
        "N07",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0586",
      "latin": "pontem",
      "castellano": "puente",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0589",
      "latin": "portum",
      "castellano": "puerto",
      "normas": [
        "N01",
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0592",
      "latin": "serram",
      "castellano": "sierra",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0594",
      "latin": "socerum",
      "castellano": "suegro",
      "normas": [
        "N01",
        "N07",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0596",
      "latin": "sortem",
      "castellano": "suerte",
      "normas": [
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0601",
      "latin": "carcerem",
      "castellano": "cárcel",
      "normas": [
        "N03",
        "N08"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0604",
      "latin": "marmorem",
      "castellano": "mármol",
      "normas": [
        "N03",
        "N08"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0605",
      "latin": "roborem",
      "castellano": "roble",
      "normas": [
        "N08",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0613",
      "latin": "stellam",
      "castellano": "estrella",
      "normas": [
        "N09",
        "N14"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://histetim.blogs.uv.es/cortex-cerebral/"
    },
    {
      "id": "EVF-0632",
      "latin": "chartam",
      "castellano": "carta",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0710",
      "latin": "thium",
      "castellano": "tío",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ilg.usc.gal/ddgm/ddd_pescuda.php?pescuda=tio&tipo_busca=lema"
    },
    {
      "id": "EVF-0715",
      "latin": "acerem",
      "castellano": "arce",
      "normas": [
        "N11",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0716",
      "latin": "animalia",
      "castellano": "alimaña",
      "normas": [
        "N11",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0718",
      "latin": "capitulum",
      "castellano": "cabildo",
      "normas": [
        "N01",
        "N11",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iedra.es/palabras/cabildo"
    },
    {
      "id": "EVF-0721",
      "latin": "crustam",
      "castellano": "costra",
      "normas": [
        "N01",
        "N11"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0725",
      "latin": "inter",
      "castellano": "entre",
      "normas": [
        "N11"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0726",
      "latin": "miraculum",
      "castellano": "milagro",
      "normas": [
        "N01",
        "N11",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0727",
      "latin": "parabolam",
      "castellano": "palabra",
      "normas": [
        "N11",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0729",
      "latin": "præsepem",
      "castellano": "pesebre",
      "normas": [
        "N11",
        "N12",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0732",
      "latin": "sibilare",
      "castellano": "silbar",
      "normas": [
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0733",
      "latin": "spatulam",
      "castellano": "espalda",
      "normas": [
        "N11",
        "N14",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://analesranm.es/revista/2025/142_03/14203_dle01"
    },
    {
      "id": "EVF-0744",
      "latin": "æstuarium",
      "castellano": "estero",
      "normas": [
        "N01",
        "N12",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iedra.es/palabras/estero"
    },
    {
      "id": "EVF-0746",
      "latin": "audire",
      "castellano": "oír",
      "normas": [
        "N12",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0756",
      "latin": "caulem",
      "castellano": "col",
      "normas": [
        "N03",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0757",
      "latin": "cautum",
      "castellano": "coto",
      "normas": [
        "N01",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ifc.dpz.es/recursos/publicaciones/11/33/04frago.pdf"
    },
    {
      "id": "EVF-0784",
      "latin": "pausare",
      "castellano": "posar",
      "normas": [
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0795",
      "latin": "acutiare",
      "castellano": "aguzar",
      "normas": [
        "N13",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0801",
      "latin": "alium",
      "castellano": "ajo",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0803",
      "latin": "annum",
      "castellano": "año",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0809",
      "latin": "caballum",
      "castellano": "caballo",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0812",
      "latin": "callum",
      "castellano": "callo",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0814",
      "latin": "cilia",
      "castellano": "ceja",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/4806"
    },
    {
      "id": "EVF-0819",
      "latin": "coxum",
      "castellano": "cojo",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0822",
      "latin": "damnum",
      "castellano": "daño",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0823",
      "latin": "despectum",
      "castellano": "despecho",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0826",
      "latin": "dictum",
      "castellano": "dicho",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0829",
      "latin": "ductum",
      "castellano": "ducho",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0832",
      "latin": "folia",
      "castellano": "hoja",
      "normas": [
        "N05",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0840",
      "latin": "lectum",
      "castellano": "lecho",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0841",
      "latin": "lignum",
      "castellano": "leño",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0850",
      "latin": "plagam",
      "castellano": "llaga",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0855",
      "latin": "rationem",
      "castellano": "razón",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0860",
      "latin": "sannam",
      "castellano": "saña",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0863",
      "latin": "stannum",
      "castellano": "estaño",
      "normas": [
        "N01",
        "N13",
        "N14"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0869",
      "latin": "vallatum",
      "castellano": "vallado",
      "normas": [
        "N01",
        "N13",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0873",
      "latin": "scalam",
      "castellano": "escala",
      "normas": [
        "N14"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0882",
      "latin": "spinam",
      "castellano": "espina",
      "normas": [
        "N14"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0884",
      "latin": "spumam",
      "castellano": "espuma",
      "normas": [
        "N14"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0914",
      "latin": "mensam",
      "castellano": "mesa",
      "normas": [
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0915",
      "latin": "mensuram",
      "castellano": "mesura",
      "normas": [
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0916",
      "latin": "monstrare",
      "castellano": "mostrar",
      "normas": [
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0918",
      "latin": "passum",
      "castellano": "paso",
      "normas": [
        "N01",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0919",
      "latin": "peccatum",
      "castellano": "pecado",
      "normas": [
        "N01",
        "N15",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0920",
      "latin": "pensare",
      "castellano": "pesar",
      "normas": [
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0921",
      "latin": "pinsare",
      "castellano": "pisar",
      "normas": [
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0926",
      "latin": "trans",
      "castellano": "tras",
      "normas": [
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0944",
      "latin": "amaricare",
      "castellano": "amargar",
      "normas": [
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/1552"
    },
    {
      "id": "EVF-0948",
      "latin": "bonitatem",
      "castellano": "bondad",
      "normas": [
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0949",
      "latin": "calidum",
      "castellano": "caldo",
      "normas": [
        "N01",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://aula2.educa.aragon.es/datos/espad/Lengua/bloque4/Unidad06/pagina_5.html"
    },
    {
      "id": "EVF-0951",
      "latin": "civitatem",
      "castellano": "ciudad",
      "normas": [
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0952",
      "latin": "collocare",
      "castellano": "colgar",
      "normas": [
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://aula2.educa.aragon.es/datos/espad/Lengua/bloque4/Unidad06/pagina_5.html"
    },
    {
      "id": "EVF-0958",
      "latin": "diabolum",
      "castellano": "diablo",
      "normas": [
        "N01",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0964",
      "latin": "honorare",
      "castellano": "honrar",
      "normas": [
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0979",
      "latin": "manicam",
      "castellano": "manga",
      "normas": [
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0981",
      "latin": "nobilem",
      "castellano": "noble",
      "normas": [
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0982",
      "latin": "nubilum",
      "castellano": "nublo",
      "normas": [
        "N01",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0999",
      "latin": "solidare",
      "castellano": "soldar",
      "normas": [
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-1001",
      "latin": "stabulum",
      "castellano": "establo",
      "normas": [
        "N01",
        "N14",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-1003",
      "latin": "tabulam",
      "castellano": "tabla",
      "normas": [
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-1006",
      "latin": "venabulum",
      "castellano": "venablo",
      "normas": [
        "N01",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-1007",
      "latin": "veritatem",
      "castellano": "verdad",
      "normas": [
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-1009",
      "latin": "acutum",
      "castellano": "agudo",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-1010",
      "latin": "anatem",
      "castellano": "ánade",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-1022",
      "latin": "securum",
      "castellano": "seguro",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iedra.es/palabras/seguro"
    },
    {
      "id": "EVF-1024",
      "latin": "statum",
      "castellano": "estado",
      "normas": [
        "N01",
        "N14",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-1025",
      "latin": "stratum",
      "castellano": "estrado",
      "normas": [
        "N01",
        "N14",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/8959"
    },
    {
      "id": "EVF-1026",
      "latin": "calcem",
      "castellano": "coz",
      "normas": [
        "N18"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://mas.lne.es/toponimia/index.php?leer=1%3Cspan+class%3Dresaltado%3E2%3C%2Fspan%3E9&palabra=cou"
    },
    {
      "id": "EVF-1027",
      "latin": "falcem",
      "castellano": "hoz",
      "normas": [
        "N05",
        "N18"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-1028",
      "latin": "saltum",
      "castellano": "soto",
      "normas": [
        "N01",
        "N18"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-1030",
      "latin": "faminem",
      "castellano": "hambre",
      "normas": [
        "N05",
        "N19"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-1031",
      "latin": "ferruminem",
      "castellano": "herrumbre",
      "normas": [
        "N05",
        "N19"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-1032",
      "latin": "leguminem",
      "castellano": "legumbre",
      "normas": [
        "N19"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-1034",
      "latin": "nominare",
      "castellano": "nombrar",
      "normas": [
        "N19"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-1036",
      "latin": "seminare",
      "castellano": "sembrar",
      "normas": [
        "N19"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-1037",
      "latin": "staminem",
      "castellano": "estambre",
      "normas": [
        "N14",
        "N19"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/listings/WordsBySourceView/13/page%3A162"
    },
    {
      "id": "EVF-1038",
      "latin": "acuculam",
      "castellano": "aguja",
      "normas": [
        "N17",
        "N20"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "PATRIMONIAL",
      "fuente": "https://ghcl.ub.edu/diccaxv/listings/WordsByFrequencyIndex/sort%3Aocurrencias/direction%3Aasc/page%3A3/myLanguage%3Aen"
    },
    {
      "id": "EVF-1039",
      "latin": "annuculum",
      "castellano": "añojo",
      "normas": [
        "N01",
        "N13",
        "N20"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iedra.es/palabras/a%C3%B1ojo"
    },
    {
      "id": "EVF-1040",
      "latin": "apiculam",
      "castellano": "abeja",
      "normas": [
        "N01",
        "N17",
        "N20"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "PATRIMONIAL",
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/61"
    },
    {
      "id": "EVF-1041",
      "latin": "articulum",
      "castellano": "artejo",
      "normas": [
        "N01",
        "N20"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/listings/WordsByFrequencyIndex/page%3A124/sort%3Aocurrencias/direction%3Aasc/myLanguage%3Aes"
    },
    {
      "id": "EVF-1043",
      "latin": "butticulam",
      "castellano": "botija",
      "normas": [
        "N01",
        "N15",
        "N20"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.lletresasturianes.alladixital.org/pdf/Lletres%2096%20%28dixital%29.pdf"
    },
    {
      "id": "EVF-0032",
      "latin": "autumnum",
      "castellano": "otoño",
      "normas": [
        "N01",
        "N12",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/oto%C3%B1o"
    },
    {
      "id": "EVF-0055",
      "latin": "cepullam",
      "castellano": "cebolla",
      "normas": [
        "N01",
        "N13",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/cebolla"
    },
    {
      "id": "EVF-0094",
      "latin": "dixit",
      "castellano": "dijo",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/decir"
    },
    {
      "id": "EVF-0116",
      "latin": "fervorem",
      "castellano": "hervor",
      "normas": [
        "N05"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/hervor"
    },
    {
      "id": "EVF-0157",
      "latin": "iŏvis",
      "castellano": "jueves",
      "normas": [
        "N06",
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/jueves"
    },
    {
      "id": "EVF-0163",
      "latin": "iuventutem",
      "castellano": "juventud",
      "normas": [
        "N06",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/juventud"
    },
    {
      "id": "EVF-0248",
      "latin": "pretium",
      "castellano": "precio",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/precio"
    },
    {
      "id": "EVF-0254",
      "latin": "radiare",
      "castellano": "rayar",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/rayar"
    },
    {
      "id": "EVF-0311",
      "latin": "superbiam",
      "castellano": "soberbia",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/soberbia"
    },
    {
      "id": "EVF-0325",
      "latin": "tristitiam",
      "castellano": "tristeza",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/tristeza"
    },
    {
      "id": "EVF-0375",
      "latin": "duritiam",
      "castellano": "dureza",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/dureza"
    },
    {
      "id": "EVF-0508",
      "latin": "temptare",
      "castellano": "tentar",
      "normas": [
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/tentar"
    },
    {
      "id": "EVF-0719",
      "latin": "catenatum",
      "castellano": "candado",
      "normas": [
        "N01",
        "N11",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/candado"
    },
    {
      "id": "EVF-0723",
      "latin": "integrare",
      "castellano": "entregar",
      "normas": [
        "N01",
        "N11"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/entregar"
    },
    {
      "id": "EVF-0735",
      "latin": "viduam",
      "castellano": "viuda",
      "normas": [
        "N11"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/viuda"
    },
    {
      "id": "EVF-0783",
      "latin": "pauperem",
      "castellano": "pobre",
      "normas": [
        "N12",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/pobre"
    },
    {
      "id": "EVF-0793",
      "latin": "thesaurum",
      "castellano": "tesoro",
      "normas": [
        "N01",
        "N10",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/tesoro"
    },
    {
      "id": "EVF-0800",
      "latin": "alienum",
      "castellano": "ajeno",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/ajeno"
    },
    {
      "id": "EVF-0818",
      "latin": "concilium",
      "castellano": "concejo",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/concejo"
    },
    {
      "id": "EVF-0824",
      "latin": "despoliare",
      "castellano": "despojar",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/despojar"
    },
    {
      "id": "EVF-0834",
      "latin": "gallinam",
      "castellano": "gallina",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/gallina"
    },
    {
      "id": "EVF-0858",
      "latin": "relaxare",
      "castellano": "relajar",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/relajar"
    },
    {
      "id": "EVF-0864",
      "latin": "strictum",
      "castellano": "estrecho",
      "normas": [
        "N01",
        "N13",
        "N14"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/estrecho"
    },
    {
      "id": "EVF-0868",
      "latin": "tructam",
      "castellano": "trucha",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/trucha"
    },
    {
      "id": "EVF-0911",
      "latin": "desponsare",
      "castellano": "desposar",
      "normas": [
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/desposar"
    },
    {
      "id": "EVF-0945",
      "latin": "aperire",
      "castellano": "abrir",
      "normas": [
        "N03",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "PATRIMONIAL",
      "fuente": "https://dle.rae.es/abrir"
    },
    {
      "id": "EVF-0950",
      "latin": "carricare",
      "castellano": "cargar",
      "normas": [
        "N15",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/cargar"
    },
    {
      "id": "EVF-0998",
      "latin": "sæcularem",
      "castellano": "seglar",
      "normas": [
        "N12",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/seglar"
    },
    {
      "id": "EVF-1002",
      "latin": "sucidum",
      "castellano": "sucio",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/sucio"
    },
    {
      "id": "EVF-1052",
      "latin": "sorticulam",
      "castellano": "sortija",
      "normas": [
        "N20"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://dle.rae.es/sortija"
    },
    {
      "id": "EVF-0102",
      "latin": "exercere",
      "castellano": "ejercer",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iessapostol.educarex.es/latin/fonetica_pau.html"
    },
    {
      "id": "EVF-0115",
      "latin": "fervĕntem",
      "castellano": "hirviente",
      "normas": [
        "N05",
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://stel.ub.edu/diccaxv/listings/WordsByEtymologicalFamilyView/FERVERE"
    },
    {
      "id": "EVF-0184",
      "latin": "luxum",
      "castellano": "lujo",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0191",
      "latin": "malitiam",
      "castellano": "maleza",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iedra.es/palabras/maleza"
    },
    {
      "id": "EVF-0192",
      "latin": "mancipum",
      "castellano": "mancebo",
      "normas": [
        "N01",
        "N13",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/13244"
    },
    {
      "id": "EVF-0265",
      "latin": "regŭlam",
      "castellano": "regla",
      "normas": [
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0278",
      "latin": "securitatem",
      "castellano": "seguridad",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0302",
      "latin": "spirare",
      "castellano": "espirar",
      "normas": [
        "N14"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0340",
      "latin": "vitium",
      "castellano": "vicio",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0352",
      "latin": "brevitatem",
      "castellano": "brevedad",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0364",
      "latin": "convincere",
      "castellano": "convencer",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0379",
      "latin": "gravitatem",
      "castellano": "gravedad",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0393",
      "latin": "levitatem",
      "castellano": "levedad",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0398",
      "latin": "lucrum",
      "castellano": "logro",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://es.wiktionary.org/wiki/logro"
    },
    {
      "id": "EVF-0420",
      "latin": "pigritiam",
      "castellano": "pereza",
      "normas": [
        "N01",
        "N12",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.delcastellano.com/evolucion/pereza-pigritia/"
    },
    {
      "id": "EVF-0423",
      "latin": "piscare",
      "castellano": "pescar",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0437",
      "latin": "subornare",
      "castellano": "sobornar",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0503",
      "latin": "scriptorium",
      "castellano": "escritorio",
      "normas": [
        "N01",
        "N14",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iedra.es/palabras/escritorio"
    },
    {
      "id": "EVF-0550",
      "latin": "villam",
      "castellano": "villa",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0607",
      "latin": "temperare",
      "castellano": "templar",
      "normas": [
        "N08",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iedra.es/palabras/templar"
    },
    {
      "id": "EVF-0615",
      "latin": "tonare",
      "castellano": "tronar",
      "normas": [
        "N09"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0717",
      "latin": "appectorare",
      "castellano": "apretar",
      "normas": [
        "N11",
        "N12",
        "N15",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.delcastellano.com/evolucion/apretar-appectorare/"
    },
    {
      "id": "EVF-0730",
      "latin": "pro",
      "castellano": "por",
      "normas": [
        "N11"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0749",
      "latin": "ausare",
      "castellano": "osar",
      "normas": [
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0769",
      "latin": "lautiam",
      "castellano": "loza",
      "normas": [
        "N12",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0806",
      "latin": "ballænam",
      "castellano": "ballena",
      "normas": [
        "N12",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0813",
      "latin": "castellanum",
      "castellano": "castellano",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0817",
      "latin": "collarem",
      "castellano": "collar",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0837",
      "latin": "grillum",
      "castellano": "grillo",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0852",
      "latin": "prægnare",
      "castellano": "preñar",
      "normas": [
        "N12",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0936",
      "latin": "translatum",
      "castellano": "traslado",
      "normas": [
        "N01",
        "N15",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0954",
      "latin": "consuturam",
      "castellano": "costura",
      "normas": [
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/6224"
    },
    {
      "id": "EVF-0960",
      "latin": "eremitam",
      "castellano": "ermita",
      "normas": [
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0963",
      "latin": "follicare",
      "castellano": "holgar",
      "normas": [
        "N05",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/8971"
    },
    {
      "id": "EVF-0975",
      "latin": "litigare",
      "castellano": "lidiar",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0976",
      "latin": "litteratum",
      "castellano": "letrado",
      "normas": [
        "N01",
        "N15",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0984",
      "latin": "operare",
      "castellano": "obrar",
      "normas": [
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-1004",
      "latin": "traditorem",
      "castellano": "traidor",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-1011",
      "latin": "aperturam",
      "castellano": "abertura",
      "normas": [
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-1033",
      "latin": "luminaria",
      "castellano": "lumbrera",
      "normas": [
        "N19"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/12955"
    },
    {
      "id": "EVF-0512",
      "latin": "farturam",
      "castellano": "hartura",
      "normas": [
        "N05"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0030",
      "latin": "auscultare",
      "castellano": "escuchar",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/8643"
    },
    {
      "id": "EVF-0089",
      "latin": "dicere",
      "castellano": "decir",
      "normas": [
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.apuntes-selectividad.com/latin/evolucion-del-latin-al-castellano/"
    },
    {
      "id": "EVF-0123",
      "latin": "fixum",
      "castellano": "fijo",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iedra.es/palabras/fijo"
    },
    {
      "id": "EVF-0132",
      "latin": "foveam",
      "castellano": "hoya",
      "normas": [
        "N05"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/11075"
    },
    {
      "id": "EVF-0239",
      "latin": "plānum",
      "castellano": "llano",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.educa2.madrid.org/web/dpto.-de-latin-ies-rey-pastor/lexico"
    },
    {
      "id": "EVF-0318",
      "latin": "tepidum",
      "castellano": "tibio",
      "normas": [
        "N01",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0456",
      "latin": "virginem",
      "castellano": "virgen",
      "normas": [
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-0959",
      "latin": "dominicum",
      "castellano": "domingo",
      "normas": [
        "N01",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.delcastellano.com/evolucion/domingo-dominicu/"
    },
    {
      "id": "EVF-0974",
      "latin": "limpidum",
      "castellano": "limpio",
      "normas": [
        "N01",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": ""
    },
    {
      "id": "EVF-1058",
      "latin": "sagittam",
      "castellano": "saeta",
      "normas": [
        "N01",
        "N15",
        "N16"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "Excel docente: banco_evolucion_fonetica_final_10_lotes.xlsx, fila 431"
    },
    {
      "id": "EVF-1059",
      "latin": "vivite",
      "castellano": "vivid",
      "normas": [
        "N03",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "Excel docente: banco_evolucion_fonetica_final_10_lotes.xlsx, fila 343"
    },
    {
      "id": "EVF-1060",
      "latin": "tripedem",
      "castellano": "trébede",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "Excel docente: banco_evolucion_fonetica_final_10_lotes.xlsx, fila 447"
    },
    {
      "id": "EVF-1061",
      "latin": "pelliculam",
      "castellano": "pelleja",
      "normas": [
        "N01",
        "N13",
        "N16",
        "N20"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/15830"
    },
    {
      "id": "EVF-1062",
      "latin": "audīte",
      "castellano": "oíd",
      "normas": [
        "N03",
        "N12",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://fegalaz.usc.es/~gamallo/aulas/etim/mater_fonetica.htm"
    },
    {
      "id": "EVF-1063",
      "latin": "audītum",
      "castellano": "oído",
      "normas": [
        "N01",
        "N12",
        "N16",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://fegalaz.usc.es/~gamallo/aulas/etim/mater_fonetica.htm"
    },
    {
      "id": "EVF-1064",
      "latin": "date",
      "castellano": "dad",
      "normas": [
        "N03",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://www.apuntes-selectividad.com/latin/evolucion-del-latin-al-castellano/"
    },
    {
      "id": "EVF-1065",
      "latin": "octavum",
      "castellano": "ochavo",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/14027"
    },
    {
      "id": "EVF-1066",
      "latin": "fluxum",
      "castellano": "flojo",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/9706"
    },
    {
      "id": "EVF-1067",
      "latin": "pelagum",
      "castellano": "piélago",
      "normas": [
        "N01",
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://stel.ub.edu/diccaxv/dictionary/ViewLema/16158"
    },
    {
      "id": "EVF-1068",
      "latin": "folliculum",
      "castellano": "hollejo",
      "normas": [
        "N01",
        "N05",
        "N13",
        "N20"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/listings/WordsByFrequencyIndex/page%3A544/sort%3Aocurrencias/direction%3Adesc/myLanguage%3Aes"
    },
    {
      "id": "EVF-1069",
      "latin": "gannitum",
      "castellano": "gañido",
      "normas": [
        "N01",
        "N13",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://iedra.es/palabras/ga%C3%B1ido"
    },
    {
      "id": "EVF-1070",
      "latin": "laicum",
      "castellano": "lego",
      "normas": [
        "N01",
        "N12",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/12497"
    },
    {
      "id": "EVF-1071",
      "latin": "senatum",
      "castellano": "senado",
      "normas": [
        "N01",
        "N17"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/19260"
    },
    {
      "id": "EVF-1072",
      "latin": "rixosum",
      "castellano": "rijoso",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://es.wiktionary.org/wiki/rijoso"
    },
    {
      "id": "EVF-1073",
      "latin": "virilia",
      "castellano": "verija",
      "normas": [
        "N01",
        "N13"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": null,
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/21690"
    },
    {
      "id": "EVF-1074",
      "latin": "contum",
      "castellano": "cuento",
      "normas": [
        "N01",
        "N07"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "PATRIMONIAL",
      "fuente": "https://iedra.es/palabras/cuento"
    },
    {
      "id": "EVF-1075",
      "latin": "stilum",
      "castellano": "estilo",
      "normas": [
        "N01",
        "N14"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "https://ghcl.ub.edu/diccaxv/dictionary/ViewLema/8922"
    },
    {
      "id": "EVF-1076",
      "latin": "athletam",
      "castellano": "atleta",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "https://iedra.es/palabras/atleta"
    },
    {
      "id": "EVF-1077",
      "latin": "blasphemiam",
      "castellano": "blasfemia",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "https://iedra.es/palabras/blasfemia"
    },
    {
      "id": "EVF-1078",
      "latin": "architectum",
      "castellano": "arquitecto",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "https://iedra.es/palabras/arquitecto"
    },
    {
      "id": "EVF-1079",
      "latin": "asphaltum",
      "castellano": "asfalto",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "https://iedra.es/palabras/asfalto"
    },
    {
      "id": "EVF-1080",
      "latin": "Chimæram",
      "castellano": "quimera",
      "normas": [
        "N10",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "https://iedra.es/palabras/quimera"
    },
    {
      "id": "EVF-1081",
      "latin": "Christum",
      "castellano": "Cristo",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 641; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1082",
      "latin": "chronicum",
      "castellano": "crónico",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 642; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1083",
      "latin": "chrysolithum",
      "castellano": "crisólito",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 643; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1084",
      "latin": "citharistam",
      "castellano": "citarista",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 644; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1085",
      "latin": "Clytæmnestram",
      "castellano": "Clitemnestra",
      "normas": [
        "N10",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 645; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1086",
      "latin": "cyclicum",
      "castellano": "cíclico",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 646; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1087",
      "latin": "cyclopem",
      "castellano": "cíclope",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 647; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1088",
      "latin": "cynicum",
      "castellano": "cínico",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 648; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1089",
      "latin": "dyspepsiam",
      "castellano": "dispepsia",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 649; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1090",
      "latin": "epithalamium",
      "castellano": "epitalamio",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 651; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1091",
      "latin": "epithetum",
      "castellano": "epíteto",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 652; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1092",
      "latin": "graphicum",
      "castellano": "gráfico",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 653; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1093",
      "latin": "gryphum",
      "castellano": "grifo",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 654; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1094",
      "latin": "gymnasium",
      "castellano": "gimnasio",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 655; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1095",
      "latin": "gynæceum",
      "castellano": "gineceo",
      "normas": [
        "N01",
        "N10",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 656; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1096",
      "latin": "hæresiarcham",
      "castellano": "heresiarca",
      "normas": [
        "N10",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 657; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1097",
      "latin": "hydram",
      "castellano": "hidra",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 658; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1098",
      "latin": "hydropicum",
      "castellano": "hidrópico",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 659; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1099",
      "latin": "hyperboreum",
      "castellano": "hiperbóreo",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 660; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1100",
      "latin": "Hyperionem",
      "castellano": "Hiperión",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 661; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1101",
      "latin": "hypnoticum",
      "castellano": "hipnótico",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 662; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1102",
      "latin": "hypogeum",
      "castellano": "hipogeo",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 663; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1103",
      "latin": "hypotenusam",
      "castellano": "hipotenusa",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 664; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1104",
      "latin": "Lycæum",
      "castellano": "liceo",
      "normas": [
        "N01",
        "N10",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 665; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1105",
      "latin": "myopem",
      "castellano": "miope",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 667; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1106",
      "latin": "Phædonem",
      "castellano": "Fedón",
      "normas": [
        "N10",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 668; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1107",
      "latin": "Phædram",
      "castellano": "Fedra",
      "normas": [
        "N10",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 669; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1108",
      "latin": "Phædrum",
      "castellano": "Fedro",
      "normas": [
        "N01",
        "N10",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 670; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1109",
      "latin": "phalangem",
      "castellano": "falange",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 671; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1110",
      "latin": "phantasmam",
      "castellano": "fantasma",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 672; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1111",
      "latin": "pharaonem",
      "castellano": "faraón",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 673; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1112",
      "latin": "pharmacum",
      "castellano": "fármaco",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 674; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1113",
      "latin": "Pharsaliam",
      "castellano": "Farsalia",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 675; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1114",
      "latin": "Pharum",
      "castellano": "faro",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 676; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1115",
      "latin": "philologiam",
      "castellano": "filología",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 677; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1116",
      "latin": "phosphorum",
      "castellano": "fósforo",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 680; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1117",
      "latin": "phreneticum",
      "castellano": "frenético",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 681; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1118",
      "latin": "Phrygiam",
      "castellano": "Frigia",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 682; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1119",
      "latin": "physiologiam",
      "castellano": "fisiología",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 683; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1120",
      "latin": "Pygmalionem",
      "castellano": "Pigmalión",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 685; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1121",
      "latin": "schemam",
      "castellano": "esquema",
      "normas": [
        "N10",
        "N14"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 687; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1122",
      "latin": "scholasticum",
      "castellano": "escolástico",
      "normas": [
        "N01",
        "N10",
        "N14"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 688; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1123",
      "latin": "sphæram",
      "castellano": "esfera",
      "normas": [
        "N10",
        "N12",
        "N14"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 690; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1124",
      "latin": "sphingem",
      "castellano": "esfinge",
      "normas": [
        "N10",
        "N14"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 691; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1125",
      "latin": "stropham",
      "castellano": "estrofa",
      "normas": [
        "N10",
        "N14"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 692; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1126",
      "latin": "symposium",
      "castellano": "simposio",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 693; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1127",
      "latin": "synagogam",
      "castellano": "sinagoga",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 694; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1128",
      "latin": "syndicum",
      "castellano": "síndico",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 695; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1129",
      "latin": "synodum",
      "castellano": "sínodo",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 696; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1130",
      "latin": "thalamum",
      "castellano": "tálamo",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 697; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1131",
      "latin": "thapsiam",
      "castellano": "tapsia",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 698; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1132",
      "latin": "thecam",
      "castellano": "teca",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 700; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1133",
      "latin": "themam",
      "castellano": "tema",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 701; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1134",
      "latin": "Theocritum",
      "castellano": "Teócrito",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 702; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1135",
      "latin": "theogoniam",
      "castellano": "teogonía",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 703; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1136",
      "latin": "theologum",
      "castellano": "teólogo",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 704; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1137",
      "latin": "theoriam",
      "castellano": "teoría",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 705; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1138",
      "latin": "Theseum",
      "castellano": "Teseo",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 706; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1139",
      "latin": "theurgum",
      "castellano": "teúrgo",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 707; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1140",
      "latin": "thiasum",
      "castellano": "tíaso",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 708; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1141",
      "latin": "Thraciam",
      "castellano": "Tracia",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 710; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1142",
      "latin": "Thrasybulum",
      "castellano": "Trasíbulo",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 711; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1143",
      "latin": "thyrsum",
      "castellano": "tirso",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 712; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1144",
      "latin": "æginam",
      "castellano": "Egina",
      "normas": [
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 737; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1145",
      "latin": "æmulum",
      "castellano": "émulo",
      "normas": [
        "N01",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 738; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1146",
      "latin": "æolum",
      "castellano": "Eolo",
      "normas": [
        "N01",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 739; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1147",
      "latin": "ærarium",
      "castellano": "erario",
      "normas": [
        "N01",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 740; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1148",
      "latin": "æsculapium",
      "castellano": "Esculapio",
      "normas": [
        "N01",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 741; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1149",
      "latin": "æsopum",
      "castellano": "Esopo",
      "normas": [
        "N01",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 742; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1150",
      "latin": "ætnam",
      "castellano": "Etna",
      "normas": [
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 744; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1151",
      "latin": "Bæticam",
      "castellano": "Bética",
      "normas": [
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 749; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1152",
      "latin": "Bœotiam",
      "castellano": "Beocia",
      "normas": [
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 751; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1153",
      "latin": "Cæsarem",
      "castellano": "César",
      "normas": [
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 752; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1154",
      "latin": "cæsuram",
      "castellano": "cesura",
      "normas": [
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 753; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1155",
      "latin": "coætaneum",
      "castellano": "coetáneo",
      "normas": [
        "N01",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 758; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1156",
      "latin": "cœliacum",
      "castellano": "celíaco",
      "normas": [
        "N01",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 759; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1157",
      "latin": "cœnobitam",
      "castellano": "cenobita",
      "normas": [
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 760; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1158",
      "latin": "comœdiam",
      "castellano": "comedia",
      "normas": [
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 761; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1159",
      "latin": "Crœsum",
      "castellano": "Creso",
      "normas": [
        "N01",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 762; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1160",
      "latin": "Dædalum",
      "castellano": "Dédalo",
      "normas": [
        "N01",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 763; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1161",
      "latin": "fœderare",
      "castellano": "federar",
      "normas": [
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 765; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1162",
      "latin": "fœtidum",
      "castellano": "fétido",
      "normas": [
        "N01",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 767; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1163",
      "latin": "mænadem",
      "castellano": "ménade",
      "normas": [
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 770; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1164",
      "latin": "Mænandrum",
      "castellano": "Menandro",
      "normas": [
        "N01",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 771; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1165",
      "latin": "Mœsiam",
      "castellano": "Mesia",
      "normas": [
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 772; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1166",
      "latin": "obœdientem",
      "castellano": "obediente",
      "normas": [
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 773; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1167",
      "latin": "œconomicum",
      "castellano": "económico",
      "normas": [
        "N01",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 775; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1168",
      "latin": "œcumenicum",
      "castellano": "ecuménico",
      "normas": [
        "N01",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 776; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1169",
      "latin": "œdipum",
      "castellano": "Edipo",
      "normas": [
        "N01",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 777; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1170",
      "latin": "pædagogum",
      "castellano": "pedagogo",
      "normas": [
        "N01",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 781; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1171",
      "latin": "Phœbum",
      "castellano": "Febo",
      "normas": [
        "N01",
        "N10",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 784; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1172",
      "latin": "Phœniciam",
      "castellano": "Fenicia",
      "normas": [
        "N10",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 785; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1173",
      "latin": "præfectum",
      "castellano": "prefecto",
      "normas": [
        "N01",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 786; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1174",
      "latin": "præludium",
      "castellano": "preludio",
      "normas": [
        "N01",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 787; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1175",
      "latin": "præmaturum",
      "castellano": "prematuro",
      "normas": [
        "N01",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 788; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1176",
      "latin": "scænam",
      "castellano": "escena",
      "normas": [
        "N12",
        "N14"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 790; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1177",
      "latin": "tragœdiam",
      "castellano": "tragedia",
      "normas": [
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 793; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1178",
      "latin": "æquationem",
      "castellano": "ecuación",
      "normas": [
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 795; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1179",
      "latin": "crystallinum",
      "castellano": "cristalino",
      "normas": [
        "N01",
        "N10",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 909; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1180",
      "latin": "prædecessorem",
      "castellano": "predecesor",
      "normas": [
        "N12",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 921; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1181",
      "latin": "Acherontem",
      "castellano": "Aqueronte",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 616; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1182",
      "latin": "ægisthum",
      "castellano": "Egisto",
      "normas": [
        "N01",
        "N10",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 617; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1183",
      "latin": "ægyptum",
      "castellano": "Egipto",
      "normas": [
        "N01",
        "N10",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 618; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1184",
      "latin": "æschylum",
      "castellano": "Esquilo",
      "normas": [
        "N01",
        "N10",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 619; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1185",
      "latin": "ætherem",
      "castellano": "éter",
      "normas": [
        "N10",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 620; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1186",
      "latin": "asphodelum",
      "castellano": "asfódelo",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 623; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1187",
      "latin": "catharticum",
      "castellano": "catártico",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 626; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1188",
      "latin": "catholicum",
      "castellano": "católico",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 627; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1189",
      "latin": "Chaldæam",
      "castellano": "Caldea",
      "normas": [
        "N10",
        "N12"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 628; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1190",
      "latin": "characterem",
      "castellano": "carácter",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 629; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1191",
      "latin": "charisma",
      "castellano": "carisma",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 630; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1192",
      "latin": "Charontem",
      "castellano": "Caronte",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 631; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1193",
      "latin": "chirographum",
      "castellano": "quirógrafo",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 634; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1194",
      "latin": "Chironem",
      "castellano": "Quirón",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 635; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1195",
      "latin": "chirurgicum",
      "castellano": "quirúrgico",
      "normas": [
        "N01",
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 636; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1196",
      "latin": "chlamydem",
      "castellano": "clámide",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 637; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1197",
      "latin": "chorographiam",
      "castellano": "corografía",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "Excel docente «banco_evolucion_fonetica_final_10_lotes.xlsx», fila 641; cotejo de grafías latinas y españolas"
    },
    {
      "id": "EVF-1198",
      "latin": "pyram",
      "castellano": "pira",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "https://iedra.es/palabras/pira"
    },
    {
      "id": "EVF-1199",
      "latin": "Scythiam",
      "castellano": "Escitia",
      "normas": [
        "N10",
        "N14"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "https://en.wiktionary.org/wiki/Scythia"
    },
    {
      "id": "EVF-1200",
      "latin": "gulam",
      "castellano": "gola",
      "normas": [
        "N01"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "REGIONAL_HISTORICA",
      "fuente": "https://iedra.es/palabras/gola"
    },
    {
      "id": "EVF-1201",
      "latin": "sculptorem",
      "castellano": "escultor",
      "normas": [
        "N14",
        "N15"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "https://iedra.es/palabras/escultor"
    },
    {
      "id": "EVF-1202",
      "latin": "Chloen",
      "castellano": "Cloe",
      "normas": [
        "N10"
      ],
      "estado": "APTO_PROPUESTO",
      "tipoTransmision": "ADAPTACION_CULTA",
      "fuente": "https://www.mobot.org/mobot/latindict/keyDetail.aspx?keyWord=-chloe"
    }
  ],
  "morphology": [
    {
      "lemma": "aro",
      "form": "arate",
      "tags": "V;IMP;ACT;PRS;2;PL",
      "reference": "https://en.wiktionary.org/wiki/arate",
      "note": null
    },
    {
      "lemma": "capio",
      "form": "capta",
      "tags": "V;PTCP;PASS;PRF;NOM;SG;FEM",
      "reference": "https://en.wiktionary.org/wiki/captus",
      "note": null
    },
    {
      "lemma": "conor",
      "form": "conati",
      "tags": "V;PTCP;ACT;PRF;NOM;PL;MASC",
      "reference": "https://en.wiktionary.org/wiki/conatus",
      "note": null
    },
    {
      "lemma": "miror",
      "form": "mirati",
      "tags": "V;PTCP;ACT;PRF;NOM;PL;MASC",
      "reference": "https://en.wiktionary.org/wiki/miratus",
      "note": null
    },
    {
      "lemma": "proficiscor",
      "form": "profectae",
      "tags": "V;PTCP;ACT;PRF;NOM;PL;FEM",
      "reference": "https://en.wiktionary.org/wiki/proficiscor",
      "note": null
    },
    {
      "lemma": "proficiscor",
      "form": "profectos",
      "tags": "V;PTCP;ACT;PRF;ACC;PL;MASC",
      "reference": "https://en.wiktionary.org/wiki/profectus",
      "note": null
    },
    {
      "lemma": "facio",
      "form": "factus",
      "tags": "V;PTCP;PASS;PRF;NOM;SG;MASC",
      "reference": "https://dcc.dickinson.edu/it/grammar/latin/irregular-verbs-f%C4%AB%C5%8D",
      "note": null
    },
    {
      "lemma": "aedifico",
      "form": "aedificata",
      "tags": "V;PTCP;PASS;PRF;NOM;SG;FEM",
      "reference": "https://en.wiktionary.org/wiki/aedificatus",
      "note": null
    },
    {
      "lemma": "creo",
      "form": "creatus",
      "tags": "V;PTCP;PASS;PRF;NOM;SG;MASC",
      "reference": "https://en.wiktionary.org/wiki/creatus",
      "note": null
    },
    {
      "lemma": "cremo",
      "form": "cremata",
      "tags": "V;PTCP;PASS;PRF;NOM;SG;FEM",
      "reference": "https://en.wiktionary.org/wiki/crematus",
      "note": null
    },
    {
      "lemma": "deleo",
      "form": "deleta",
      "tags": "V;PTCP;PASS;PRF;NOM;SG;FEM",
      "reference": "https://en.wiktionary.org/wiki/deletus",
      "note": null
    },
    {
      "lemma": "expugno",
      "form": "expugnata",
      "tags": "V;PTCP;PASS;PRF;NOM;SG;FEM",
      "reference": "https://en.wiktionary.org/wiki/expugnata",
      "note": null
    },
    {
      "lemma": "creo",
      "form": "creati",
      "tags": "V;PTCP;PASS;PRF;NOM;PL;MASC",
      "reference": "https://en.wiktionary.org/wiki/creatus",
      "note": null
    },
    {
      "lemma": "deleo",
      "form": "deletam",
      "tags": "V;PTCP;PASS;PRF;ACC;SG;FEM",
      "reference": "https://en.wiktionary.org/wiki/deletus",
      "note": null
    },
    {
      "lemma": "deleo",
      "form": "deletum",
      "tags": "V;PTCP;PASS;PRF;ACC;SG;NEUT",
      "reference": "https://en.wiktionary.org/wiki/deletus",
      "note": null
    },
    {
      "lemma": "laudo",
      "form": "laudati",
      "tags": "V;PTCP;PASS;PRF;NOM;PL;MASC",
      "reference": "https://en.wiktionary.org/wiki/laudatus",
      "note": null
    },
    {
      "lemma": "narro",
      "form": "narratae",
      "tags": "V;PTCP;PASS;PRF;NOM;PL;FEM",
      "reference": "https://en.wiktionary.org/wiki/narratus",
      "note": null
    },
    {
      "lemma": "occido",
      "form": "occisus",
      "tags": "V;PTCP;PASS;PRF;NOM;SG;MASC",
      "reference": "https://en.wiktionary.org/wiki/occisus",
      "note": null
    },
    {
      "lemma": "punio",
      "form": "punitus",
      "tags": "V;PTCP;PASS;PRF;NOM;SG;MASC",
      "reference": "https://en.wiktionary.org/wiki/punitus",
      "note": null
    },
    {
      "lemma": "sepelio",
      "form": "sepultus",
      "tags": "V;PTCP;PASS;PRF;NOM;SG;MASC",
      "reference": "https://en.wiktionary.org/wiki/sepultus",
      "note": null
    },
    {
      "lemma": "vasto",
      "form": "vastata",
      "tags": "V;PTCP;PASS;PRF;NOM;SG;FEM",
      "reference": "https://en.wiktionary.org/wiki/vastatus",
      "note": null
    },
    {
      "lemma": "vinco",
      "form": "victi",
      "tags": "V;PTCP;PASS;PRF;NOM;PL;MASC",
      "reference": "https://en.wiktionary.org/wiki/victus",
      "note": null
    },
    {
      "lemma": "voco",
      "form": "vocatus",
      "tags": "V;PTCP;PASS;PRF;NOM;SG;MASC",
      "reference": "https://en.wiktionary.org/wiki/vocatus",
      "note": null
    },
    {
      "lemma": "accipio",
      "form": "acceptis",
      "tags": "V;PTCP;PASS;PRF;ABL;PL",
      "reference": "https://en.wiktionary.org/wiki/acceptus",
      "note": null
    },
    {
      "lemma": "delibero",
      "form": "deliberata",
      "tags": "V;PTCP;PASS;PRF;NOM;SG;FEM",
      "reference": "https://en.wiktionary.org/wiki/deliberatus",
      "note": null
    },
    {
      "lemma": "foedero",
      "form": "foederatae",
      "tags": "V;PTCP;PASS;PRF;NOM;PL;FEM",
      "reference": "https://en.wiktionary.org/wiki/foederatus",
      "note": null
    },
    {
      "lemma": "mitto",
      "form": "missos",
      "tags": "V;PTCP;PASS;PRF;ACC;PL;MASC",
      "reference": "https://en.wiktionary.org/wiki/missus",
      "note": null
    },
    {
      "lemma": "occido",
      "form": "occiso",
      "tags": "V;PTCP;PASS;PRF;ABL;SG;MASC",
      "reference": "https://en.wiktionary.org/wiki/occisus",
      "note": null
    },
    {
      "lemma": "oppugno",
      "form": "oppugnata",
      "tags": "V;PTCP;PASS;PRF;NOM;SG;FEM",
      "reference": "https://en.wiktionary.org/wiki/oppugnatus",
      "note": null
    },
    {
      "lemma": "relinquo",
      "form": "relictis",
      "tags": "V;PTCP;PASS;PRF;ABL;PL",
      "reference": "https://en.wiktionary.org/wiki/relictus",
      "note": null
    },
    {
      "lemma": "vinco",
      "form": "victis",
      "tags": "V;PTCP;PASS;PRF;ABL;PL",
      "reference": "https://en.wiktionary.org/wiki/victus",
      "note": null
    },
    {
      "lemma": "vinco",
      "form": "victa",
      "tags": "V;PTCP;PASS;PRF;NOM;SG;FEM",
      "reference": "https://en.wiktionary.org/wiki/victus",
      "note": null
    },
    {
      "lemma": "serva",
      "form": "servae",
      "tags": "N;GEN;SG",
      "reference": "https://en.wiktionary.org/wiki/servae",
      "note": null
    },
    {
      "lemma": "dux",
      "form": "dux",
      "tags": "N;NOM;SG",
      "reference": "https://en.wiktionary.org/wiki/dux",
      "note": "Análisis de tercera declinación por caso y número, sin inferir casillas ausentes"
    },
    {
      "lemma": "dux",
      "form": "ducis",
      "tags": "N;GEN;SG",
      "reference": "https://en.wiktionary.org/wiki/dux",
      "note": "Análisis de tercera declinación por caso y número, sin inferir casillas ausentes"
    },
    {
      "lemma": "dux",
      "form": "duci",
      "tags": "N;DAT;SG",
      "reference": "https://en.wiktionary.org/wiki/dux",
      "note": "Análisis de tercera declinación por caso y número, sin inferir casillas ausentes"
    },
    {
      "lemma": "dux",
      "form": "ducem",
      "tags": "N;ACC;SG",
      "reference": "https://en.wiktionary.org/wiki/dux",
      "note": "Análisis de tercera declinación por caso y número, sin inferir casillas ausentes"
    },
    {
      "lemma": "dux",
      "form": "dux",
      "tags": "N;VOC;SG",
      "reference": "https://en.wiktionary.org/wiki/dux",
      "note": "Análisis de tercera declinación por caso y número, sin inferir casillas ausentes"
    },
    {
      "lemma": "dux",
      "form": "duce",
      "tags": "N;ABL;SG",
      "reference": "https://en.wiktionary.org/wiki/dux",
      "note": "Análisis de tercera declinación por caso y número, sin inferir casillas ausentes"
    },
    {
      "lemma": "dux",
      "form": "duces",
      "tags": "N;NOM;PL",
      "reference": "https://en.wiktionary.org/wiki/dux",
      "note": "Análisis de tercera declinación por caso y número, sin inferir casillas ausentes"
    },
    {
      "lemma": "dux",
      "form": "ducibus",
      "tags": "N;DAT;PL",
      "reference": "https://en.wiktionary.org/wiki/dux",
      "note": "Análisis de tercera declinación por caso y número, sin inferir casillas ausentes"
    },
    {
      "lemma": "dux",
      "form": "duces",
      "tags": "N;ACC;PL",
      "reference": "https://en.wiktionary.org/wiki/dux",
      "note": "Análisis de tercera declinación por caso y número, sin inferir casillas ausentes"
    },
    {
      "lemma": "dux",
      "form": "duces",
      "tags": "N;VOC;PL",
      "reference": "https://en.wiktionary.org/wiki/dux",
      "note": "Análisis de tercera declinación por caso y número, sin inferir casillas ausentes"
    },
    {
      "lemma": "dux",
      "form": "ducibus",
      "tags": "N;ABL;PL",
      "reference": "https://en.wiktionary.org/wiki/dux",
      "note": "Análisis de tercera declinación por caso y número, sin inferir casillas ausentes"
    },
    {
      "lemma": "obses",
      "form": "obses",
      "tags": "N;NOM;SG",
      "reference": "https://en.wiktionary.org/wiki/obses",
      "note": "Análisis de tercera declinación por caso y número, sin inferir casillas ausentes"
    },
    {
      "lemma": "obses",
      "form": "obsidis",
      "tags": "N;GEN;SG",
      "reference": "https://en.wiktionary.org/wiki/obses",
      "note": "Análisis de tercera declinación por caso y número, sin inferir casillas ausentes"
    },
    {
      "lemma": "obses",
      "form": "obsidi",
      "tags": "N;DAT;SG",
      "reference": "https://en.wiktionary.org/wiki/obses",
      "note": "Análisis de tercera declinación por caso y número, sin inferir casillas ausentes"
    },
    {
      "lemma": "obses",
      "form": "obsidem",
      "tags": "N;ACC;SG",
      "reference": "https://en.wiktionary.org/wiki/obses",
      "note": "Análisis de tercera declinación por caso y número, sin inferir casillas ausentes"
    },
    {
      "lemma": "obses",
      "form": "obses",
      "tags": "N;VOC;SG",
      "reference": "https://en.wiktionary.org/wiki/obses",
      "note": "Análisis de tercera declinación por caso y número, sin inferir casillas ausentes"
    },
    {
      "lemma": "obses",
      "form": "obside",
      "tags": "N;ABL;SG",
      "reference": "https://en.wiktionary.org/wiki/obses",
      "note": "Análisis de tercera declinación por caso y número, sin inferir casillas ausentes"
    },
    {
      "lemma": "obses",
      "form": "obsides",
      "tags": "N;NOM;PL",
      "reference": "https://en.wiktionary.org/wiki/obses",
      "note": "Análisis de tercera declinación por caso y número, sin inferir casillas ausentes"
    },
    {
      "lemma": "obses",
      "form": "obsidibus",
      "tags": "N;DAT;PL",
      "reference": "https://en.wiktionary.org/wiki/obses",
      "note": "Análisis de tercera declinación por caso y número, sin inferir casillas ausentes"
    },
    {
      "lemma": "obses",
      "form": "obsides",
      "tags": "N;ACC;PL",
      "reference": "https://en.wiktionary.org/wiki/obses",
      "note": "Análisis de tercera declinación por caso y número, sin inferir casillas ausentes"
    },
    {
      "lemma": "obses",
      "form": "obsides",
      "tags": "N;VOC;PL",
      "reference": "https://en.wiktionary.org/wiki/obses",
      "note": "Análisis de tercera declinación por caso y número, sin inferir casillas ausentes"
    },
    {
      "lemma": "obses",
      "form": "obsidibus",
      "tags": "N;ABL;PL",
      "reference": "https://en.wiktionary.org/wiki/obses",
      "note": "Análisis de tercera declinación por caso y número, sin inferir casillas ausentes"
    }
  ]
} as const satisfies TeacherAcademicSourceSnapshotV1;
