import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR_SCRIPT = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(DIR_SCRIPT, '..');

const MODULOS = [
  'shared/finance.js',
  'shared/skFormat.js',
  'renderer/js/icons.js',
  'renderer/js/money.js',
  'renderer/js/ui.js',
  'renderer/js/api.js',
  'renderer/js/screens/formularios.js',
  'renderer/js/screens/dashboard.js',
  'renderer/js/screens/spreadsheet.js',
  'renderer/js/screens/settings.js',
  'renderer/js/app.js',
];

function chaveDe(arquivoRelativo) {
  return path
    .basename(String(arquivoRelativo).replace(/['"]/g, ''))
    .replace(/\.js$/, '');
}

function transformar(rel) {
  const fonte = fs.readFileSync(path.join(RAIZ, rel), 'utf8');
  const exportadas = [];

  const linhas = fonte.split('\n').map((linha) => {
    const mImport = linha.match(
      /^import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]\s*;\s*$/
    );
    if (mImport) {
      const chave = chaveDe(mImport[2]);
      const nomes = mImport[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return 'const { ' + nomes.join(', ') + ' } = win.HM["' + chave + '"];';
    }

    const mFuncao = linha.match(/^export\s+(?:async\s+)?function\s+(\w+)/);
    if (mFuncao) {
      exportadas.push(mFuncao[1]);
      return linha.replace(/^export\s+/, '');
    }

    const mConst = linha.match(/^export\s+const\s+(\w+)/);
    if (mConst) {
      exportadas.push(mConst[1]);
      return linha.replace(/^export\s+/, '');
    }

    const mExport = linha.match(/^export\s*\{([^}]*)\}\s*;\s*$/);
    if (mExport) {
      exportadas.push(
        ...mExport[1]
          .split(',')
          .map((s) => s.trim().split(/\s+as\s+/)[0])
          .filter(Boolean)
      );
      return '';
    }

    return linha;
  });

  const chave = chaveDe(rel);
  const unicos = [...new Set(exportadas)];
  const registro =
    'win.HM["' +
    chave +
    '"] = { ' +
    unicos.map((n) => n + ': ' + n).join(', ') +
    ' };';

  return (
    '/* ===== ' +
    rel +
    ' ===== */\n' +
    '(function (win) {\n' +
    '"use strict";\n' +
    linhas.join('\n') +
    '\n' +
    registro +
    '\n})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : {}));\n'
  );
}

function gerar() {
  const cabecalho =
    '/* HappyMoney — bundle gerado por scripts/gerarBundle.js. ' +
    'Nao edite manualmente. */\n' +
    '(function (win) { if (!win.HM) win.HM = {}; })(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : {}));\n\n';

  const corpo = MODULOS.map(transformar).join('\n\n');

  const destino = path.join(RAIZ, 'renderer', 'js', 'bundle.js');
  fs.writeFileSync(destino, cabecalho + corpo, 'utf8');
  console.log('bundle gerado -> ' + destino + ' (' + corpo.length + ' bytes)');
}

gerar();