const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
  'happyMoney',
  Object.freeze({
    listarPlanilhas: () => ipcRenderer.invoke('storage:listar'),
    lerPlanilha: (caminho) => ipcRenderer.invoke('storage:ler', caminho),
    criarPlanilha: (dados) => ipcRenderer.invoke('storage:criar', dados),
    salvarPlanilha: (dados) => ipcRenderer.invoke('storage:salvar', dados),
    excluirPlanilha: (caminho) => ipcRenderer.invoke('storage:excluir', caminho),
    lerConfig: () => ipcRenderer.invoke('config:ler'),
    salvarConfig: (config) => ipcRenderer.invoke('config:salvar', config),
    logoUrl: () => ipcRenderer.invoke('app:logoUrl'),
    diretorios: () => ipcRenderer.invoke('app:diretorios'),
    abrirPasta: (caminho) => ipcRenderer.invoke('app:abrirPasta', caminho),
    registrarAssociacao: () => ipcRenderer.invoke('associacao:registrar'),
    verificarAssociacao: () => ipcRenderer.invoke('associacao:verificar'),
    onAbrirArquivo: (callback) =>
      ipcRenderer.on('planilha:abrir', (_evento, caminho) => callback(caminho)),
    onNovaPlanilhaMenu: (callback) =>
      ipcRenderer.on('menu:nova-planilha', () => callback()),
    onSobreMenu: (callback) => ipcRenderer.on('menu:sobre', () => callback()),
  })
);