import fs from 'node:fs';
import path from 'node:path';
import {
  montarDocumento,
  desserializar,
  nomeDoArquivo,
  criarPlanilha,
} from '../shared/skFormat.js';
import { calcular } from '../shared/finance.js';

export function criarArmazenamento(baseDir) {
  const dirPlanilhas = path.join(baseDir, 'Planilhas');
  const dirConfig = path.join(baseDir, 'Configuracoes');
  const arquivoConfig = path.join(dirConfig, 'config.json');

  function garantirDirs() {
    fs.mkdirSync(dirPlanilhas, { recursive: true });
    fs.mkdirSync(dirConfig, { recursive: true });
  }

  function caminhoUnico(base) {
    let alvo = path.join(dirPlanilhas, `${base}.sk`);
    let i = 2;
    while (fs.existsSync(alvo)) {
      alvo = path.join(dirPlanilhas, `${base}_${i}.sk`);
      i += 1;
    }
    return alvo;
  }

  function resumo(sheet, caminho) {
    const snapshot = calcular(sheet);
    return {
      id: sheet.id,
      nome: sheet.nome,
      salarioBruto: sheet.salarioBruto,
      qtdDespesas: snapshot.qtdDespesas,
      totalDespesas: snapshot.total,
      disponivel: snapshot.disponivel,
      situacao: snapshot.situacao,
      criadaEm: sheet.criadaEm,
      atualizadaEm: sheet.atualizadaEm,
      caminho,
    };
  }

  function listar() {
    garantirDirs();
    const arquivos = fs
      .readdirSync(dirPlanilhas)
      .filter((f) => f.toLowerCase().endsWith('.sk'));
    const planilhas = [];
    for (const arquivo of arquivos) {
      const caminho = path.join(dirPlanilhas, arquivo);
      try {
        const sheet = desserializar(fs.readFileSync(caminho, 'utf8'));
        planilhas.push(resumo(sheet, caminho));
      } catch {
        // arquivo corrompido ou incompatível: ignora silenciosamente
      }
    }
    planilhas.sort((a, b) =>
      String(b.atualizadaEm || '').localeCompare(String(a.atualizadaEm || ''))
    );
    return planilhas;
  }

  function ler(caminho) {
    if (!caminho) throw new Error('Caminho do arquivo não informado.');
    const texto = fs.readFileSync(caminho, 'utf8');
    const sheet = desserializar(texto);
    return { sheet, caminho };
  }

  function criar(dados) {
    garantirDirs();
    const sheet = criarPlanilha(dados);
    const caminho = caminhoUnico(nomeDoArquivo(sheet.nome));
    const documento = montarDocumento(sheet);
    fs.writeFileSync(caminho, JSON.stringify(documento, null, 2), 'utf8');
    return { sheet: documento, caminho };
  }

  function salvar({ sheet, caminho } = {}) {
    if (!sheet) throw new Error('Nenhuma planilha para salvar.');
    garantirDirs();
    const destino =
      caminho && fs.existsSync(path.dirname(caminho))
        ? caminho
        : caminhoUnico(nomeDoArquivo(sheet.nome));
    const documento = montarDocumento(sheet);
    fs.writeFileSync(destino, JSON.stringify(documento, null, 2), 'utf8');
    return { sheet: documento, caminho: destino };
  }

  function excluir(caminho) {
    if (!caminho) return;
    try {
      fs.unlinkSync(caminho);
    } catch {
      // arquivo já não existe
    }
  }

  function lerConfig() {
    garantirDirs();
    try {
      return JSON.parse(fs.readFileSync(arquivoConfig, 'utf8')) || {};
    } catch {
      return {};
    }
  }

  function salvarConfig(config) {
    garantirDirs();
    const dado = config || {};
    fs.writeFileSync(arquivoConfig, JSON.stringify(dado, null, 2), 'utf8');
    return dado;
  }

  garantirDirs();

  return {
    baseDir,
    dirPlanilhas,
    dirConfig,
    arquivoConfig,
    caminhoUnico,
    listar,
    ler,
    criar,
    salvar,
    excluir,
    lerConfig,
    salvarConfig,
  };
}