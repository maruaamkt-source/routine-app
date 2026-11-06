"use client";

import { useState } from "react";

const TERMOS = [
  { termo: "Série", sigla: "", def: "Um bloco de repetições seguidas, antes de descansar." },
  { termo: "Repetição (rep)", sigla: "rep", def: "Um movimento completo do exercício, da ida até a volta." },
  { termo: "Carga", sigla: "", def: "O peso usado no exercício, em kg." },
  { termo: "Volume", sigla: "", def: "Séries × repetições × carga. Mede o quanto você trabalhou um músculo." },
  { termo: "Descanso", sigla: "", def: "Tempo de pausa entre as séries." },
  { termo: "Falha", sigla: "", def: "Ponto em que você não consegue fazer mais nenhuma repetição com boa execução." },
  { termo: "Repetições em reserva", sigla: "RIR", def: "Quantas repetições ainda sobrariam antes da falha. RIR 2 = parou com 2 sobrando. RIR 0 = foi até a falha." },
  { termo: "Percepção de esforço", sigla: "RPE", def: "Nota de 1 a 10 para o esforço da série. RPE 10 = falha. RPE 8 = mais ou menos RIR 2." },
  { termo: "Aquecimento", sigla: "", def: "Séries leves antes das séries principais, para preparar músculos e articulações. Não conta como volume de trabalho." },
  { termo: "Série de trabalho", sigla: "", def: "Série pesada de verdade, depois do aquecimento." },
  { termo: "Superset", sigla: "", def: "Dois exercícios seguidos, sem descanso entre eles. Descansa só depois do par." },
  { termo: "Bi-set", sigla: "", def: "Outro nome para superset de dois exercícios." },
  { termo: "Tri-set", sigla: "", def: "Três exercícios seguidos sem descanso entre eles." },
  { termo: "Drop set", sigla: "", def: "Ao chegar perto da falha, você reduz a carga na hora e continua fazendo repetições, sem descansar." },
  { termo: "Rest-pause", sigla: "", def: "Vai até a falha, descansa uns 10 a 20 segundos e faz mais algumas repetições com a mesma carga." },
  { termo: "Exercício por tempo", sigla: "", def: "Em vez de repetições, você conta segundos. Ex.: prancha de 60 s." },
  { termo: "Isometria", sigla: "", def: "O músculo faz força sem se mover. Ex.: segurar a prancha." },
  { termo: "Fase excêntrica", sigla: "", def: "A parte em que o músculo alonga sob carga (descida do supino, por exemplo)." },
  { termo: "Fase concêntrica", sigla: "", def: "A parte em que o músculo encurta e vence a carga (subida do supino, por exemplo)." },
  { termo: "Cadência", sigla: "", def: "A velocidade de cada fase da repetição. Ex.: 3 s descendo, 1 s subindo." },
  { termo: "Amplitude", sigla: "", def: "O tamanho do movimento, do começo ao fim." },
  { termo: "1RM", sigla: "1RM", def: "Maior carga que você levantaria em uma única repetição. Pode ser estimada a partir de séries mais leves." },
  { termo: "Recorde pessoal", sigla: "PR", def: "Sua melhor marca em um exercício (mais carga ou mais repetições)." },
  { termo: "Progressão de carga", sigla: "", def: "Aumentar peso ou repetições com o tempo para continuar evoluindo." },
  { termo: "Dupla progressão", sigla: "", def: "Você define uma faixa de repetições (ex.: 8 a 12). Ao bater o topo em todas as séries, sobe a carga e volta para o início da faixa." },
  { termo: "Deload", sigla: "", def: "Semana mais leve planejada, com menos carga ou volume, para recuperar." },
  { termo: "Pirâmide", sigla: "", def: "Variar a carga entre as séries: sobe o peso e reduz as repetições (crescente), ou o contrário (decrescente)." },
  { termo: "Grupo muscular", sigla: "", def: "Conjunto de músculos trabalhados juntos. Ex.: peito, costas, pernas." },
  { termo: "Músculo alvo", sigla: "", def: "O músculo principal que o exercício trabalha." },
  { termo: "Músculos secundários", sigla: "", def: "Músculos que ajudam no movimento, mas não são o foco." },
  { termo: "Exercício composto", sigla: "", def: "Usa várias articulações e músculos ao mesmo tempo. Ex.: agachamento, supino." },
  { termo: "Exercício isolado", sigla: "", def: "Foca um músculo e uma articulação. Ex.: rosca direta, cadeira extensora." },
  { termo: "Pegada", sigla: "", def: "Jeito de segurar a barra ou o puxador (pronada, supinada, neutra)." },
  { termo: "Anilha", sigla: "", def: "Disco de peso que entra na barra." },
  { termo: "Hipertrofia", sigla: "", def: "Aumento do tamanho do músculo. Foco típico: 6 a 12 repetições por série, perto da falha." },
  { termo: "Força", sigla: "", def: "Capacidade de levantar cargas altas. Foco típico: poucas repetições, carga alta, descanso longo." },
  { termo: "Resistência muscular", sigla: "", def: "Capacidade de repetir o movimento por muito tempo. Foco típico: muitas repetições com carga leve." },
  { termo: "Sobrecarga progressiva", sigla: "", def: "Aumentar aos poucos o estímulo (carga, repetições ou séries) para o músculo continuar evoluindo." },
  { termo: "Platô", sigla: "", def: "Fase em que você para de evoluir, mesmo treinando." },
  { termo: "Overtraining", sigla: "", def: "Treinar mais do que o corpo consegue recuperar. Causa queda de rendimento, cansaço e dor que não passa." },
  { termo: "Recuperação", sigla: "", def: "Tempo em que o corpo repara o músculo depois do treino. Depende de sono, comida e descanso." },
  { termo: "Supercompensação", sigla: "", def: "O corpo se recupera um pouco acima do nível anterior, e é aí que você evolui." },
  { termo: "Dor muscular tardia", sigla: "DOMS", def: "Dor que aparece 24 a 72 horas depois de um treino novo ou mais pesado." },
  { termo: "Tempo sob tensão", sigla: "TUT", def: "Tempo total em que o músculo fica trabalhando durante a série." },
  { termo: "Falha técnica", sigla: "", def: "Ponto em que a execução começa a perder a forma correta, mesmo que ainda desse pra mexer a carga." },
  { termo: "Falha muscular", sigla: "", def: "Ponto em que o músculo não consegue mais mover a carga, mesmo com esforço máximo." },
  { termo: "Repetição forçada", sigla: "", def: "Repetição extra feita depois da falha, com ajuda de um parceiro." },
  { termo: "Repetição negativa", sigla: "", def: "Só a fase excêntrica: você desce a carga devagar, com ajuda para subir." },
  { termo: "Repetição parcial", sigla: "", def: "Repetição com amplitude reduzida, em geral no trecho mais difícil ou mais fácil do movimento." },
  { termo: "Roubo", sigla: "", def: "Usar impulso do corpo para ajudar a levantar a carga. Tira o foco do músculo e aumenta o risco de lesão." },
  { termo: "Pré-exaustão", sigla: "", def: "Fazer um exercício isolado antes do composto para cansar o músculo alvo primeiro." },
  { termo: "Pós-exaustão", sigla: "", def: "Fazer um exercício isolado logo depois do composto para esgotar o músculo alvo." },
  { termo: "Cluster set", sigla: "", def: "Série dividida em mini-blocos de repetições com pausas curtas (10 a 30 s) entre eles." },
  { termo: "Circuito", sigla: "", def: "Vários exercícios em sequência, com pouco ou nenhum descanso entre eles, repetindo a rodada." },
  { termo: "Antagonistas", sigla: "", def: "Músculos com função oposta. Ex.: bíceps e tríceps, peito e costas. Muito usados em superset." },
  { termo: "Agonista", sigla: "", def: "O músculo que faz o movimento principal." },
  { termo: "Divisão de treino", sigla: "Split", def: "Como você reparte os músculos pelos dias da semana. Ex.: A/B/C, Push/Pull/Legs." },
  { termo: "Full body", sigla: "", def: "Treino de corpo inteiro na mesma sessão." },
  { termo: "Upper/Lower", sigla: "", def: "Divisão em dias de parte superior e dias de parte inferior do corpo." },
  { termo: "Push/Pull/Legs", sigla: "PPL", def: "Divisão em empurrar (peito, ombro, tríceps), puxar (costas, bíceps) e pernas." },
  { termo: "Frequência", sigla: "", def: "Quantas vezes por semana você treina o mesmo músculo (ou treina em geral)." },
  { termo: "Intensidade", sigla: "", def: "O quão pesada ou difícil é a série em relação ao seu máximo." },
  { termo: "Unilateral", sigla: "", def: "Exercício feito com um lado do corpo por vez. Ex.: afundo, rosca concentrada." },
  { termo: "Bilateral", sigla: "", def: "Exercício feito com os dois lados ao mesmo tempo. Ex.: agachamento, supino reto." },
  { termo: "Peso livre", sigla: "", def: "Barras e halteres, sem trilho guiando o movimento." },
  { termo: "Máquina", sigla: "", def: "Equipamento com trilho ou guia que controla a trajetória do movimento." },
  { termo: "Polia", sigla: "", def: "Equipamento com cabo que mantém a tensão no músculo durante todo o movimento." },
  { termo: "Peso do corpo", sigla: "", def: "Exercício em que a carga é o seu próprio corpo. Ex.: flexão, barra fixa, prancha." },
  { termo: "Core", sigla: "", def: "Região do meio do corpo: abdômen, lombar e músculos que estabilizam o tronco." },
  { termo: "Mobilidade", sigla: "", def: "Capacidade de mover uma articulação em toda a sua amplitude, com controle." },
  { termo: "Alongamento", sigla: "", def: "Exercício para esticar o músculo e ganhar flexibilidade." },
  { termo: "Cardio", sigla: "", def: "Exercício que acelera o coração por um tempo contínuo. Ex.: corrida, bike, esteira." },
  { termo: "HIIT", sigla: "HIIT", def: "Treino intervalado de alta intensidade: tiros fortes alternados com pausas curtas." },
  { termo: "LISS", sigla: "LISS", def: "Cardio de baixa intensidade e ritmo constante, como caminhada longa." },
  { termo: "Conexão mente-músculo", sigla: "", def: "Focar a atenção no músculo que está trabalhando, para sentir ele fazer a força." },
  { termo: "Manobra de Valsalva", sigla: "", def: "Segurar o ar e contrair o abdômen para estabilizar o tronco em cargas muito altas." },
  { termo: "Congestão", sigla: "Pump", def: "Sensação de músculo cheio e inchado durante e logo depois do treino, por causa do fluxo de sangue." },
];

