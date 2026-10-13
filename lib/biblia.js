// Lista dos 66 livros da Bíblia com o número de capítulos.
// O app NÃO guarda texto bíblico: só diz o que ler em cada dia.
// t: "AT" = Antigo Testamento | "NT" = Novo Testamento

export const BOOKS = [
  { id: "gn", nome: "Gênesis", caps: 50, t: "AT" },
  { id: "ex", nome: "Êxodo", caps: 40, t: "AT" },
  { id: "lv", nome: "Levítico", caps: 27, t: "AT" },
  { id: "nm", nome: "Números", caps: 36, t: "AT" },
  { id: "dt", nome: "Deuteronômio", caps: 34, t: "AT" },
  { id: "js", nome: "Josué", caps: 24, t: "AT" },
  { id: "jz", nome: "Juízes", caps: 21, t: "AT" },
  { id: "rt", nome: "Rute", caps: 4, t: "AT" },
  { id: "1sm", nome: "1 Samuel", caps: 31, t: "AT" },
  { id: "2sm", nome: "2 Samuel", caps: 24, t: "AT" },
  { id: "1rs", nome: "1 Reis", caps: 22, t: "AT" },
  { id: "2rs", nome: "2 Reis", caps: 25, t: "AT" },
  { id: "1cr", nome: "1 Crônicas", caps: 29, t: "AT" },
  { id: "2cr", nome: "2 Crônicas", caps: 36, t: "AT" },
  { id: "ed", nome: "Esdras", caps: 10, t: "AT" },
  { id: "ne", nome: "Neemias", caps: 13, t: "AT" },
  { id: "et", nome: "Ester", caps: 10, t: "AT" },
  { id: "jo-livro", nome: "Jó", caps: 42, t: "AT" },
  { id: "sl", nome: "Salmos", caps: 150, t: "AT" },
  { id: "pv", nome: "Provérbios", caps: 31, t: "AT" },
  { id: "ec", nome: "Eclesiastes", caps: 12, t: "AT" },
  { id: "ct", nome: "Cantares", caps: 8, t: "AT" },
  { id: "is", nome: "Isaías", caps: 66, t: "AT" },
  { id: "jr", nome: "Jeremias", caps: 52, t: "AT" },
  { id: "lm", nome: "Lamentações", caps: 5, t: "AT" },
  { id: "ez", nome: "Ezequiel", caps: 48, t: "AT" },
  { id: "dn", nome: "Daniel", caps: 12, t: "AT" },
  { id: "os", nome: "Oseias", caps: 14, t: "AT" },
  { id: "jl", nome: "Joel", caps: 3, t: "AT" },
  { id: "am", nome: "Amós", caps: 9, t: "AT" },
  { id: "ob", nome: "Obadias", caps: 1, t: "AT" },
  { id: "jn", nome: "Jonas", caps: 4, t: "AT" },
  { id: "mq", nome: "Miqueias", caps: 7, t: "AT" },
  { id: "na", nome: "Naum", caps: 3, t: "AT" },
  { id: "hc", nome: "Habacuque", caps: 3, t: "AT" },
  { id: "sf", nome: "Sofonias", caps: 3, t: "AT" },
  { id: "ag", nome: "Ageu", caps: 2, t: "AT" },
  { id: "zc", nome: "Zacarias", caps: 14, t: "AT" },
  { id: "ml", nome: "Malaquias", caps: 4, t: "AT" },
  { id: "mt", nome: "Mateus", caps: 28, t: "NT" },
  { id: "mc", nome: "Marcos", caps: 16, t: "NT" },
  { id: "lc", nome: "Lucas", caps: 24, t: "NT" },
  { id: "jo", nome: "João", caps: 21, t: "NT" },
  { id: "at", nome: "Atos", caps: 28, t: "NT" },
  { id: "rm", nome: "Romanos", caps: 16, t: "NT" },
  { id: "1co", nome: "1 Coríntios", caps: 16, t: "NT" },
  { id: "2co", nome: "2 Coríntios", caps: 13, t: "NT" },
  { id: "gl", nome: "Gálatas", caps: 6, t: "NT" },
  { id: "ef", nome: "Efésios", caps: 6, t: "NT" },
  { id: "fp", nome: "Filipenses", caps: 4, t: "NT" },
  { id: "cl", nome: "Colossenses", caps: 4, t: "NT" },
  { id: "1ts", nome: "1 Tessalonicenses", caps: 5, t: "NT" },
  { id: "2ts", nome: "2 Tessalonicenses", caps: 3, t: "NT" },
  { id: "1tm", nome: "1 Timóteo", caps: 6, t: "NT" },
  { id: "2tm", nome: "2 Timóteo", caps: 4, t: "NT" },
  { id: "tt", nome: "Tito", caps: 3, t: "NT" },
  { id: "fm", nome: "Filemom", caps: 1, t: "NT" },
  { id: "hb", nome: "Hebreus", caps: 13, t: "NT" },
  { id: "tg", nome: "Tiago", caps: 5, t: "NT" },
  { id: "1pe", nome: "1 Pedro", caps: 5, t: "NT" },
  { id: "2pe", nome: "2 Pedro", caps: 3, t: "NT" },
  { id: "1jo", nome: "1 João", caps: 5, t: "NT" },
  { id: "2jo", nome: "2 João", caps: 1, t: "NT" },
  { id: "3jo", nome: "3 João", caps: 1, t: "NT" },
  { id: "jd", nome: "Judas", caps: 1, t: "NT" },
  { id: "ap", nome: "Apocalipse", caps: 22, t: "NT" },
];

