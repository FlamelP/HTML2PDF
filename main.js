const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const puppeteer = require('puppeteer');
const remoteMain = require('@electron/remote/main');

// Inizializza @electron/remote
remoteMain.initialize();

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'), // Preload script per il renderer
      contextIsolation: false,  // Permette l'uso di Node.js nel renderer
      nodeIntegration: true,    // Necessario per ipcRenderer e altre funzionalità
    },
  });

  // Abilita il modulo remoto
  remoteMain.enable(win.webContents);

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Gestisce la richiesta di generazione del PDF dal renderer
ipcMain.handle('convert-html-to-pdf', async (event, filePath) => {
  try {
    const { canceled, filePath: savePath } = await dialog.showSaveDialog({
      title: 'Salva il PDF generato',
      defaultPath: path.join(app.getPath('documents'), 'output.pdf'),
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (canceled) {
      return;
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const fileUrl = `file://${filePath}`;

    await page.goto(fileUrl, { waitUntil: 'networkidle0' });

    // Calcola l'altezza totale del contenuto
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    const heightInMm = bodyHeight * 0.264583;

    // Genera il PDF con l'altezza totale calcolata
    await page.pdf({
      path: savePath,
      width: '210mm',
      height: `${heightInMm}mm`, // Usa altezza dinamica
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
    });

    await browser.close();
    return savePath;
  } catch (error) {
    console.error('Errore durante la conversione:', error);
    throw error;
  }
});
