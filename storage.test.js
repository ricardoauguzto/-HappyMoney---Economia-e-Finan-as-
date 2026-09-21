import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { criarArmazenamento } from '../main/storage.js';

let baseDir;
let store;

beforeEach(() => {
  baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hm-storage-'));
  store = criarArmazenamento(baseDir);
});

afterEach(() => {
  fs.rmSync(baseDir, { recursive: true, force: true });
});

test('cria pastas em boas práticas do Windows', () => {
  assert.ok(fs.existsSync(path.join(baseDir, 'Planilhas')));
  assert.ok(fs.existsSync(path.join(baseDir, 'Configuracoes')));
});

test('cria, lista, lê e exclui planilhas', () => {
  const criada = store.criar({ nome: 'Setembro 2026', salarioBruto: 3000 });
  assert.ok(criada.caminho.endsWith('Setembro_2026.sk'));
  assert.ok(fs.existsSync(criada.caminho));

  const lista = store.listar();
  assert.equal(lista.length, 1);
  assert.equal(lista[0].nome, 'Setembro 2026');
  assert.equal(lista[0].salarioBruto, 3000);

  const lida = store.ler(criada.caminho);
  assert.equal(lida.sheet.id, criada.sheet.id);

  store.excluir(criada.caminho);
  assert.equal(store.listar().length, 0);
});

test('nomes repetidos geram arquivos únicos', () => {
  const a = store.criar({ nome: 'Mes 2026', salarioBruto: 1000 });
  const b = store.criar({ nome: 'Mes 2026', salarioBruto: 2000 });
  assert.notEqual(a.caminho, b.caminho);
  assert.ok(fs.existsSync(a.caminho));
  assert.ok(fs.existsSync(b.caminho));
});

test('salvar persiste despesas e atualiza snapshot', () => {
  const criada = store.criar({ nome: 'Teste', salarioBruto: 3000 });
  criada.sheet.despesas = [
    { id: 'd1', nome: 'Faculdade', valor: 197 },
    { id: 'd2', nome: 'Netflix', valor: 22 },
  ];
  const salva = store.salvar({ sheet: criada.sheet, caminho: criada.caminho });
  assert.equal(salva.sheet.resumo.total, 219);
  assert.equal(salva.sheet.resumo.disponivel, 2781);

  const lida = store.ler(criada.caminho);
  assert.equal(lida.sheet.despesas.length, 2);
  assert.equal(lida.sheet.despesas[0].valor, 197);
});

test('arquivo corrompido é ignorado na listagem', () => {
  const criada = store.criar({ nome: 'Bom', salarioBruto: 1000 });
  fs.writeFileSync(path.join(baseDir, 'Planilhas', 'Quebrado.sk'), 'não é json');
  const lista = store.listar();
  assert.equal(lista.length, 1);
  assert.equal(lista[0].id, criada.sheet.id);
});

test('config é persistida', () => {
  store.salvarConfig({ teste: 1 });
  const lida = store.lerConfig();
  assert.equal(lida.teste, 1);
});