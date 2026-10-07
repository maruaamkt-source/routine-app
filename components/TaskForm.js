"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import { toISODate, WEEKDAY_LABELS } from "@/lib/dateUtils";

const KINDS = [
  { key: "tarefa", label: "Tarefa" },
  { key: "compromisso", label: "Compromisso" },
  { key: "lembrete", label: "Lembrete" },
];

const REPEATS = [
  { key: "none", label: "Não repete" },
  { key: "daily", label: "Todo dia" },
  { key: "weekdays", label: "Dias úteis" },
  { key: "custom", label: "Escolher dias" },
];

const REPEAT_DAYS_AHEAD = 60;

function newSeriesId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Datas das repetições (depois do dia escolhido). 0 = segunda, igual aos hábitos.
function buildRepeatDates(startISO, repeat, customDays) {
  const dates = [];
  const start = new Date(`${startISO}T00:00:00`);
  for (let i = 1; i <= REPEAT_DAYS_AHEAD; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const idx = (d.getDay() + 6) % 7;
    const ok =
      repeat === "daily" ||
      (repeat === "weekdays" && idx <= 4) ||
      (repeat === "custom" && customDays.includes(idx));
    if (ok) dates.push(toISODate(d));
  }
  return dates;
}

export default function TaskForm({ defaultDate, onCreate, compact = false }) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("tarefa");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [repeat, setRepeat] = useState("none");
  const [customDays, setCustomDays] = useState([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  function reset() {
    setTitle("");
    setKind("tarefa");
    setStartTime("");
    setEndTime("");
    setRepeat("none");
    setCustomDays([]);
    setError("");
    setOpen(false);
  }

  function toggleDay(i) {
    setCustomDays((prev) =>
      prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i]
    );
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    if (endTime && !startTime) {
      setError("Defina o horário de início antes do fim.");
      return;
    }
    if (endTime && endTime <= startTime) {
      setError("O fim precisa ser depois do início.");
      return;
    }
    if (repeat === "custom" && customDays.length === 0) {
      setError("Escolha pelo menos um dia da semana.");
      return;
    }

    const base = {
      title: title.trim(),
      due_date: defaultDate,
      due_time: startTime || null,
      start_time: startTime || null,
      end_time: endTime || null,
      kind,
    };

    const extraDates =
      repeat === "none" ? [] : buildRepeatDates(defaultDate, repeat, customDays);
    const seriesId = extraDates.length > 0 ? newSeriesId() : null;

    await onCreate(seriesId ? { ...base, series_id: seriesId } : base);

    if (seriesId && user) {
      const rows = extraDates.map((d) => ({
        ...base,
        due_date: d,
        series_id: seriesId,
        user_id: user.id,
      }));
      const { error: insertError } = await supabase.from("tasks").insert(rows);
      if (insertError) {
        setError("Criei a primeira, mas não consegui criar as repetições.");
        return;
      }
      reset();
      window.location.reload();
      return;
    }

    reset();
  }

  if (!open) {
    if (compact) {
      return (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-line text-xs text-bone hover:border-ember/40 hover:text-ember transition-colors"
        >
          <span className="text-ember text-base leading-none">+</span>
          Adicionar
        </button>
      );
    }
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 w-full text-left px-5 py-4 rounded-lg border border-line bg-panel hover:border-ember/40 transition-colors"
      >
        <span className="text-ember text-lg leading-none">+</span>
        <span className="text-sm text-bone/80 flex-1">Adicionar uma tarefa</span>
        <span className="text-mute">→</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-ember/40 bg-panel p-4"
    >
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="O que você precisa fazer?"
        className="text-sm bg-transparent text-bone border-b border-line pb-2 focus:outline-none focus:border-ember/60"
      />

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo">
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            role="radio"
            aria-checked={kind === k.key}
            onClick={() => setKind(k.key)}
            className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
              kind === k.key
                ? "border-ember text-ember bg-ember/10"
                : "border-line text-mute hover:text-bone"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-mute">
          Início
          <input
            type="time"
            value={startTime}
            onChange={(e) => {
              setStartTime(e.target.value);
              setError("");
            }}
            className="text-sm bg-transparent text-bone border border-line rounded px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-mute">
          Fim
          <input
            type="time"
            value={endTime}
            onChange={(e) => {
              setEndTime(e.target.value);
              setError("");
            }}
            className="text-sm bg-transparent text-bone border border-line rounded px-2 py-1.5"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-mute">Repetir</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Repetir">
          {REPEATS.map((r) => (
            <button
              key={r.key}
              type="button"
              role="radio"
              aria-checked={repeat === r.key}
              onClick={() => {
                setRepeat(r.key);
                setError("");
              }}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                repeat === r.key
                  ? "border-ember text-ember bg-ember/10"
                  : "border-line text-mute hover:text-bone"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {repeat === "custom" && (
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_LABELS.map((label, i) => (
              <button
                key={label}
                type="button"
                aria-pressed={customDays.includes(i)}
                onClick={() => toggleDay(i)}
                className={`w-11 h-9 rounded-md text-xs border transition-colors ${
                  customDays.includes(i)
                    ? "border-ember text-ember bg-ember/10"
                    : "border-line text-mute hover:text-bone"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {repeat !== "none" && (
          <p className="text-[11px] text-mute">
            Cria as repetições dos próximos {REPEAT_DAYS_AHEAD} dias.
          </p>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="tracked bg-ember text-ink text-sm px-4 py-2 rounded font-medium hover:bg-ember/90 transition-colors"
        >
          Adicionar
        </button>
        <button
          type="button"
          onClick={reset}
          className="text-sm text-mute hover:text-bone"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}