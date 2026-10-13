    import { toISODate, jsDayToOurIndex } from "@/lib/dateUtils";

    // Tipos de treino. Para mudar quais tipos têm exercícios ou km, mexa só nestas 3 listas.
    export const TIPOS = [
    "Musculação",
    "Corrida",
    "Caminhada",
    "Bike",
    "Futebol",
    "Natação",
    "Luta",
    "Outro",
    ];
    export const TIPOS_COM_EXERCICIOS = ["Musculação"];
    export const TIPOS_COM_KM = ["Corrida", "Caminhada", "Bike", "Natação"];

    export function temExercicios(tipo) {
    return TIPOS_COM_EXERCICIOS.includes(tipo);
    }

    export function temKm(tipo) {
    return TIPOS_COM_KM.includes(tipo);
    }

    // Aceita "22,5" ou "22.5". Devolve NaN se estiver vazio ou inválido.
    export function paraNumero(texto) {
    if (texto === null || texto === undefined) return NaN;
    const t = String(texto).trim().replace(",", ".");
    if (t === "") return NaN;
    return Number(t);
    }

    // 22.5 vira "22,5"
    export function formatarNumero(n) {
    return Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    }

    export function formatarMinutos(min) {
    const m = Number(min) || 0;
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r === 0 ? `${h}h` : `${h}h${String(r).padStart(2, "0")}`;
    }

    // "2026-10-13" vira "ter., 13/10"
    export function diaCurto(iso) {
    return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
    });
    }

    // { sets: 3, reps: 10, weight_kg: 40 } vira "3 × 10 × 40 kg"
    export function resumoExercicio(ex) {
    const base = `${ex.sets} × ${ex.reps}`;
    const carga = Number(ex.weight_kg) || 0;
    return carga > 0 ? `${base} × ${formatarNumero(carga)} kg` : base;
    }

    // Primeiro dia da janela de 12 meses (dia 1 do mês de 11 meses atrás)
    export function inicioDaJanela(hoje = new Date()) {
    return toISODate(new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1));
    }

    // Os 12 meses da janela, do mês atual para trás
    export function mesesDaJanela(hoje = new Date()) {
    const lista = [];
    for (let i = 0; i < 12; i++) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        lista.push({ ano: d.getFullYear(), mes: d.getMonth() });
    }
    return lista;
    }

    export function diasDoMes(ano, mes) {
    return new Date(ano, mes + 1, 0).getDate();
    }

    // Quantas casas vazias antes do dia 1 (semana começando na segunda)
    export function primeiroDiaDaSemana(ano, mes) {
    return jsDayToOurIndex(new Date(ano, mes, 1).getDay());
    }

    export function isoDoDia(ano, mes, dia) {
    return `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    }