function norm(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const INPUT =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-bone placeholder:text-mute focus:border-ember focus:outline-none";

export default function GuiaTermos() {
  const [busca, setBusca] = useState("");
  const q = norm(busca.trim());

  const lista = TERMOS.filter((t) => {
    if (!q) return true;
    return (
      norm(t.termo).includes(q) ||
      norm(t.sigla).includes(q) ||
      norm(t.def).includes(q)
    );
  });

  return (
    <div className="rounded-lg border border-line bg-panel p-5">
      <p className="text-xs uppercase tracking-wide text-mute">Guia de termos</p>

      <input
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Pesquisar (ex.: RIR, drop set, aquecimento)"
        className={`${INPUT} mt-3`}
      />

      <div className="mt-4 space-y-3">
        {lista.length === 0 && (
          <p className="text-sm text-mute">Nenhum termo encontrado.</p>
        )}
        {lista.map((t) => (
          <div key={t.termo} className="border-b border-line pb-3 last:border-b-0 last:pb-0">
            <p className="text-sm font-medium text-bone">
              {t.termo}
              {t.sigla && t.sigla !== t.termo ? (
                <span className="ml-2 text-xs text-ember">{t.sigla}</span>
              ) : null}
            </p>
            <p className="mt-1 text-sm text-mute">{t.def}</p>
          </div>
        ))}
      </div>
    </div>
  );
}