// Máximo de dias de um plano (cabe folgado no limite de linhas do Supabase grátis)
export const MAX_DIAS = 730;

// Modelos prontos. Para mudar o ritmo de um modelo, troque só o número "dias".
export const MODELOS = [
  {
    key: "ano",
    nome: "Bíblia em 1 ano",
    descricao: "Os 66 livros, de Gênesis a Apocalipse, em 365 dias.",
    books: BOOKS.map((b) => b.id),
    dias: 365,
  },
  {
    key: "nt90",
    nome: "Novo Testamento em 90 dias",
    descricao: "Os 27 livros do Novo Testamento, de Mateus a Apocalipse.",
    books: BOOKS.filter((b) => b.t === "NT").map((b) => b.id),
    dias: 90,
  },
  {
    key: "salmos-proverbios",
    nome: "Salmos e Provérbios",
    descricao: "Os 150 Salmos e os 31 capítulos de Provérbios.",
    books: ["sl", "pv"],
    dias: 90,
  },
];

// Soma dos capítulos dos livros escolhidos
export function totalCapitulos(ids) {
  return BOOKS.filter((b) => ids.includes(b.id)).reduce(
    (soma, b) => soma + b.caps,
    0
  );
}

// Lista de todos os capítulos do plano, sempre na ordem da Bíblia
export function capitulosDoPlano(ids) {
  const lista = [];
  BOOKS.forEach((b) => {
    if (!ids.includes(b.id)) return;
    for (let c = 1; c <= b.caps; c++) {
      lista.push({ livro: b.nome, cap: c });
    }
  });
  return lista;
}

// Texto da leitura de um dia (ex.: "Gênesis 4-7" ou "Gênesis 50 + Êxodo 1-2").
// Divide os capítulos igualmente entre os dias do plano.
export function leituraDoDia(lista, totalDias, dia) {
  const total = lista.length;
  if (total === 0 || totalDias <= 0 || dia < 1 || dia > totalDias) return "";

  const inicio = Math.floor(((dia - 1) * total) / totalDias);
  let fim = Math.floor((dia * total) / totalDias);
  if (fim <= inicio) fim = inicio + 1;

  const grupos = [];
  lista.slice(inicio, fim).forEach((item) => {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.livro === item.livro) {
      ultimo.fim = item.cap;
    } else {
      grupos.push({ livro: item.livro, ini: item.cap, fim: item.cap });
    }
  });

  return grupos
    .map((g) =>
      g.ini === g.fim ? `${g.livro} ${g.ini}` : `${g.livro} ${g.ini}-${g.fim}`
    )
    .join(" + ");
}

// ---------- Datas (formato "AAAA-MM-DD") ----------

function paraUTC(iso) {
  const [a, m, d] = String(iso).split("-").map(Number);
  return Date.UTC(a, m - 1, d);
}

// Quantos dias entre duas datas (fim - inicio)
export function diasEntre(inicioISO, fimISO) {
  return Math.round((paraUTC(fimISO) - paraUTC(inicioISO)) / 86400000);
}

export function somarDias(iso, n) {
  return new Date(paraUTC(iso) + n * 86400000).toISOString().slice(0, 10);
}

export function formatarData(iso) {
  if (!iso) return "";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}