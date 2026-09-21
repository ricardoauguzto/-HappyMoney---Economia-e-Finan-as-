import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { app } from 'electron';

const EXTENSAO = '.sk';
const CLASSE = 'HappyMoney.Sheet';
const DESCRICAO = 'Planilha HappyMoney';

function comandoDeAbertura() {
  const exe = process.execPath;
  const chamadaApp =
    app.isPackaged
      ? `"${exe}"`
      : `"${exe}" "${path.resolve(app.getAppPath())}"`;
  return `${chamadaApp} "%1"`;
}

export function registrarAssociacao() {
  const cmd = comandoDeAbertura();
  const passos = [
    ['add', 'HKCU\\Software\\Classes\\.sk', '/ve', '/d', CLASSE, '/f'],
    [
      'add',
      `HKCU\\Software\\Classes\\${CLASSE}`,
      '/ve',
      '/d',
      DESCRICAO,
      '/f',
    ],
    [
      'add',
      `HKCU\\Software\\Classes\\${CLASSE}\\DefaultIcon`,
      '/ve',
      '/d',
      `"${process.execPath}",0`,
      '/f',
    ],
    [
      'add',
      `HKCU\\Software\\Classes\\${CLASSE}\\shell\\open\\command`,
      '/ve',
      '/d',
      cmd,
      '/f',
    ],
  ];

  const erros = [];
  for (const args of passos) {
    const r = spawnSync('reg.exe', args, { encoding: 'utf8', windowsHide: true });
    if (r.status !== 0) {
      erros.push((r.stderr || r.stdout || '').trim());
    }
  }

  spawnSync('ie4uinit.exe', ['-show'], { windowsHide: true });

  return { ok: erros.length === 0, erros, comando: cmd, extensao: EXTENSAO };
}

export function verificarAssociacao() {
  const rClasse = spawnSync(
    'reg.exe',
    ['query', 'HKCU\\Software\\Classes\\.sk', '/ve'],
    { encoding: 'utf8', windowsHide: true }
  );
  const rComando = spawnSync(
    'reg.exe',
    ['query', `HKCU\\Software\\Classes\\${CLASSE}\\shell\\open\\command`, '/ve'],
    { encoding: 'utf8', windowsHide: true }
  );
  const saida = rClasse.stdout || '';
  return {
    associada: rClasse.status === 0 && rComando.status === 0 && saida.includes(CLASSE),
  };
}

export { EXTENSAO };