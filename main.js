import {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  shell,
} from 'electron';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { criarArmazenamento } from './storage.js';
import {
  registrarAssociacao,
  verificarAssociacao,
  EXTENSAO,
} from './fileAssociation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(__dirname, '..');

const isSmoke = process.argv.includes('--smoke');
if (isSmoke) {
  app.disableHardwareAcceleration();
}

app.setName('HappyMoney');

const baseDir = process.env.HAPPYMONEY_HOME
  ? path.resolve(process.env.HAPPYMONEY_HOME)
  : app.getPath('userData');
const armazenamento = criarArmazenamento(baseDir);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

let janela = null;
let urlInicial = null;

function caminhoLogo() {
  if (app.isPackaged) {
    const empacotada = path.join(process.resourcesPath, 'logo.png');
    if (fs.existsSync(empacotada)) return empacotada;
  }
  const noProjeto = path.join(RAIZ, 'logo.png');
  if (fs.existsSync(noProjeto)) return noProjeto;
  return null;
}

function iniciarServidorLocal() {
  const servidor = http.createServer((req, res) => {
    let url;
    try {
      url = new URL(req.url, 'http://127.0.0.1');
    } catch {
      res.writeHead(400).end();
      return;
    }
    const rel =
      decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'renderer/index.html';

    let alvo;
    let ehPermitido;
    if (rel === 'logo.png') {
      alvo = caminhoLogo();
      ehPermitido = !!alvo;
    } else {
      alvo = path.join(RAIZ, rel);
      ehPermitido =
        alvo.startsWith(path.join(RAIZ, 'renderer') + path.sep) ||
        alvo.startsWith(path.join(RAIZ, 'shared') + path.sep);
    }

    if (!ehPermitido || !alvo) {
      res.writeHead(403).end('Acesso negado');
      return;
    }

    let caminhoFinal = alvo;
    try {
      if (fs.statSync(caminhoFinal).isDirectory()) {
        caminhoFinal = path.join(caminhoFinal, 'index.html');
      }
    } catch {
      res.writeHead(404).end('Não encontrado');
      return;
    }

    if (!fs.existsSync(caminhoFinal)) {
      res.writeHead(404).end('Não encontrado');
      return;
    }

    const extensao = path.extname(caminhoFinal).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[extensao] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(caminhoFinal).pipe(res);
  });

  return new Promise((resolve, reject) => {
    servidor.once('error', reject);
    servidor.listen(0, '127.0.0.1', () => {
      const porta = servidor.address().port;
      urlInicial = 'http://127.0.0.1:' + porta + '/renderer/index.html';
      resolve({ servidor, porta });
    });
  });
}

function arquivoSkEm(argv) {
  return (
    argv
      .map((a) => String(a))
      .filter((a) => a.toLowerCase().endsWith(EXTENSAO) && fs.existsSync(a))
      .pop() || null
  );
}

function abrirArquivoExterno(caminho) {
  if (!caminho || !janela) return;
  if (janela.isMinimized()) janela.restore();
  janela.show();
  janela.focus();
  janela.webContents.send('planilha:abrir', caminho);
}

function criarJanela() {
  janela = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 940,
    minHeight: 640,
    show: false,
    title: 'HappyMoney',
    icon: caminhoLogo(),
    backgroundColor: '#2563eb',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });

  janela.loadURL(urlInicial);

  janela.once('ready-to-show', () => janela.show());
  janela.on('closed', () => {
    janela = null;
  });
  janela.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  janela.webContents.once('did-finish-load', () => {
    const inicial = arquivoSkEm(process.argv);
    if (inicial && !isSmoke) {
      setTimeout(() => abrirArquivoExterno(inicial), 350);
    }
  });

  return janela;
}

function registrarIpc() {
  ipcMain.handle('storage:listar', () => armazenamento.listar());
  ipcMain.handle('storage:ler', (_e, caminho) => armazenamento.ler(caminho));
  ipcMain.handle('storage:criar', (_e, dados) => armazenamento.criar(dados));
  ipcMain.handle('storage:salvar', (_e, dados) => armazenamento.salvar(dados));
  ipcMain.handle('storage:excluir', (_e, caminho) => {
    armazenamento.excluir(caminho);
    return true;
  });
  ipcMain.handle('config:ler', () => armazenamento.lerConfig());
  ipcMain.handle('config:salvar', (_e, config) =>
    armazenamento.salvarConfig(config)
  );
  ipcMain.handle('app:logoUrl', () => {
    if (!caminhoLogo()) return null;
    if (urlInicial) {
      const base = urlInicial.slice(0, urlInicial.indexOf('/renderer/'));
      return base + '/logo.png';
    }
    return pathToFileURL(caminhoLogo()).toString();
  });
  ipcMain.handle('app:diretorios', () => ({
    baseDir: armazenamento.baseDir,
    planilhas: armazenamento.dirPlanilhas,
    config: armazenamento.dirConfig,
  }));
  ipcMain.handle('app:abrirPasta', (_e, p) => {
    if (p) shell.openPath(p);
    return true;
  });
  ipcMain.handle('associacao:registrar', () => registrarAssociacao());
  ipcMain.handle('associacao:verificar', () => verificarAssociacao());
}

function montarMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: 'Arquivo',
      submenu: [
        {
          label: 'Nova planilha de economia',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (janela) janela.webContents.send('menu:nova-planilha');
          },
        },
        { type: 'separator' },
        { label: 'Sair', click: () => app.quit() },
      ],
    },
    {
      label: 'Exibir',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Abrir pasta de planilhas',
          click: () => shell.openPath(armazenamento.dirPlanilhas),
        },
        { type: 'separator' },
        {
          label: 'Sobre o HappyMoney',
          click: () => {
            if (janela) janela.webContents.send('menu:sobre');
          },
        },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);
}

async function rodarSmoke() {
  await new Promise((r) => setTimeout(r, 1500));
  const win = janela || BrowserWindow.getAllWindows()[0];
  if (!win) {
    console.error('[SMOKE] nenhuma janela criada');
    app.exit(1);
    return;
  }

  win.webContents.on('did-fail-load', (_e, codigo, descricao, url) =>
    console.log('[smoke] did-fail-load codigo=' + codigo + ' descricao=' + descricao + ' url=' + url)
  );
  win.webContents.on('preload-error', (_e, caminho, erro) =>
    console.log('[smoke] preload-error ' + caminho + ' -> ' + erro)
  );
  win.webContents.on('render-process-gone', (_e, detalhes) =>
    console.log('[smoke] render-process-gone ' + JSON.stringify(detalhes))
  );

  try {
    const diagnostico = await win.webContents.executeJavaScript(
      '(async () => { let scriptSrc = ""; const s = document.querySelector("script[type=module]"); if (s) scriptSrc = s.src; let htmlContemHm = null; try { htmlContemHm = (await fetch("index.html").then(r => r.text())).includes("hm://"); } catch (e) { htmlContemHm = "fetch-err"; } return JSON.stringify({ href: location.href, baseURI: document.baseURI, scriptSrc, htmlContemHm, title: document.title, ready: document.readyState, bodyLen: document.body ? document.body.innerHTML.length : -1, hasHappy: typeof window.happyMoney, telaLen: (document.getElementById("tela") || {}).innerHTML ? document.getElementById("tela").innerHTML.length : -1 }); })()'
    );
    console.log('[SMOKE] diag=' + diagnostico);
  } catch (err) {
    console.error('[SMOKE] executeJavaScript falhou (página não carregou?): ' + err);
  }

  try {
    let disponivel = false;
    for (let i = 0; i < 90; i += 1) {
      try {
        const tipo = await win.webContents.executeJavaScript(
          'typeof window.__smokeResult'
        );
        if (tipo === 'function') {
          disponivel = true;
          break;
        }
      } catch {
        // página ainda carregando ou splash ativa
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    if (!disponivel) {
      console.log('[SMOKE] __smokeResult não exposto no tempo limite');
      app.exit(1);
      return;
    }
    const resultado = await win.webContents.executeJavaScript(
      'window.__smokeResult()'
    );
    console.log('[SMOKE] result=' + JSON.stringify(resultado, null, 2));
    app.exit(resultado && resultado.ok ? 0 : 1);
  } catch (err) {
    console.error('[SMOKE] falhou: ' + (err && err.stack ? err.stack : err));
    app.exit(1);
  }
}

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    abrirArquivoExterno(arquivoSkEm(argv));
  });

  app.whenReady().then(async () => {
    try {
      const local = await iniciarServidorLocal();
      console.log('[HappyMoney] servidor local em http://127.0.0.1:' + local.porta);
    } catch (err) {
      console.error('[HappyMoney] não foi possível iniciar o servidor local: ' + err);
      app.quit();
      return;
    }

    registrarIpc();
    montarMenu();
    criarJanela();

    if (isSmoke) {
      if (janela) {
        const webContents = janela.webContents;
        webContents.on('console-message', (...args) => {
          try {
            const dados = args[1];
            const mensagem =
              dados && typeof dados === 'object' ? dados.message : args[2];
            if (mensagem) console.log('[smoke-console] ' + mensagem);
          } catch {
            // ignora mensagens sem formato esperado
          }
        });
      }
      rodarSmoke();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}