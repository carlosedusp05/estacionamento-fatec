"use strict";
/* ===== Regras de negócio ===== */
const CAPACIDADE = 50;
const TOLERANCIA_MIN = 15;     // até 15 min: sem cobrança
const VALOR_PRIMEIRA_HORA = 15; // de 15 min até 1h
const VALOR_HORA_EXTRA = 10;    // cada hora adicional
const LIMITE_DIARIA_H = 8;      // a partir de 8h = diária
const VALOR_DIARIA = 85;
const CHAVE = "estaciona-fatec:ativos";
 
/* ===== Armazenamento ===== */
function carregar(){
  try{ return JSON.parse(localStorage.getItem(CHAVE)) || []; }catch{ return []; }
}
function salvar(lista){
  try{ localStorage.setItem(CHAVE, JSON.stringify(lista)); }catch{}
}
let ativos = carregar();
 
/* ===== Utilitários ===== */
const $ = id => document.getElementById(id);
const normalizarPlaca = p => p.toUpperCase().replace(/[^A-Z0-9]/g, "");
const pad = n => String(n).padStart(2,"0");
const fmtDataHora = ts => { const d=new Date(ts);
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtDuracao = min => `${pad(Math.floor(min/60))}:${pad(min%60)}`;
const fmtMoeda = v => v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const paraInputLocal = ts => { const d=new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
 
function calcularValor(minutos){
  if (minutos <= TOLERANCIA_MIN) return 0;
  if (minutos >= LIMITE_DIARIA_H*60) return VALOR_DIARIA;
  if (minutos <= 60) return VALOR_PRIMEIRA_HORA;
  const horasExtras = Math.ceil((minutos-60)/60);
  return Math.min(VALOR_PRIMEIRA_HORA + horasExtras*VALOR_HORA_EXTRA, VALOR_DIARIA);
}
 
/* ===== Relógio ===== */
function atualizarRelogio(){
  const d = new Date();
  $("data").textContent = `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`;
  $("hora").textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
setInterval(atualizarRelogio, 1000); atualizarRelogio();
 
/* ===== Navegação ===== */
function ir(tela){
  document.querySelectorAll(".tela").forEach(t => t.classList.remove("ativa"));
  $("tela-"+tela).classList.add("ativa");
  if (tela==="inicio") atualizarVagas();
  if (tela==="veiculos") renderLista();
  if (tela==="ocupar") prepararEntrada();
  if (tela==="sair") prepararSaida();
}
document.querySelectorAll("[data-ir]").forEach(b => b.addEventListener("click", () => ir(b.dataset.ir)));
 
/* ===== Vagas ===== */
function atualizarVagas(){
  $("vagas-totais").textContent = CAPACIDADE;
  $("vagas-ocupadas").textContent = ativos.length;
  $("vagas-livres").textContent = CAPACIDADE - ativos.length;
}
 
/* ===== Entrada ===== */
function mensagem(el, texto, ok=false){ el.textContent = texto; el.classList.toggle("ok", ok); }
function prepararEntrada(){
  ["e-nome","e-placa","e-prisma"].forEach(i => $(i).value = "");
  $("e-inicio").value = paraInputLocal(Date.now());
  mensagem($("msg-entrada"), "");
}
function registrarEntrada(){
  const msg = $("msg-entrada");
  const nome = $("e-nome").value.trim();
  const placa = normalizarPlaca($("e-placa").value);
  const prisma = $("e-prisma").value.trim();
  const inicio = new Date($("e-inicio").value).getTime();
 
  if (!placa) return mensagem(msg, "Informe a placa do veículo.");
  if (placa.length < 7) return mensagem(msg, "Placa inválida: use 7 caracteres (ex.: ABC1D23).");
  if (!nome) return mensagem(msg, "Informe o nome do cliente.");
  if (!prisma) return mensagem(msg, "Informe o prisma do veículo.");
  if (isNaN(inicio)) return mensagem(msg, "Informe o horário de entrada.");
  if (inicio > Date.now()+60000) return mensagem(msg, "O horário de entrada não pode estar no futuro.");
  if (ativos.some(v => v.placa === placa)) return mensagem(msg, `A placa ${placa} já está no estacionamento.`);
  if (ativos.length >= CAPACIDADE) return mensagem(msg, "Estacionamento lotado: não há vagas livres.");
 
  ativos.push({ nome, placa, prisma, inicio });
  salvar(ativos);
  mensagem(msg, `Entrada registrada: ${placa}.`, true);
  ["e-nome","e-placa","e-prisma"].forEach(i => $(i).value = "");
  $("e-inicio").value = paraInputLocal(Date.now());
}
$("btn-guardar").addEventListener("click", registrarEntrada);
$("form-entrada").addEventListener("submit", e => { e.preventDefault(); registrarEntrada(); });
 
/* ===== Saída ===== */
let veiculoSaida = null, fimSaida = 0;
function limparSaida(){
  ["s-nome","s-prisma","s-inicio","s-fim"].forEach(i => $(i).value = "");
  $("s-valor").textContent = "--"; $("s-tempo").textContent = "--";
  $("btn-confirmar").disabled = true; $("agradece").hidden = true;
  veiculoSaida = null;
}
function prepararSaida(){ $("s-placa").value = ""; limparSaida(); mensagem($("msg-saida"), ""); }
function buscarVeiculo(){
  limparSaida();
  const placa = normalizarPlaca($("s-placa").value);
  const msg = $("msg-saida");
  if (!placa) return mensagem(msg, "Informe a placa para registrar a saída.");
  const v = ativos.find(x => x.placa === placa);
  if (!v) return mensagem(msg, `Nenhum veículo ativo com a placa ${placa}.`);
  veiculoSaida = v; fimSaida = Date.now();
  const minutos = Math.max(0, Math.floor((fimSaida - v.inicio)/60000));
  $("s-nome").value = v.nome; $("s-prisma").value = v.prisma;
  $("s-inicio").value = fmtDataHora(v.inicio); $("s-fim").value = fmtDataHora(fimSaida);
  $("s-tempo").textContent = fmtDuracao(minutos);
  $("s-valor").textContent = fmtMoeda(calcularValor(minutos));
  $("btn-confirmar").disabled = false;
  mensagem(msg, "");
}
function confirmarSaida(){
  if (!veiculoSaida) return;
  const placa = veiculoSaida.placa;
  ativos = ativos.filter(v => v.placa !== placa); // libera a vaga
  salvar(ativos);
  $("btn-confirmar").disabled = true;
  $("agradece").hidden = false;
  mensagem($("msg-saida"), `Saída registrada: vaga de ${placa} liberada.`, true);
  veiculoSaida = null;
}
$("btn-buscar").addEventListener("click", buscarVeiculo);
$("s-placa").addEventListener("keydown", e => { if (e.key==="Enter") buscarVeiculo(); });
$("btn-confirmar").addEventListener("click", confirmarSaida);
 
/* ===== Lista de veículos ativos ===== */
function renderLista(){
  const ul = $("lista"); ul.innerHTML = "";
  if (!ativos.length){
    ul.innerHTML = '<li class="vazio">Nenhum veículo no estacionamento. Use OCUPAR para registrar uma entrada.</li>';
    return;
  }
  ativos.forEach((v,i) => {
    const min = Math.max(0, Math.floor((Date.now()-v.inicio)/60000));
    const li = document.createElement("li");
    const campos = [["Placa",v.placa],["Prisma",v.prisma],["Nome",v.nome],["Tempo",fmtDuracao(min)]];
    li.innerHTML = `<span class="num">#${i+1}</span>` +
      campos.map(([k]) => `<span class="campo">${k}: <span></span></span>`).join("");
    li.querySelectorAll(".campo > span").forEach((s,idx) => s.textContent = campos[idx][1]); // evita HTML injetado
    ul.appendChild(li);
  });
}
 
atualizarVagas();