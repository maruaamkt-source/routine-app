// Perguntas rápidas do onboarding (passo 2).
// Para adicionar uma área nova: copie um bloco, use a mesma "key" do lib/modulos.js
// e pronto. Só entram as áreas que estão com pronto: true em lib/modulos.js.
//
// dias: null = todos os dias | lista de números = dias da semana (0 = Segunda ... 6 = Domingo)

export const FREQUENCIAS = {
  nao: { label: "Não", dias: null },
  "todo-dia": { label: "Todo dia", dias: null },
  uteis: { label: "Seg a Sex", dias: [0, 1, 2, 3, 4] },
  tres: { label: "3x na semana", dias: [0, 2, 4] },
};

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
};