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
    // Finestra di dialogo per scegliere dove salvare il PDF
    const { canceled, filePath: savePath } = await dialog.showSaveDialog({
      title: 'Salva il PDF generato',
      defaultPath: path.join(app.getPath('documents'), 'output.pdf'), // Percorso di default
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }] // Filtra solo file PDF
    });

    if (canceled) {
      return; // Se l'utente annulla, termina la funzione
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Verifica il percorso assoluto del file HTML
    const fileUrl = `file://${filePath}`;
    console.log(`Sto cercando di caricare: ${fileUrl}`);

    // Carica il file HTML
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });

    // Applica CSS per evitare interruzioni di pagina
    await page.addStyleTag({
      content: `
        body {
          margin: 0;
        }
        * {
          page-break-before: auto;
          page-break-after: auto;
          page-break-inside: avoid; /* Evita le interruzioni di pagina all'interno degli elementi */
        }
      `
    });

    // Calcola l'altezza totale del contenuto della pagina
    const bodyHeight = await page.evaluate(() => {
      return document.body.scrollHeight; // Altezza totale del contenuto
    });

    // Converti l'altezza da pixel a millimetri (1 pixel = 0.264583 mm)
    const heightInMm = bodyHeight * 0.264583;

    // Genera il PDF con l'altezza calcolata
    await page.pdf({
      path: savePath,             // Usa il percorso scelto dall'utente
      width: '210mm',             // Larghezza A4 standard
      height: `${heightInMm}mm`,  // Altezza basata sul contenuto
      printBackground: true,      // Stampa lo sfondo per mantenere la formattazione
    });

    console.log(`Conversione completata! Il PDF è stato salvato in: ${savePath}`);

    await browser.close();

    // Ritorna il percorso del PDF generato al renderer
    return savePath;
  } catch (error) {
    console.error('Errore durante la conversione:', error);
    throw error;
  }
});
