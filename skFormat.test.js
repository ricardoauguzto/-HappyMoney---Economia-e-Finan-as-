import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  criarPlanilha,
  criarDespesa,
  serializar,
  desserializar,
  nomeDoArquivo,
  FORMATO,
  TIPO,
} from '../shared/skFormat.js';

test('cria planilha com estrutura esperada', () => {
  const sheet = criarPlanilha({ nome: 'Setembro 2026', salarioBruto: 3000 });
  assert.equal(sheet.format, FORMATO);
  assert.equal(sheet.type, TIPO);
  assert.equal(sheet.nome, 'Setembro 2026');
  assert.equal(sheet.salarioBruto, 3000);
  assert.equal(sheet.moeda, 'BRL');
  assert.deepEqual(sheet.despesas, []);
  assert.ok(sheet.id);
});

test('cria despesa com valor normalizado', () => {
  const d = criarDespesa({ nome: 'Faculdade', valor: 197 });
  assert.equal(d.nome, 'Faculdade');
  assert.equal(d.valor, 197);
});

test('roundtrip de serialização preserva os dados', () => {
  const sheet = criarPlanilha({ nome: 'Outubro 2026', salarioBruto: 4500 });
  sheet.despesas = [
    criarDespesa({ nome: 'Aluguel', valor: 1200 }),
    criarDespesa({ nome: 'Internet', valor: 99.9 }),
  ];
  const lida = desserializar(serializar(sheet));
  assert.equal(lida.nome, sheet.nome);
  assert.equal(lida.salarioBruto, sheet.salarioBruto);
  assert.equal(lida.despesas.length, 2);
  assert.equal(lida.despesas[0].nome, 'Aluguel');
  assert.equal(lida.despesas[1].valor, 99.9);
  assert.equal(lida.id, sheet.id);
});

test('serialização grava snapshot de resumo', () => {
  const sheet = criarPlanilha({ nome: 'Novembro 2026', salarioBruto: 3000 });
  sheet.despesas = [criarDespesa({ nome: 'Faculdade', valor: 197 })];
  const documento = JSON.parse(serializar(sheet));
  assert.equal(documento.resumo.total, 197);
  assert.equal(documento.resumo.disponivel, 2803);
});

test('rejeita arquivos que não são do HappyMoney', () => {
  assert.throws(() => desserializar('{}'), /não é uma planilha/);
  assert.throws(() => desserializar('texto aleatório'), /formato válido/);
  assert.throws(() => desserializar('{"format":"Outro"}'), /não é uma planilha/);
});

test('arquivo incompleto é recuperado com valores seguros', () => {
  const lida = desserializar(
    JSON.stringify({ format: FORMATO, type: TIPO, nome: 'Só nome' })
  );
  assert.equal(lida.nome, 'Só nome');
  assert.equal(lida.salarioBruto, 0);
  assert.deepEqual(lida.despesas, []);
});

test('nome do arquivo sanitiza caracteres inválidos do Windows', () => {
  assert.equal(nomeDoArquivo('Setembro 2026'), 'Setembro_2026');
  assert.equal(nomeDoArquivo('A/B:C*D?"E<F>G|'), 'A_B_C_D_E_F_G');
  assert.equal(nomeDoArquivo('Relatório/2026'), 'Relatório_2026');
  assert.equal(nomeDoArquivo('/   /'), 'Planilha');
  assert.equal(nomeDoArquivo(''), 'Planilha');
});