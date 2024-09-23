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
      preload: path.join(__dirname, 'renderer.js'),
      contextIsolation: false,
      nodeIntegration: true,
    },
  });

  remoteMain.enable(win.webContents);

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('convert-html-to-pdf', async (event, filePath) => {
  try {
    // Estrai il nome del file senza estensione
    const defaultFileName = path.basename(filePath, path.extname(filePath)) + '.pdf';

    // Mostra la finestra di dialogo per il salvataggio del PDF
    const { canceled, filePath: savePath } = await dialog.showSaveDialog({
      title: 'Salva il PDF generato',
      defaultPath: path.join(app.getPath('documents'), defaultFileName), // Imposta il nome di default basato sul file di input
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (canceled) {
      return;  // Se l'utente ha annullato l'operazione, esci
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const fileUrl = `file://${filePath}`;

    await page.goto(fileUrl, { waitUntil: 'networkidle0' });

    // Imposta la dimensione della viewport per adattarsi al contenuto
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);

    // Genera il PDF con un'unica pagina
    await page.pdf({
      path: savePath,  // Usa il percorso scelto dall'utente
      printBackground: true,  // Stampa gli sfondi
      width: '794px',  // Larghezza fissa, cambia se necessario
      height: `${bodyHeight}px`,  // Altezza dinamica basata sul contenuto
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },  // Margini minimi
      preferCSSPageSize: false,  // Non utilizzare le dimensioni predefinite della pagina CSS
    });

    await browser.close();
    return savePath;  // Restituisci il percorso del file salvato
  } catch (error) {
    console.error('Errore durante la conversione:', error);
    throw error;
  }
});

