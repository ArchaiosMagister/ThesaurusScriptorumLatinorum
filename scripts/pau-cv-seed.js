// Migración aditiva, única y transaccional. Los textos siguen siendo propios y editables.
export const seedVersion = 3;
// Factory fingerprints for backup recognition. Migration requires exact Latin equality.
const factory = {
  "2006 JUNIO / A": {
    "latin": "28cca49c",
    "tags": [
      "gram.cum.historico",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.part.perfecto.deponente",
      "gram.participio",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo"
    ],
    "v2Tags": [
      "gram.cum.historico",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.part.perfecto.deponente",
      "gram.participio",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo"
    ]
  },
  "2006 JUNIO / B": {
    "latin": "78af3b9f",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.part.perfecto.pasivo",
      "gram.part.presente.activo",
      "gram.participio",
      "gram.pron.identidad",
      "gram.pron.proximo",
      "gram.subjuntivo",
      "gram.ut.completiva",
      "gram.verbo.perfecto.indicativo.pasivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.part.perfecto.pasivo",
      "gram.part.presente.activo",
      "gram.participio",
      "gram.pron.identidad",
      "gram.pron.proximo",
      "gram.subjuntivo",
      "gram.ut.completiva",
      "gram.voz.pasiva"
    ]
  },
  "2006 SEPTIEMBRE / A": {
    "latin": "fdf4f3e6",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.inf.presente.deponente",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.pron.relativo",
      "gram.relativo"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.inf.presente.deponente",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.pron.relativo",
      "gram.relativo"
    ]
  },
  "2006 SEPTIEMBRE / B": {
    "latin": "ce5542d6",
    "tags": [
      "gram.deponente",
      "gram.part.perfecto.deponente",
      "gram.participio",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.deponente",
      "gram.part.perfecto.deponente",
      "gram.participio",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ]
  },
  "2007 JUNIO / A": {
    "latin": "afca3bac",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.inf.presente.activo",
      "gram.ne.completiva",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.proximo",
      "gram.subjuntivo"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.inf.presente.activo",
      "gram.ne.completiva",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.proximo",
      "gram.subjuntivo"
    ]
  },
  "2007 JUNIO / B": {
    "latin": "1c19d7a9",
    "tags": [
      "gram.condicional",
      "gram.genitivo.partitivo",
      "gram.pron.lejano",
      "gram.subjuntivo"
    ],
    "v2Tags": [
      "gram.condicional",
      "gram.genitivo.partitivo",
      "gram.pron.lejano",
      "gram.subjuntivo"
    ]
  },
  "2007 SEPTIEMBRE / A": {
    "latin": "3d9bb22",
    "tags": [
      "gram.inf.presente.pasivo",
      "gram.infinitivo",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.inf.presente.pasivo",
      "gram.infinitivo",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ]
  },
  "2007 SEPTIEMBRE / B": {
    "latin": "5244c1d6",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.cum.historico",
      "gram.part.perfecto.pasivo",
      "gram.part.presente.activo",
      "gram.participio",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.cum.historico",
      "gram.part.perfecto.pasivo",
      "gram.part.presente.activo",
      "gram.participio",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo",
      "gram.voz.pasiva"
    ]
  },
  "2008 JUNIO / A": {
    "latin": "90dde08d",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.cum.historico",
      "gram.inf.presente.activo",
      "gram.inf.presente.pasivo",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.relativo.enlace",
      "gram.subjuntivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.cum.historico",
      "gram.inf.presente.activo",
      "gram.inf.presente.pasivo",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.relativo.enlace",
      "gram.subjuntivo",
      "gram.voz.pasiva"
    ]
  },
  "2008 JUNIO / B": {
    "latin": "40ed9288",
    "tags": [
      "gram.condicional",
      "gram.cum.historico",
      "gram.inf.presente.activo",
      "gram.subjuntivo"
    ],
    "v2Tags": [
      "gram.condicional",
      "gram.cum.historico",
      "gram.inf.presente.activo",
      "gram.subjuntivo"
    ]
  },
  "2008 SEPTIEMBRE / A": {
    "latin": "1c9742ce",
    "tags": [
      "gram.agente",
      "gram.deponente",
      "gram.inf.presente.pasivo",
      "gram.infinitivo",
      "gram.part.perfecto.deponente",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.enfatico",
      "gram.pron.identidad",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.agente",
      "gram.deponente",
      "gram.inf.presente.pasivo",
      "gram.infinitivo",
      "gram.part.perfecto.deponente",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.enfatico",
      "gram.pron.identidad",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ]
  },
  "2008 SEPTIEMBRE / B": {
    "latin": "8f6136c5",
    "tags": [
      "gram.pron.enfatico",
      "gram.pron.lejano",
      "gram.pron.posesivo",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.pron.enfatico",
      "gram.pron.lejano",
      "gram.pron.posesivo",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ]
  },
  "2009 JUNIO / A": {
    "latin": "6d363851",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.dativo.aprox",
      "gram.deponente",
      "gram.inf.presente.deponente",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.dativo.aprox",
      "gram.deponente",
      "gram.inf.presente.deponente",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo"
    ]
  },
  "2009 JUNIO / B": {
    "latin": "55274cf8",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.deponente",
      "gram.part.perfecto.pasivo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo",
      "gram.ut.completiva"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.deponente",
      "gram.part.perfecto.pasivo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo",
      "gram.ut.completiva"
    ]
  },
  "2009 SEPTIEMBRE / A": {
    "latin": "bae1e396",
    "tags": [
      "gram.deponente",
      "gram.inf.presente.deponente",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.posesivo",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo"
    ],
    "v2Tags": [
      "gram.deponente",
      "gram.inf.presente.deponente",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.posesivo",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo"
    ]
  },
  "2009 SEPTIEMBRE / B": {
    "latin": "a4fa642c",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.condicional",
      "gram.deponente",
      "gram.inf.futuro.deponente",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.pron.proximo",
      "gram.subjuntivo",
      "gram.verbo.pluscuamperfecto.subjuntivo.pasivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.condicional",
      "gram.deponente",
      "gram.inf.futuro.deponente",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.pron.proximo",
      "gram.subjuntivo",
      "gram.voz.pasiva"
    ]
  },
  "2010 JUNIO / A": {
    "latin": "467e269",
    "tags": [
      "gram.dativo.aprox",
      "gram.inf.presente.activo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.verbo.pluscuamperfecto.indicativo.pasivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.dativo.aprox",
      "gram.inf.presente.activo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ]
  },
  "2010 JUNIO / B": {
    "latin": "f5f45e7f",
    "tags": [
      "gram.concordancia.nominal",
      "gram.inf.presente.activo"
    ],
    "v2Tags": [
      "gram.concordancia.nominal",
      "gram.inf.presente.activo"
    ]
  },
  "2010 SEPTIEMBRE / A": {
    "latin": "cb5b4b94",
    "tags": [
      "gram.acus.ext",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.inf.presente.pasivo",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.enfatico",
      "gram.pron.lejano",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.relativo.enlace",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.acus.ext",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.inf.presente.pasivo",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.enfatico",
      "gram.pron.lejano",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.relativo.enlace",
      "gram.voz.pasiva"
    ]
  },
  "2010 SEPTIEMBRE / B": {
    "latin": "72c34a59",
    "tags": [
      "gram.deponente",
      "gram.genitivo.partitivo",
      "gram.inf.presente.deponente",
      "gram.infinitivo",
      "gram.part.presente.activo",
      "gram.participio",
      "gram.pron.enfatico",
      "gram.pron.identidad",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.deponente",
      "gram.genitivo.partitivo",
      "gram.inf.presente.deponente",
      "gram.infinitivo",
      "gram.part.presente.activo",
      "gram.participio",
      "gram.pron.enfatico",
      "gram.pron.identidad",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ]
  },
  "2011 JUNIO / A": {
    "latin": "3c7df1a8",
    "tags": [
      "gram.acus.ext",
      "gram.inf.presente.activo",
      "gram.pron.enfatico",
      "gram.pron.posesivo"
    ],
    "v2Tags": [
      "gram.acus.ext",
      "gram.inf.presente.activo",
      "gram.pron.enfatico",
      "gram.pron.posesivo"
    ]
  },
  "2011 JUNIO / B": {
    "latin": "26325a7f",
    "tags": [
      "gram.acus.ext",
      "gram.cum.historico",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.proximo",
      "gram.subjuntivo"
    ],
    "v2Tags": [
      "gram.acus.ext",
      "gram.cum.historico",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.proximo",
      "gram.subjuntivo"
    ]
  },
  "2011 SEPTIEMBRE / A": {
    "latin": "b46fca24",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.inf.presente.pasivo",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.pron.proximo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.inf.presente.pasivo",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.pron.proximo",
      "gram.voz.pasiva"
    ]
  },
  "2011 SEPTIEMBRE / B": {
    "latin": "5b9179b7",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.acus.ext",
      "gram.cum.historico",
      "gram.dativo.aprox",
      "gram.deponente",
      "gram.part.presente.activo",
      "gram.subjuntivo"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.acus.ext",
      "gram.cum.historico",
      "gram.dativo.aprox",
      "gram.deponente",
      "gram.part.presente.activo",
      "gram.subjuntivo"
    ]
  },
  "2012 JUNIO / A": {
    "latin": "fac16f5d",
    "tags": [
      "gram.deponente",
      "gram.genitivo.partitivo",
      "gram.inf.presente.activo",
      "gram.infinitivo",
      "gram.part.perfecto.deponente",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.deponente",
      "gram.genitivo.partitivo",
      "gram.inf.presente.activo",
      "gram.infinitivo",
      "gram.part.perfecto.deponente",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ]
  },
  "2012 JUNIO / B": {
    "latin": "89f9a366",
    "tags": [
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.inf.presente.pasivo",
      "gram.infinitivo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.inf.presente.pasivo",
      "gram.infinitivo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ]
  },
  "2012 SEPTIEMBRE / A": {
    "latin": "4ec5eae7",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.deponente",
      "gram.part.perfecto.pasivo",
      "gram.part.presente.activo",
      "gram.participio",
      "gram.pron.relativo",
      "gram.relativo"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.deponente",
      "gram.part.perfecto.pasivo",
      "gram.part.presente.activo",
      "gram.participio",
      "gram.pron.relativo",
      "gram.relativo"
    ]
  },
  "2012 SEPTIEMBRE / B": {
    "latin": "20118524",
    "tags": [
      "gram.cum.historico",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.subjuntivo"
    ],
    "v2Tags": [
      "gram.cum.historico",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.subjuntivo"
    ]
  },
  "2013 JUNIO / A": {
    "latin": "a04a6d29",
    "tags": [
      "gram.agente",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.enfatico",
      "gram.pron.posesivo",
      "gram.pron.proximo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.agente",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.enfatico",
      "gram.pron.posesivo",
      "gram.pron.proximo",
      "gram.voz.pasiva"
    ]
  },
  "2013 JUNIO / B": {
    "latin": "f2112287",
    "tags": [
      "gram.deponente",
      "gram.pron.posesivo",
      "gram.pron.proximo",
      "gram.relativo",
      "gram.subjuntivo"
    ],
    "v2Tags": [
      "gram.deponente",
      "gram.pron.posesivo",
      "gram.pron.proximo",
      "gram.relativo",
      "gram.subjuntivo"
    ]
  },
  "2013 JULIO / A": {
    "latin": "bdd0ef86",
    "tags": [
      "gram.deponente",
      "gram.pron.identidad",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo",
      "gram.ut.completiva",
      "gram.verbo.pluscuamperfecto.indicativo.pasivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.deponente",
      "gram.pron.identidad",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo",
      "gram.ut.completiva",
      "gram.voz.pasiva"
    ]
  },
  "2013 JULIO / B": {
    "latin": "2567911a",
    "tags": [
      "gram.agente",
      "gram.genitivo.partitivo",
      "gram.inf.presente.activo",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.posesivo",
      "gram.pron.proximo"
    ],
    "v2Tags": [
      "gram.agente",
      "gram.genitivo.partitivo",
      "gram.inf.presente.activo",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.posesivo",
      "gram.pron.proximo"
    ]
  },
  "2014 JUNIO / A": {
    "latin": "d9763124",
    "tags": [
      "gram.agente",
      "gram.cum.historico",
      "gram.deponente",
      "gram.part.perfecto.deponente",
      "gram.participio",
      "gram.pron.proximo",
      "gram.subjuntivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.agente",
      "gram.cum.historico",
      "gram.deponente",
      "gram.part.perfecto.deponente",
      "gram.participio",
      "gram.pron.proximo",
      "gram.subjuntivo",
      "gram.voz.pasiva"
    ]
  },
  "2014 JUNIO / B": {
    "latin": "69f20234",
    "tags": [
      "gram.ne.final",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.ne.final",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo",
      "gram.voz.pasiva"
    ]
  },
  "2014 JULIO / A": {
    "latin": "badc46d7",
    "tags": [
      "gram.cum.historico",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.infinitivo",
      "gram.pron.identidad",
      "gram.subjuntivo"
    ],
    "v2Tags": [
      "gram.cum.historico",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.infinitivo",
      "gram.pron.identidad",
      "gram.subjuntivo"
    ]
  },
  "2014 JULIO / B": {
    "latin": "7e353c02",
    "tags": [
      "gram.inf.presente.activo",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.inf.presente.activo",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.voz.pasiva"
    ]
  },
  "2015 JUNIO / A": {
    "latin": "f617e636",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.infinitivo",
      "gram.part.perfecto.deponente",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.enfatico",
      "gram.pron.proximo",
      "gram.subjuntivo",
      "gram.ut.completiva"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.infinitivo",
      "gram.part.perfecto.deponente",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.enfatico",
      "gram.pron.proximo",
      "gram.subjuntivo",
      "gram.ut.completiva"
    ]
  },
  "2015 JUNIO / B": {
    "latin": "3d3c27f4",
    "tags": [
      "gram.cum.historico",
      "gram.pron.identidad",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo",
      "gram.verbo.perfecto.indicativo.pasivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.cum.historico",
      "gram.pron.identidad",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo",
      "gram.voz.pasiva"
    ]
  },
  "2015 JULIO / A": {
    "latin": "54bfe9e4",
    "tags": [
      "gram.agente",
      "gram.deponente",
      "gram.part.presente.activo",
      "gram.participio",
      "gram.subjuntivo",
      "gram.ut.completiva",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.agente",
      "gram.deponente",
      "gram.part.presente.activo",
      "gram.participio",
      "gram.subjuntivo",
      "gram.ut.completiva",
      "gram.voz.pasiva"
    ]
  },
  "2015 JULIO / B": {
    "latin": "3254b9b1",
    "tags": [
      "gram.inf.presente.activo",
      "gram.infinitivo",
      "gram.pron.proximo",
      "gram.subjuntivo"
    ],
    "v2Tags": [
      "gram.inf.presente.activo",
      "gram.infinitivo",
      "gram.pron.proximo",
      "gram.subjuntivo"
    ]
  },
  "2016 JUNIO / A": {
    "latin": "69643e8f",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.genitivo.partitivo",
      "gram.part.perfecto.pasivo",
      "gram.pron.posesivo",
      "gram.subjuntivo",
      "gram.ut.final",
      "gram.verbo.perfecto.indicativo.pasivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.genitivo.partitivo",
      "gram.part.perfecto.pasivo",
      "gram.pron.posesivo",
      "gram.subjuntivo",
      "gram.ut.final",
      "gram.voz.pasiva"
    ]
  },
  "2016 JUNIO / B": {
    "latin": "26e9cc2a",
    "tags": [
      "gram.inf.presente.activo",
      "gram.inf.presente.pasivo",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.inf.presente.activo",
      "gram.inf.presente.pasivo",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.voz.pasiva"
    ]
  },
  "2016 JULIO / A": {
    "latin": "64652769",
    "tags": [
      "gram.deponente",
      "gram.genitivo.partitivo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.deponente",
      "gram.genitivo.partitivo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ]
  },
  "2016 JULIO / B": {
    "latin": "90ac7047",
    "tags": [
      "gram.deponente",
      "gram.part.perfecto.deponente",
      "gram.part.presente.activo",
      "gram.participio",
      "gram.pron.posesivo"
    ],
    "v2Tags": [
      "gram.deponente",
      "gram.part.perfecto.deponente",
      "gram.part.presente.activo",
      "gram.participio",
      "gram.pron.posesivo"
    ]
  },
  "2017 JUNIO / A": {
    "latin": "299797f7",
    "tags": [
      "gram.agente",
      "gram.cum.historico",
      "gram.genitivo.partitivo",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.enfatico",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.agente",
      "gram.cum.historico",
      "gram.genitivo.partitivo",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.enfatico",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo",
      "gram.voz.pasiva"
    ]
  },
  "2017 JUNIO / B": {
    "latin": "57236d5a",
    "tags": [
      "gram.deponente",
      "gram.inf.presente.pasivo",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.medio",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.relativo.enlace",
      "gram.verbo.perfecto.indicativo.pasivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.deponente",
      "gram.inf.presente.pasivo",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.medio",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.relativo.enlace",
      "gram.voz.pasiva"
    ]
  },
  "2017 JULIO / A": {
    "latin": "9f0ecb8",
    "tags": [
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo"
    ],
    "v2Tags": [
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo"
    ]
  },
  "2017 JULIO / B": {
    "latin": "b0982ea",
    "tags": [
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.relativo",
      "gram.relativo"
    ],
    "v2Tags": [
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.relativo",
      "gram.relativo"
    ]
  },
  "2018 JUNIO / A": {
    "latin": "6f2ba766",
    "tags": [
      "gram.agente",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.part.perfecto.deponente",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.enfatico",
      "gram.pron.lejano"
    ],
    "v2Tags": [
      "gram.agente",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.part.perfecto.deponente",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.enfatico",
      "gram.pron.lejano"
    ]
  },
  "2018 JUNIO / B": {
    "latin": "6708fa44",
    "tags": [
      "gram.inf.presente.activo",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.enfatico",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.inf.presente.activo",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.enfatico",
      "gram.voz.pasiva"
    ]
  },
  "2018 JULIO / A": {
    "latin": "b1575666",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.agente",
      "gram.cum.historico",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.inf.presente.deponente",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.subjuntivo"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.agente",
      "gram.cum.historico",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.inf.presente.deponente",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.subjuntivo"
    ]
  },
  "2018 JULIO / B": {
    "latin": "e2a1c34f",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.voz.pasiva"
    ]
  },
  "2019 JUNIO / A": {
    "latin": "35196ff",
    "tags": [
      "gram.acus.ext",
      "gram.inf.presente.activo",
      "gram.pron.posesivo",
      "gram.subjuntivo",
      "gram.ut.consecutiva"
    ],
    "v2Tags": [
      "gram.acus.ext",
      "gram.inf.presente.activo",
      "gram.pron.posesivo",
      "gram.subjuntivo",
      "gram.ut.consecutiva"
    ]
  },
  "2019 JUNIO / B": {
    "latin": "d6976ad6",
    "tags": [
      "gram.part.perfecto.pasivo",
      "gram.part.presente.activo",
      "gram.participio",
      "gram.pron.relativo",
      "gram.relativo"
    ],
    "v2Tags": [
      "gram.part.perfecto.pasivo",
      "gram.part.presente.activo",
      "gram.participio",
      "gram.pron.relativo",
      "gram.relativo"
    ]
  },
  "2019 JULIO / A": {
    "latin": "af7de487",
    "tags": [
      "gram.cum.historico",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.ne.final",
      "gram.part.perfecto.deponente",
      "gram.participio",
      "gram.pron.proximo",
      "gram.subjuntivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.cum.historico",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.ne.final",
      "gram.part.perfecto.deponente",
      "gram.participio",
      "gram.pron.proximo",
      "gram.subjuntivo",
      "gram.voz.pasiva"
    ]
  },
  "2019 JULIO / B": {
    "latin": "52417514",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.pron.lejano",
      "gram.verbo.perfecto.indicativo.pasivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.pron.lejano",
      "gram.voz.pasiva"
    ]
  },
  "2020 JULIO / A": {
    "latin": "a9821008",
    "tags": [
      "gram.acus.ext",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.inf.presente.pasivo",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.enfatico",
      "gram.pron.lejano",
      "gram.pron.proximo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.acus.ext",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.inf.presente.pasivo",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.enfatico",
      "gram.pron.lejano",
      "gram.pron.proximo",
      "gram.voz.pasiva"
    ]
  },
  "2020 JULIO / B": {
    "latin": "5e09cde9",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.agente",
      "gram.inf.presente.activo",
      "gram.inf.presente.pasivo",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.pron.identidad",
      "gram.subjuntivo",
      "gram.verbo.perfecto.indicativo.pasivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.agente",
      "gram.inf.presente.activo",
      "gram.inf.presente.pasivo",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.pron.identidad",
      "gram.subjuntivo",
      "gram.voz.pasiva"
    ]
  },
  "2020 SEPTIEMBRE / A": {
    "latin": "ed2929a5",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.deponente",
      "gram.inf.perfecto.activo",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.pron.enfatico",
      "gram.pron.proximo"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.deponente",
      "gram.inf.perfecto.activo",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.pron.enfatico",
      "gram.pron.proximo"
    ]
  },
  "2020 SEPTIEMBRE / B": {
    "latin": "df30e397",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.part.perfecto.pasivo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.part.perfecto.pasivo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo"
    ]
  },
  "2021 JUNIO / A": {
    "latin": "20b68c88",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.part.perfecto.pasivo",
      "gram.pron.enfatico",
      "gram.pron.posesivo",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo",
      "gram.ut.final",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.part.perfecto.pasivo",
      "gram.pron.enfatico",
      "gram.pron.posesivo",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo",
      "gram.ut.final",
      "gram.voz.pasiva"
    ]
  },
  "2021 JUNIO / B": {
    "latin": "e8b4f49f",
    "tags": [
      "gram.part.perfecto.pasivo",
      "gram.part.presente.activo",
      "gram.participio",
      "gram.pron.posesivo"
    ],
    "v2Tags": [
      "gram.part.perfecto.pasivo",
      "gram.part.presente.activo",
      "gram.participio",
      "gram.pron.posesivo"
    ]
  },
  "2021 JULIO / A": {
    "latin": "a0c12d02",
    "tags": [
      "gram.acus.ext",
      "gram.deponente",
      "gram.pron.posesivo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo"
    ],
    "v2Tags": [
      "gram.acus.ext",
      "gram.deponente",
      "gram.pron.posesivo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo"
    ]
  },
  "2021 JULIO / B": {
    "latin": "5a6f8a5",
    "tags": [
      "gram.pron.enfatico",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo",
      "gram.ut.consecutiva",
      "gram.verbo.perfecto.indicativo.pasivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.pron.enfatico",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo",
      "gram.ut.consecutiva",
      "gram.voz.pasiva"
    ]
  },
  "2022 JUNIO / A": {
    "latin": "43875e0d",
    "tags": [
      "gram.concordancia.nominal",
      "gram.genitivo.partitivo"
    ],
    "v2Tags": [
      "gram.concordancia.nominal",
      "gram.genitivo.partitivo"
    ]
  },
  "2022 JUNIO / B": {
    "latin": "75854dff",
    "tags": [
      "gram.agente",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.verbo.pluscuamperfecto.indicativo.pasivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.agente",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ]
  },
  "2022 JULIO / A": {
    "latin": "5c0a379a",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.part.perfecto.pasivo",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.relativo.enlace",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.part.perfecto.pasivo",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.relativo.enlace",
      "gram.voz.pasiva"
    ]
  },
  "2022 JULIO / B": {
    "latin": "783aa9cc",
    "tags": [
      "gram.genitivo.partitivo",
      "gram.part.presente.activo",
      "gram.participio",
      "gram.pron.enfatico"
    ],
    "v2Tags": [
      "gram.genitivo.partitivo",
      "gram.part.presente.activo",
      "gram.participio",
      "gram.pron.enfatico"
    ]
  },
  "2023 JUNIO / A": {
    "latin": "795e3f1d",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.doble.dativo",
      "gram.inf.presente.pasivo",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.pron.enfatico",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.verbo.pluscuamperfecto.indicativo.pasivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.doble.dativo",
      "gram.inf.presente.pasivo",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.pron.enfatico",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ]
  },
  "2023 JUNIO / B": {
    "latin": "94abef60",
    "tags": [
      "gram.agente",
      "gram.deponente",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.verbo.perfecto.indicativo.pasivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.agente",
      "gram.deponente",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ]
  },
  "2023 JULIO / A": {
    "latin": "749a4d6",
    "tags": [
      "gram.agente",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo"
    ],
    "v2Tags": [
      "gram.agente",
      "gram.part.perfecto.pasivo",
      "gram.participio",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo"
    ]
  },
  "2023 JULIO / B": {
    "latin": "65868b58",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.part.perfecto.pasivo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.verbo.perfecto.indicativo.pasivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.part.perfecto.pasivo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ]
  },
  "2024 JUNIO / A": {
    "latin": "64777b12",
    "tags": [
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ]
  },
  "2024 JUNIO / B": {
    "latin": "58cd87e0",
    "tags": [
      "gram.pron.identidad",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.verbo.perfecto.indicativo.pasivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.pron.identidad",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ]
  },
  "2024 JULIO / A": {
    "latin": "59b61dce",
    "tags": [
      "gram.genitivo.partitivo",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.verbo.perfecto.indicativo.pasivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.genitivo.partitivo",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ]
  },
  "2024 JULIO / B": {
    "latin": "3aeba213",
    "tags": [
      "gram.deponente",
      "gram.genitivo.partitivo",
      "gram.pron.identidad",
      "gram.pron.lejano",
      "gram.pron.posesivo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.verbo.perfecto.indicativo.pasivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.deponente",
      "gram.genitivo.partitivo",
      "gram.pron.identidad",
      "gram.pron.lejano",
      "gram.pron.posesivo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ]
  },
  "2025 JUNIO / A": {
    "latin": "4298c156",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.deponente",
      "gram.part.perfecto.pasivo",
      "gram.pron.enfatico",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.relativo.enlace"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.deponente",
      "gram.part.perfecto.pasivo",
      "gram.pron.enfatico",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.relativo.enlace"
    ]
  },
  "2025 JUNIO / B": {
    "latin": "1cbb7b02",
    "tags": [
      "gram.deponente",
      "gram.pron.proximo"
    ],
    "v2Tags": [
      "gram.deponente",
      "gram.pron.proximo"
    ]
  },
  "2025 JUNIO (reserva) / A": {
    "latin": "10b05b03",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.deponente",
      "gram.part.perfecto.pasivo",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo",
      "gram.ut.completiva"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.deponente",
      "gram.part.perfecto.pasivo",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.subjuntivo",
      "gram.ut.completiva"
    ]
  },
  "2025 JUNIO (reserva) / B": {
    "latin": "b04a412d",
    "tags": [
      "gram.pron.posesivo",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.pron.posesivo",
      "gram.pron.proximo",
      "gram.pron.relativo",
      "gram.relativo",
      "gram.voz.pasiva"
    ]
  },
  "2025 JULIO / A": {
    "latin": "26737929",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.deponente",
      "gram.inf.presente.deponente",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.pron.relativo",
      "gram.relativo"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.deponente",
      "gram.inf.presente.deponente",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.pron.relativo",
      "gram.relativo"
    ]
  },
  "2025 JULIO / B": {
    "latin": "1ff5a8a6",
    "tags": [
      "gram.concordancia.nominal"
    ],
    "v2Tags": [
      "gram.concordancia.nominal"
    ]
  },
  "2025 JULIO (reserva) / A": {
    "latin": "7c6e8cda",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.inf.presente.deponente",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.pron.relativo",
      "gram.relativo"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.deponente",
      "gram.inf.presente.activo",
      "gram.inf.presente.deponente",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.pron.relativo",
      "gram.relativo"
    ]
  },
  "2025 JULIO (reserva) / B": {
    "latin": "a5f10623",
    "tags": [
      "gram.genitivo.partitivo",
      "gram.verbo.perfecto.indicativo.pasivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.genitivo.partitivo",
      "gram.voz.pasiva"
    ]
  },
  "2026 ORDINARIA / A": {
    "latin": "3194f6a6",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.inf.presente.activo",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.pron.lejano"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.inf.presente.activo",
      "gram.infinitivo",
      "gram.part.perfecto.pasivo",
      "gram.pron.lejano"
    ]
  },
  "2026 ORDINARIA / B": {
    "latin": "83848c30",
    "tags": [
      "gram.concordancia.nominal"
    ],
    "v2Tags": [
      "gram.concordancia.nominal"
    ]
  },
  "2026 EXTRAORDINARIA / A": {
    "latin": "819e302f",
    "tags": [
      "gram.ablativo.absoluto",
      "gram.part.perfecto.pasivo",
      "gram.pron.relativo",
      "gram.relativo"
    ],
    "v2Tags": [
      "gram.ablativo.absoluto",
      "gram.part.perfecto.pasivo",
      "gram.pron.relativo",
      "gram.relativo"
    ]
  },
  "2026 EXTRAORDINARIA / B": {
    "latin": "94933de7",
    "tags": [
      "gram.agente",
      "gram.verbo.perfecto.indicativo.pasivo",
      "gram.voz.pasiva"
    ],
    "v2Tags": [
      "gram.agente",
      "gram.voz.pasiva"
    ]
  }
};
const signature = txt => { let n=2166136261; for(let i=0;i<txt.length;i++) n=Math.imul(n^txt.charCodeAt(i),16777619); return (n>>>0).toString(16); };
const sameIds = (a,b) => JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
export const seedTimestamp = '2026-11-24T00:00:00.000Z';
export const seedCount = 88;
export const seedId = doc => 'pau.cv.' + doc.pauCv.toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/\.$/,'');
const identity = value => String(value ?? '').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const comparable = value => identity(value).replace(/\bextraordinaria\b/g,'julio').replace(/\bordinaria\b/g,'junio');
export function pauCvIdentity(text) {
  const raw = text.pauCv ?? text.teacherDocx?.pauCv;
  if (typeof raw === 'string' && /^\d{4}\s+.+\s*\/\s*[AB]$/iu.test(raw)) return comparable(raw);
  if (!text.selectividad) return '';
  const note = /^PAU CV\s*·\s*(.+?)\s+(\d{4})\s*·\s*Opción\s+([AB])\b/iu.exec(text.notes ?? '');
  return note ? comparable(note[2]+' '+note[1]+' / '+note[3]) : '';
}
export function isVerifiedPauTag(text,id) {
  const doc=text.teacherDocx,entry=factory[doc?.pauCv];
  return Boolean(entry&&text.id===seedId(doc)&&text.latin===doc.latin&&signature(text.latin)===entry.latin&&entry.tags.includes(id)&&text.tagIds.includes(id));
}

