import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcular, round2, centavosDe, reaisDe } from '../shared/finance.js';

test('calcula total, disponível e quantidades', () => {
  const r = calcular({
    salarioBruto: 3000,
    despesas: [{ valor: 197 }, { valor: 22 }, { valor: 350 }],
  });
  assert.equal(r.total, 569);
  assert.equal(r.disponivel, 2431);
  assert.equal(r.qtdDespesas, 3);
  assert.equal(r.situacao, 'ok');
});

test('calcula percentuais com uma casa decimal', () => {
  const r = calcular({
    salarioBruto: 3000,
    despesas: [{ valor: 197 }, { valor: 22 }, { valor: 350 }],
  });
  assert.equal(r.comprometidoPct, 19);
  assert.equal(r.disponivelPct, 81);
});

test('despesas maiores que o salário geram situação negativa', () => {
  const r = calcular({
    salarioBruto: 500,
    despesas: [{ valor: 300 }, { valor: 400 }],
  });
  assert.equal(r.total, 700);
  assert.equal(r.disponivel, -200);
  assert.equal(r.situacao, 'negativo');
  assert.equal(r.comprometidoPct, 140);
  assert.equal(r.disponivelPct, 0);
});

test('sem despesas tudo fica disponível', () => {
  const r = calcular({ salarioBruto: 1000, despesas: [] });
  assert.equal(r.total, 0);
  assert.equal(r.disponivel, 1000);
  assert.equal(r.comprometidoPct, 0);
  assert.equal(r.disponivelPct, 100);
});

test('salário zero não causa divisão por zero', () => {
  const r = calcular({ salarioBruto: 0, despesas: [{ valor: 10 }] });
  assert.equal(r.comprometidoPct, 0);
  assert.equal(r.disponivelPct, 0);
  assert.equal(r.disponivel, -10);
});

test('valores com frações de centavo são arredondados', () => {
  const r = calcular({
    salarioBruto: 10,
    despesas: [{ valor: 0.1 }, { valor: 0.2 }],
  });
  assert.equal(r.total, 0.3);
  assert.equal(r.disponivel, 9.7);
});

test('helpers de conversão', () => {
  assert.equal(round2(1.005), 1.01);
  assert.equal(centavosDe(1.1), 110);
  assert.equal(centavosDe(0.1) + centavosDe(0.2), 30);
  assert.equal(reaisDe(243100), 2431);
});