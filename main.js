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
      defaultPath: path.join(app.getPath('documents'), defaultFileName),
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (canceled) {
      return;  // Se l'utente ha annullato l'operazione, esci
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const fileUrl = `file://${filePath}`;

    await page.goto(fileUrl, { waitUntil: 'networkidle0' });


    // Imposta la larghezza della viewport
    await page.setViewport({
      width: 794,
      height: 600,
    });

    // Calcola le dimensioni effettive del contenuto
    const dimensions = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;

      const width = Math.max(
        body.scrollWidth, body.offsetWidth,
        html.clientWidth, html.scrollWidth, html.offsetWidth
      );

      const height = Math.max(
        body.scrollHeight, body.offsetHeight,
        html.clientHeight, html.scrollHeight, html.offsetHeight
      );

      return { width, height };
    });

    console.log('Dimensioni del contenuto:', dimensions);

    // Imposta la viewport all'altezza del contenuto
    await page.setViewport({
      width: dimensions.width,
      height: dimensions.height,
    });

    // Genera il PDF utilizzando l'opzione 'clip'
    await page.pdf({
      path: savePath,
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm',
      },
      width: `${dimensions.width}px`,
      height: `${dimensions.height}px`,
      pageRanges: '1',
      preferCSSPageSize: false,
      clip: {
        x: 0,
        y: 0,
        width: dimensions.width,
        height: dimensions.height,
      },
    });

    await browser.close();
    return savePath;  // Restituisci il percorso del file salvato
  } catch (error) {
    console.error('Errore durante la conversione:', error);
    throw error;
  }
});
