import { calcular } from './finance.js';

export const FORMATO = 'HappyMoney';
export const TIPO = 'sheet';
export const VERSAO = 1;

export function novoId() {
  return globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(16).slice(2);
}

export function agoraISO() {
  return new Date().toISOString();
}

function dinheiro(valor) {
  return Math.round((Number(valor) || 0) * 100) / 100;
}

export function criarPlanilha({ nome, salarioBruto } = {}) {
  const agora = agoraISO();
  return {
    format: FORMATO,
    type: TIPO,
    version: VERSAO,
    id: novoId(),
    nome: String(nome || '').trim(),
    salarioBruto: dinheiro(salarioBruto),
    moeda: 'BRL',
    despesas: [],
    criadaEm: agora,
    atualizadaEm: agora,
  };
}

export function criarDespesa({ nome, valor } = {}) {
  return {
    id: novoId(),
    nome: String(nome || '').trim(),
    valor: dinheiro(valor),
    criadaEm: agoraISO(),
  };
}

export function montarDocumento(sheet) {
  const snapshot = calcular(sheet);
  return {
    ...sheet,
    resumo: {
      total: snapshot.total,
      disponivel: snapshot.disponivel,
      comprometidoPct: snapshot.comprometidoPct,
      disponivelPct: snapshot.disponivelPct,
      qtdDespesas: snapshot.qtdDespesas,
    },
    atualizadaEm: agoraISO(),
  };
}

export function serializar(sheet) {
  return JSON.stringify(montarDocumento(sheet), null, 2);
}

export function desserializar(texto) {
  let dado;
  try {
    dado = JSON.parse(texto);
  } catch {
    throw new Error('O arquivo não está em um formato válido.');
  }

  if (!dado || dado.format !== FORMATO || dado.type !== TIPO) {
    throw new Error('Esse arquivo não é uma planilha do HappyMoney.');
  }

  const agora = agoraISO();
  const sheet = {
    format: FORMATO,
    type: TIPO,
    version: Number(dado.version) || VERSAO,
    id: String(dado.id || novoId()),
    nome: String(dado.nome || 'Planilha sem nome').trim(),
    salarioBruto: dinheiro(dado.salarioBruto),
    moeda: String(dado.moeda || 'BRL'),
    despesas: Array.isArray(dado.despesas)
      ? dado.despesas.map((d) => ({
          id: String((d && d.id) || novoId()),
          nome: String((d && d.nome) || '').trim(),
          valor: dinheiro(d && d.valor),
          criadaEm: (d && d.criadaEm) || agora,
        }))
      : [],
    criadaEm: (dado && dado.criadaEm) || agora,
    atualizadaEm: (dado && dado.atualizadaEm) || agora,
  };
  return sheet;
}

export function nomeDoArquivo(nome) {
  const base = String(nome || 'Planilha')
    .trim()
    .replace(/[\\/:*?"<>|#%&{}$!@+'`=]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
  return base || 'Planilha';
}