// Existing v1 installations get a one-time, conservative annotation migration.
// Never resurrect deleted texts; leave reviewed or edited entries unchanged.
export function prepareSeed(corpus, existingTexts, records, validate, catalogue = [], hasTeacherReview = () => false) {
  if (corpus.pauCvSeedVersion >= seedVersion || !records.length) return corpus;
  if (records.length !== seedCount) throw new Error('El banco PAU CV está incompleto.');
  const byKey = new Map(records.map(row=>[seedId(row.doc),row]));
  const known=new Map(catalogue.map(tag=>[tag.id,tag]));
  const tags=new Map(corpus.tags.map(tag=>[tag.id,tag]));
  function register(id) {
    if(tags.has(id))return;
    const tag=known.get(id);
    if(!tag)throw Error('Etiqueta PAU no registrada: '+id);
    if(tag.parentId)register(tag.parentId);
    tags.set(id,tag);
  }
  function verified(row) {
    const evidence=row.verifiedGrammar??{};
    const ids=Object.keys(evidence).sort();
    if(!sameIds(ids,factory[row.doc.pauCv]?.tags??[]) ||
       Object.values(evidence).some(span=>!span||!row.doc.latin.includes(span)))
      throw Error('Evidencia PAU inválida: '+row.doc.pauCv);
    ids.forEach(register);
    return ids;
  }
  const texts=corpus.texts.map(text=>{
    const row=byKey.get(text.id);
    if(!row||text.latin!==row.doc.latin||text.createdAt!==seedTimestamp||
      text.updatedAt!==seedTimestamp||text.reviewed||hasTeacherReview(text))return text;
    const before = corpus.pauCvSeedVersion === 2 ? factory[row.doc.pauCv]?.v2Tags : [];
    if(!before || !sameIds(text.tagIds,before))return text;
    return {...text,tagIds:verified(row)};
  });
  // Only initial installation may add records.
  if (!corpus.pauCvSeedVersion) {
    const identities = new Set(existingTexts.map(pauCvIdentity).filter(Boolean));
    const ids = new Set(existingTexts.map(t=>t.id));
    for(const row of records){
      const {doc,year,notes}=row;
      const id=seedId(doc),key=pauCvIdentity({teacherDocx:doc});
      if(ids.has(id)||identities.has(key))continue;
      texts.push({id,title:doc.title,latin:doc.latin,
        source:{author:doc.author,work:doc.work,reference:doc.reference},
        notes,tagIds:verified(row),createdAt:seedTimestamp,updatedAt:seedTimestamp,
        origin:{kind:'own'},courseIds:['2bach'],selectividad:{year,community:'Comunidad Valenciana'},teacherDocx:doc});
      ids.add(id);identities.add(key);
    }
  }
  return validate({...corpus,texts,tags:[...tags.values()],pauCvSeedVersion:seedVersion});
}
export async function installPauCvSeed({repo,loadCombinedCorpus,validateCorpus,grammarCatalogue,fetchRecords=async()=>{
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
    const reviewed=new Set();
    try {
      const prefix='atl-v1:cuaderno-banco-review-v1:';
      for(const key of Object.keys(localStorage).filter(k=>k.startsWith(prefix))){
        let record;
        try { record=JSON.parse(localStorage.getItem(key)); } catch { continue; }
        if(record?.rejected?.length||record?.corrected?.length)reviewed.add(key.slice(prefix.length,-65));
      }
    } catch { /* Storage may be unavailable. */ }
    const next=prepareSeed(current.corpus,existing.texts,records,validateCorpus,grammarCatalogue(current.corpus),text=>reviewed.has(text.id));
    if(next===current.corpus)return false;
    try{await repo.save(next,current.revision);return true;}
    catch(error){if(error.name!=='RevisionConflictError'||attempt===2)throw error;}
  }
  return false;
}
export function isPristineSeed(corpus) {
  const version=corpus.pauCvSeedVersion;
  if(![1,2,3].includes(version)||corpus.texts.length!==seedCount||corpus.notebooks.length||
    corpus.textRevisions?.length||corpus.tags.some(t=>t.kind!=='catalogue'))return false;
  if(version===1&&corpus.tags.length)return false;
  const used=new Set(),byId=new Map(corpus.tags.map(t=>[t.id,t]));
  for(const t of corpus.texts){
    const key=t.teacherDocx?.pauCv,entry=factory[key];
    if(!entry||t.id!==seedId(t.teacherDocx)||signature(t.latin)!==entry.latin||
      t.createdAt!==seedTimestamp||t.updatedAt!==seedTimestamp||t.reviewed||t.difficulty!==undefined||
      !sameIds(t.tagIds,version===1?[]:version===2?entry.v2Tags:entry.tags))return false;
    for(const id of t.tagIds){
      let current=id;
      while(current&&!used.has(current)){if(!byId.has(current))return false;used.add(current);current=byId.get(current)?.parentId;}
    }
  }
  return used.size===corpus.tags.length&&corpus.tags.every(t=>used.has(t.id));
}
