export function toISODate(date) {
  const d = new Date(date);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

export function todayISO() {
  return toISODate(new Date());
}

export function getWeekDates(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const week = [];
  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    week.push(current);
  }
  return week;
}

export const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function formatDayLabel(date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function calculateStreak(logs) {
  const completedDates = new Set(
    logs.filter((l) => l.completed).map((l) => l.date)
  );

  let streak = 0;
  let cursor = new Date();

  if (!completedDates.has(toISODate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (completedDates.has(toISODate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

// Converte o getDay() do JS (0=Domingo) para o nosso índice (0=Segunda)
export function jsDayToOurIndex(jsDay) {
  return jsDay === 0 ? 6 : jsDay - 1;
}

// Verifica se um hábito se aplica em uma data específica.
// days_of_week === null ou vazio significa "todos os dias".
export function habitAppliesOnDate(habit, date) {
  if (!habit.days_of_week || habit.days_of_week.length === 0) return true;
  const ourIndex = jsDayToOurIndex(date.getDay());
  return habit.days_of_week.includes(ourIndex);
}

export function habitAppliesOnISO(habit, iso) {
  return habitAppliesOnDate(habit, new Date(`${iso}T00:00:00`));
}