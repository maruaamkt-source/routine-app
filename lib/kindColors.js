export const KIND_COLOR = {
  tarefa: "rgb(var(--k-tarefa))",
  habito: "rgb(var(--k-habito))",
  compromisso: "rgb(var(--k-compromisso))",
  lembrete: "rgb(var(--k-lembrete))",
};

// Versão transparente de uma cor (percent = 0 a 100)
export function tint(color, percent) {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}