// Lista única dos módulos do app.
// Para adicionar um módulo novo: copie um bloco, mude os dados e pronto.
// - key: nome interno (salvo no banco, nunca mude depois)
// - pronto: false = aparece no onboarding como "em breve" e NÃO entra no menu
// - padrao: true = já vem marcado na tela de boas-vindas
// - itens: links que o módulo coloca no menu (icon = nome do ícone no Nav.js)

export const HOJE = { href: "/", label: "Hoje", icon: "home" };

export const MODULOS = [
  {
    key: "rotina",
    nome: "Rotina",
    descricao: "Tarefas, agenda, calendário e hábitos",
    emoji: "📅",
    pronto: true,
    padrao: true,
    itens: [
      { href: "/calendar", label: "Agenda", icon: "agenda" },
      { href: "/calendario", label: "Calendário", icon: "calendar" },
      { href: "/habits", label: "Hábitos", icon: "habits" },
      { href: "/history", label: "Histórico", icon: "history" },
    ],
  },
  {
    key: "financeiro",
    nome: "Financeiro",
    descricao: "Renda, gastos, metas e parcelas",
    emoji: "💰",
    pronto: true,
    padrao: false,
    itens: [{ href: "/financeiro", label: "Financeiro", icon: "wallet" }],
  },
  {
    key: "espiritual",
    nome: "Espiritual",
    descricao: "Leitura bíblica, oração e versículos",
    emoji: "📖",
    pronto: false,
    padrao: false,
    itens: [],
  },
  {
    key: "esportes",
    nome: "Esportes",
    descricao: "Treinos e dias treinados",
    emoji: "🏃",
    pronto: false,
    padrao: false,
    itens: [],
  },
  {
    key: "saude",
    nome: "Saúde",
    descricao: "Água, sono, peso e medidas",
    emoji: "❤️",
    pronto: false,
    padrao: false,
    itens: [],
  },
  {
    key: "estudos",
    nome: "Estudos",
    descricao: "Matérias, metas de horas e pomodoro",
    emoji: "🎓",
    pronto: false,
    padrao: false,
    itens: [],
  },
];

export const TODOS = MODULOS.map((m) => m.key);

// Itens do menu: "Hoje" sempre aparece; o resto depende do que a pessoa escolheu
export function itensDoMenu(escolhidos) {
  const lista = Array.isArray(escolhidos) ? escolhidos : [];
  const itens = [HOJE];
  MODULOS.forEach((m) => {
    if (m.pronto && lista.includes(m.key)) {
      m.itens.forEach((i) => itens.push(i));
    }
  });
  return itens;
}