const fs = require("fs");

const arqTrad = process.argv[2];
if (!arqTrad) {
  console.log("Uso: node scripts/traduzir.js traducao.json");
  process.exit(1);
}

const caminho = "public/exercicios.json";
const trad = JSON.parse(fs.readFileSync(arqTrad, "utf8"));
const dados = JSON.parse(fs.readFileSync(caminho, "utf8"));

fs.writeFileSync("public/exercicios.backup.json", JSON.stringify(dados));

let feitos = 0;
let faltando = [];

for (const ex of dados.exercicios) {
  const pt = trad[ex.id];
  if (pt) {
    ex.nome_en = ex.nome;
    ex.nome = pt;
    feitos++;
  } else {
    faltando.push(ex.id);
  }
}

dados.idioma = "pt";
fs.writeFileSync(caminho, JSON.stringify(dados));

console.log("Traduzidos:", feitos, "de", dados.exercicios.length);
if (faltando.length) console.log("Sem tradução (ficaram em inglês):", faltando.join(", "));