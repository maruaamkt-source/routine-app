let cache = null;
let pendente = null;

const POR_ALVO = {
  pectorals: "Peito",
  lats: "Costas",
  "upper back": "Costas",
  spine: "Costas",
  "levator scapulae": "Costas",
  traps: "Costas",
  delts: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  quads: "Quadríceps",
  adductors: "Quadríceps",
  hamstrings: "Posterior",
  glutes: "Glúteos",
  abductors: "Glúteos",
  calves: "Panturrilha",
  abs: "Abdômen",
  "serratus anterior": "Abdômen",
  forearms: "Outro",
  "cardiovascular system": "Outro",
};

export function carregarCatalogo() {
  if (cache) return Promise.resolve(cache);
  if (pendente) return pendente;
  pendente = fetch("/exercicios.json")
    .then((r) => (r.ok ? r.json() : { exercicios: [] }))
    .then((j) => {
      const lista = j.exercicios || [];
      if (lista.length > 0) cache = lista;
      pendente = null;
      return lista;
    })
    .catch(() => {
      pendente = null;
      return [];
    });
  return pendente;
}

export function grupoDoCatalogo(item) {
  const en = (item.nome_en || item.nome || "").toLowerCase();
  if (item.parte === "upper legs" && item.alvo === "glutes") {
    if (/squat|lunge|leg press|step-up|split|hack|jump/.test(en)) return "Quadríceps";
    if (/deadlift|good morning|rack pull/.test(en)) return "Posterior";
    return "Glúteos";
  }
  return POR_ALVO[item.alvo] || "";
}