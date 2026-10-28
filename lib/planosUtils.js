function diaCriacao(p) {
  const d = new Date(p.created_at);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${dd}`;
}

export function indiceSemana(iso) {
  const [a, m, d] = iso.split("-").map(Number);
  return (new Date(a, m - 1, d).getDay() + 6) % 7; // segunda = 0
}

// Modelos planejados para o dia (só conta a partir do dia em que o modelo foi criado)
export function planosDoDia(planos, iso) {
  const i = indiceSemana(iso);
  return planos.filter(
    (p) => (p.weekdays || []).includes(i) && iso >= diaCriacao(p)
  );
}

export function planoFeito(p, iso, treinos) {
  return treinos.some(
    (t) =>
      t.day === iso &&
      (t.plan_id ? t.plan_id === p.id : t.name === p.name && t.type === p.type)
  );
}