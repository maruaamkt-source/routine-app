// Perguntas rápidas do onboarding (passo 2).
// Para adicionar uma área nova: copie um bloco, use a mesma "key" do lib/modulos.js
// e pronto. Só entram as áreas que estão com pronto: true em lib/modulos.js.
//
// dias: null = todos os dias | lista de números = dias da semana (0 = Segunda ... 6 = Domingo)
// "uma" (1x na semana) não tem dias fixos aqui: o dia é escolhido na tela (escolheDia: true).

export const FREQUENCIAS = {
  nao: { label: "Não", dias: null },
  "todo-dia": { label: "Todo dia", dias: null },
  uteis: { label: "Seg a Sex", dias: [0, 1, 2, 3, 4] },
  tres: { label: "3x na semana", dias: [0, 2, 4] },
  uma: { label: "1x na semana", dias: null, escolheDia: true },
};

export const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

// Converte a frequência escolhida na lista de dias que vai para a tabela habits
export function diasDaFrequencia(freq, dia) {
  if (freq === "uma") return [typeof dia === "number" ? dia : 0];
  return FREQUENCIAS[freq].dias;
}

const TODAS = ["nao", "todo-dia", "uteis", "tres", "uma"];

export const SUGESTOES = {
  rotina: {
    titulo: "Rotina",
    perguntas: [
      {
        id: "rotina-planejar",
        pergunta: "Quer reservar um momento para planejar o dia?",
        habito: "Planejar o dia",
        opcoes: ["nao", "todo-dia", "uteis"],
      },
      {
        id: "rotina-cama",
        pergunta: "Quer ter o hábito de arrumar a cama ao acordar?",
        habito: "Arrumar a cama",
        opcoes: ["nao", "todo-dia"],
      },
      {
        id: "rotina-acordar",
        pergunta: "Quer um hábito de acordar cedo?",
        habito: "Acordar cedo",
        opcoes: ["nao", "todo-dia", "uteis"],
      },
    ],
  },
  financeiro: {
    titulo: "Financeiro",
    perguntas: [
      {
        id: "financeiro-anotar",
        pergunta: "Quer lembrar de anotar os gastos do dia?",
        habito: "Anotar os gastos do dia",
        opcoes: ["nao", "todo-dia", "tres"],
      },
    ],
  },
  // A key precisa ser igual à do módulo Espiritual em lib/modulos.js
  espiritual: {
    titulo: "Espiritual",
    perguntas: [
      {
        id: "espiritual-devocional",
        pergunta: "Quer ter um momento de devocional?",
        habito: "Devocional",
        opcoes: TODAS,
        padrao: "todo-dia",
      },
      {
        id: "espiritual-oracao",
        pergunta: "Quer ter um hábito de oração?",
        habito: "Oração",
        opcoes: TODAS,
        padrao: "todo-dia",
      },
      {
        id: "espiritual-leitura",
        pergunta: "Quer ter um hábito de leitura bíblica?",
        habito: "Leitura bíblica",
        opcoes: TODAS,
        padrao: "todo-dia",
      },
      {
        id: "espiritual-jejum",
        pergunta: "Quer fazer um jejum semanal?",
        habito: "Jejum semanal",
        opcoes: TODAS,
        padrao: "uma",
        diaPadrao: 4,
      },
      {
        id: "espiritual-culto",
        pergunta: "Quer ir ao culto toda semana?",
        habito: "Culto semanal",
        opcoes: TODAS,
        padrao: "uma",
        diaPadrao: 6,
      },
    ],
  },
};

// Usado pelo botão da aba Leitura (dias padrão de cada hábito espiritual)
export const HABITOS_ESPIRITUAIS = SUGESTOES.espiritual.perguntas.map((p) => ({
  nome: p.habito,
  dias: diasDaFrequencia(p.padrao, p.diaPadrao),
  rotulo:
    p.padrao === "uma"
      ? `1x na semana (${DIAS_SEMANA[p.diaPadrao ?? 0]})`
      : FREQUENCIAS[p.padrao].label,
}));