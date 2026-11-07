const CHAVE = "estacionaFatec.registros";
const TOTAL_VAGAS = 50;

function lerRegistros() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || []; }
  catch { return []; }
}
function salvarRegistros(lista) { localStorage.setItem(CHAVE, JSON.stringify(lista)); }
function veiculosAtivos() { return lerRegistros().filter(r => r.status === "ocupada"); }
function vagasOcupadas() { return veiculosAtivos().map(r => r.vaga); }
function vagasLivres() {
  const usadas = new Set(vagasOcupadas());
  const livres = [];
  for (let i = 1; i <= TOTAL_VAGAS; i++) if (!usadas.has(i)) livres.push(i);
  return livres;
}
function normalizarPlaca(p) { return String(p || "").toUpperCase().replace(/[\s-]/g, ""); }
function buscarAtivoPorPlaca(placa) {
  const n = normalizarPlaca(placa);
  return veiculosAtivos().find(r => r.placa === n) || null;
}

function registrarVeiculo({ nome, placa, prisma }) {
  nome = String(nome || "").trim(); prisma = String(prisma || "").trim();
  placa = normalizarPlaca(placa);
  if (!nome || !placa || !prisma) return { ok: false, erro: "Preencha nome, placa e prisma." };
  if (buscarAtivoPorPlaca(placa)) return { ok: false, erro: "Já existe um veículo estacionado com a placa " + placa + "." };
  const livres = vagasLivres();
  if (livres.length === 0) return { ok: false, erro: "Estacionamento lotado: as 50 vagas estão ocupadas." };
  const vaga = livres[Math.floor(Math.random() * livres.length)];
  const lista = lerRegistros();
  lista.push({ id: Date.now() + "-" + Math.random().toString(36).slice(2, 8), nome, placa, prisma, vaga,
    inicio: new Date().toISOString(), fim: null, status: "ocupada", valorTotal: null });
  salvarRegistros(lista);
  return { ok: true, vaga };
}

function finalizarSaida(placa) {
  const lista = lerRegistros();
  const reg = lista.find(r => r.status === "ocupada" && r.placa === normalizarPlaca(placa));
  if (!reg) return { ok: false, erro: "Veículo não encontrado ou saída já realizada." };
  const agora = new Date();
  if (agora < new Date(reg.inicio)) return { ok: false, erro: "Horário inválido." };
  reg.fim = agora.toISOString();
  reg.valorTotal = calcularValor(reg.inicio, reg.fim);
  reg.status = "finalizada";
  salvarRegistros(lista);
  return { ok: true, registro: reg };
}
