const PRECO = { primeiraHora: 15, horaExtra: 10, diaria: 85 };

/* ---------- utilidades ---------- */
const pad = n => String(n).padStart(2, "0");
const dataBR = d => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const dataHoraBR = d => `${dataBR(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const reais = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function minutosEntre(inicio, fim) {
  const a = new Date(inicio), b = new Date(fim);
  if (isNaN(a) || isNaN(b) || b < a) return null;
  return Math.floor((b - a) / 60000);
}
function formatarTempo(min) { return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`; }

/* Cálculo em minutos inteiros (sem arredondamento de ponto flutuante) */
function calcularValor(inicio, fim) {
  const total = minutosEntre(inicio, fim);
  if (total === null) return null;
  const diarias = Math.floor(total / 1440);
  const resto = total % 1440;
  let valor = diarias * PRECO.diaria;
  if (resto > 0 || diarias === 0) {
    const horas = Math.max(1, Math.ceil(resto / 60));
    valor += Math.min(PRECO.primeiraHora + (horas - 1) * PRECO.horaExtra, PRECO.diaria);
  }
  return valor;
}

function mostrarMensagem(texto, tipo) {
  const el = document.getElementById("mensagem");
  if (!el) return alert(texto);
  el.textContent = texto; el.className = "msg " + tipo;
}

/* ---------- cabeçalho ---------- */
function atualizarRelogio() {
  const agora = new Date(), el = document.getElementById("relogio");
  if (el) el.innerHTML = `${dataBR(agora)}<br>${pad(agora.getHours())}:${pad(agora.getMinutes())}`;
}

/* ---------- HOME ---------- */
function iniciarHome() {
  const render = () => {
    const ocupadas = veiculosAtivos().length;
    document.getElementById("disponiveis").textContent = TOTAL_VAGAS - ocupadas;
    document.getElementById("ocupadas").textContent = ocupadas;
    document.getElementById("totais").textContent = TOTAL_VAGAS;
  };
  render();
  window.addEventListener("storage", render);
}

/* ---------- REGISTRAR ---------- */
function iniciarRegistrar() {
  const inicio = document.getElementById("inicio");
  const att = () => inicio.value = dataHoraBR(new Date());
  att(); setInterval(att, 1000);
  document.getElementById("btnGuardar").addEventListener("click", () => {
    const r = registrarVeiculo({
      nome: document.getElementById("nome").value,
      placa: document.getElementById("placa").value,
      prisma: document.getElementById("prisma").value });
    if (!r.ok) return mostrarMensagem(r.erro, "erro");
    mostrarMensagem(`Veículo registrado com sucesso! Sua vaga é a número ${r.vaga}.`, "ok");
    ["nome", "placa", "prisma"].forEach(id => document.getElementById(id).value = "");
  });
}

/* ---------- SAÍDA ---------- */
function iniciarSaida() {
  const $ = id => document.getElementById(id);
  const lista = $("placas");
  let atual = null;
  const preencherLista = () => {
    lista.innerHTML = veiculosAtivos().map(r => `<option value="${r.placa}">`).join("");
  };
  const limpar = () => {
    ["nome", "prisma", "inicio", "fim"].forEach(id => $(id).value = "");
    $("valor").textContent = "—"; $("tempo").textContent = "—"; atual = null; $("btnConfirmar").disabled = true;
  };
  const atualizar = () => {
    if (!atual) return;
    const fim = new Date();
    $("fim").value = dataHoraBR(fim);
    const min = minutosEntre(atual.inicio, fim);
    if (min === null) return mostrarMensagem("Horário inválido.", "erro");
    $("tempo").textContent = formatarTempo(min);
    $("valor").textContent = reais(calcularValor(atual.inicio, fim));
  };
  const buscar = () => {
    const reg = buscarAtivoPorPlaca($("placa").value);
    if (!reg) { limpar(); if ($("placa").value.trim().length >= 7) mostrarMensagem("Nenhum veículo estacionado com essa placa.", "erro"); return; }
    atual = reg;
    $("nome").value = reg.nome; $("prisma").value = reg.prisma;
    $("inicio").value = dataHoraBR(new Date(reg.inicio));
    $("btnConfirmar").disabled = false;
    $("mensagem").className = "msg"; atualizar();
  };
  preencherLista(); limpar();
  $("placa").addEventListener("input", buscar);
  setInterval(atualizar, 1000);
  $("btnConfirmar").addEventListener("click", () => {
    if (!atual || !confirm("Confirmar o pagamento e a saída do veículo " + atual.placa + "?")) return;
    const r = finalizarSaida(atual.placa);
    if (!r.ok) return mostrarMensagem(r.erro, "erro");
    const reg = r.registro;
    $("fim").value = dataHoraBR(new Date(reg.fim));
    $("valor").textContent = reais(reg.valorTotal);
    $("tempo").textContent = formatarTempo(minutosEntre(reg.inicio, reg.fim));
    atual = null; $("btnConfirmar").disabled = true; $("placa").readOnly = true;
    mostrarMensagem(`Saída confirmada. Vaga ${reg.vaga} liberada.`, "ok");
    setTimeout(() => { $("placa").readOnly = false; $("placa").value = ""; preencherLista(); }, 0);

  });
}

/* ---------- VEÍCULOS ---------- */
function iniciarVeiculos() {
  const box = document.getElementById("lista");
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const render = () => {
    const ativos = veiculosAtivos().sort((a, b) => a.vaga - b.vaga);
    if (!ativos.length) { box.innerHTML = '<p class="vazio">Nenhum veículo estacionado no momento.</p>'; return; }
    const agora = new Date();
    box.innerHTML = ativos.map(r => `<article class="cartao"><span class="vaga">#${r.vaga}</span>
      <span class="info">Placa: ${esc(r.placa)}</span><span class="info">Prisma: ${esc(r.prisma)}</span>
      <span class="info">Nome: ${esc(r.nome)}</span><span class="info">Tempo: ${formatarTempo(minutosEntre(r.inicio, agora) ?? 0)}</span></article>`).join("");
  };
  render(); setInterval(render, 15000);
  window.addEventListener("storage", render);
}

document.addEventListener("DOMContentLoaded", () => {
  atualizarRelogio(); setInterval(atualizarRelogio, 1000);
  const p = document.body.dataset.pagina;
  ({ home: iniciarHome, registrar: iniciarRegistrar, saida: iniciarSaida, veiculos: iniciarVeiculos }[p] || (() => {}))();
});
