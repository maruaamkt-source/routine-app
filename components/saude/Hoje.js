"use client";

import { useState } from "react";
import { paraNumero, formatarNumero } from "@/lib/esportesUtils";
import {
  BOTOES_AGUA,
  ultimosDias,
  formatarMl,
  formatarHoras,
} from "@/lib/saudeUtils";

const BTN =
  "rounded-lg border border-line bg-surface px-4 py-2 text-sm text-bone hover:border-ember disabled:opacity-50";
const INPUT =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-bone focus:border-ember focus:outline-none";
const PASSO =
  "flex h-7 w-7 items-center justify-center rounded-lg border border-line hover:text-bone";

export default function Hoje({
  hoje,
  diario,
  metaAgua,
  metaSono,
  salvando,
  podeDesfazer,
  onSomarAgua,
  onDesfazer,
  onSalvarSono,
  onMudarMetaAgua,
  onMudarMetaSono,
}) {
  const dia = diario[hoje];
  const agua = dia ? Number(dia.water_ml) || 0 : 0;
  const sono =
    dia && dia.sleep_hours !== null && dia.sleep_hours !== undefined
      ? Number(dia.sleep_hours)
      : null;

  const [outroMl, setOutroMl] = useState("");
  const [horas, setHoras] = useState(sono === null ? "" : formatarNumero(sono));
  const [aviso, setAviso] = useState("");

  const pctAgua = Math.min(100, Math.round((agua / metaAgua) * 100));
  const pctSono = sono === null ? 0 : Math.min(100, Math.round((sono / metaSono) * 100));

  // Médias dos últimos 7 dias (só conta os dias com registro)
  const dias7 = ultimosDias(7);
  const aguaDias = dias7
    .map((d) => (diario[d] ? Number(diario[d].water_ml) || 0 : 0))
    .filter((v) => v > 0);
  const sonoDias = dias7
    .filter(
      (d) =>
        diario[d] &&
        diario[d].sleep_hours !== null &&
        diario[d].sleep_hours !== undefined
    )
    .map((d) => Number(diario[d].sleep_hours));
  const mediaAgua =
    aguaDias.length > 0
      ? Math.round(aguaDias.reduce((a, b) => a + b, 0) / aguaDias.length)
      : null;
  const mediaSono =
    sonoDias.length > 0 ? sonoDias.reduce((a, b) => a + b, 0) / sonoDias.length : null;

  function adicionarOutro() {
    const n = paraNumero(outroMl);
    if (Number.isNaN(n) || n <= 0 || n > 5000) {
      setAviso("Digite uma quantidade de 1 a 5000 ml.");
      return;
    }
    setAviso("");
    onSomarAgua(Math.round(n));
    setOutroMl("");
  }

  function guardarSono() {
    const n = paraNumero(horas);
    if (Number.isNaN(n) || n <= 0 || n > 24) {
      setAviso("Digite as horas dormidas, entre 0 e 24 (ex.: 7,5).");
      return;
    }
    setAviso("");
    onSalvarSono(n);
  }

  return (
    <div className="space-y-5">
      {aviso && (
        <div className="rounded-lg border-l-2 border-ember bg-panel p-4 text-sm text-bone">
          {aviso}
        </div>
      )}

      {/* Água */}
      <div className="rounded-lg border border-line bg-panel p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="text-xs uppercase tracking-wide text-mute">Água hoje</p>
          <div className="flex items-center gap-3 text-sm text-mute">
            <button
              type="button"
              onClick={() => onMudarMetaAgua(-250)}
              aria-label="Diminuir meta de água"
              className={PASSO}
            >
              −
            </button>
            <span className="text-bone">meta {formatarMl(metaAgua)}</span>
            <button
              type="button"
              onClick={() => onMudarMetaAgua(250)}
              aria-label="Aumentar meta de água"
              className={PASSO}
            >
              +
            </button>
          </div>
        </div>

        <p className="mb-2 font-serif text-2xl text-bone">
          {formatarMl(agua)} de {formatarMl(metaAgua)}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-ember" style={{ width: `${pctAgua}%` }} />
        </div>
        {agua >= metaAgua && <p className="mt-2 text-xs text-ember">Meta de água batida!</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          {BOTOES_AGUA.map((ml) => (
            <button
              key={ml}
              type="button"
              disabled={salvando}
              onClick={() => onSomarAgua(ml)}
              className={BTN}
            >
              + {ml} ml
            </button>
          ))}
          <button
            type="button"
            disabled={salvando || !podeDesfazer}
            onClick={onDesfazer}
            className={BTN}
          >
            Desfazer último
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={outroMl}
            onChange={(e) => setOutroMl(e.target.value)}
            placeholder="Outro valor (ml)"
            className={INPUT}
          />
          <button type="button" disabled={salvando} onClick={adicionarOutro} className={BTN}>
            Adicionar
          </button>
        </div>
        <p className="mt-2 text-xs text-mute">
          O &quot;Desfazer último&quot; vale para o que você adicionou enquanto está com a página
          aberta.
        </p>
      </div>

      {/* Sono */}
      <div className="rounded-lg border border-line bg-panel p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="text-xs uppercase tracking-wide text-mute">Sono (noite passada)</p>
          <div className="flex items-center gap-3 text-sm text-mute">
            <button
              type="button"
              onClick={() => onMudarMetaSono(-0.5)}
              aria-label="Diminuir meta de sono"
              className={PASSO}
            >
              −
            </button>
            <span className="text-bone">meta {formatarHoras(metaSono)}</span>
            <button
              type="button"
              onClick={() => onMudarMetaSono(0.5)}
              aria-label="Aumentar meta de sono"
              className={PASSO}
            >
              +
            </button>
          </div>
        </div>

        <p className="mb-2 font-serif text-2xl text-bone">
          {sono === null ? "Sem registro" : `${formatarHoras(sono)} de ${formatarHoras(metaSono)}`}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-ember" style={{ width: `${pctSono}%` }} />
        </div>
        {sono !== null && sono >= metaSono && (
          <p className="mt-2 text-xs text-ember">Meta de sono batida!</p>
        )}

        <div className="mt-4 flex gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={horas}
            onChange={(e) => setHoras(e.target.value)}
            placeholder="Horas dormidas (ex.: 7,5)"
            className={INPUT}
          />
          <button type="button" disabled={salvando} onClick={guardarSono} className={BTN}>
            Salvar
          </button>
        </div>
      </div>

      {/* Médias */}
      <div className="rounded-lg border border-line bg-panel p-5">
        <p className="mb-3 text-xs uppercase tracking-wide text-mute">Média dos últimos 7 dias</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border-l-2 border-ember bg-surface p-4">
            <p className="text-xs text-mute">Água por dia</p>
            <p className="font-serif text-2xl text-bone">
              {mediaAgua === null ? "—" : formatarMl(mediaAgua)}
            </p>
            <p className="text-xs text-mute">
              {aguaDias.length} {aguaDias.length === 1 ? "dia com registro" : "dias com registro"}
            </p>
          </div>
          <div className="rounded-lg border-l-2 border-ember bg-surface p-4">
            <p className="text-xs text-mute">Sono por noite</p>
            <p className="font-serif text-2xl text-bone">
              {mediaSono === null ? "—" : formatarHoras(mediaSono)}
            </p>
            <p className="text-xs text-mute">
              {sonoDias.length} {sonoDias.length === 1 ? "noite com registro" : "noites com registro"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}