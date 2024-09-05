const { ipcRenderer } = require('electron');
const { dialog } = require('@electron/remote');

const selectButton = document.getElementById('btn-select');
const throbber = document.getElementById('throbber');

// Gestione del Click sul Pulsante
selectButton.addEventListener('click', async () => {
    try {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            filters: [{ name: 'HTML Files', extensions: ['html'] }],
            properties: ['openFile']
        });

        if (!canceled && filePaths.length > 0) {
            // Mostra il throbber per indicare il caricamento
            throbber.style.display = 'block';

            // Disabilita il pulsante per evitare altre interazioni
            selectButton.disabled = true;

            // Avvia la conversione
            await convertHtmlToPdf(filePaths[0]);

            // Nascondi il throbber al completamento
            throbber.style.display = 'none';

            // Riabilita il pulsante
            selectButton.disabled = false;
        }
    } catch (error) {
        console.error('Errore durante la selezione del file:', error);
        throbber.style.display = 'none'; // Nascondi il throbber in caso di errore
        selectButton.disabled = false; // Riabilita il pulsante in caso di errore
        alert('Errore durante la selezione del file.');
    }
});

// Funzione per Convertire HTML in PDF
async function convertHtmlToPdf(filePath) {
    try {
        const outputPdfPath = await ipcRenderer.invoke('convert-html-to-pdf', filePath);
        if (outputPdfPath) {
            alert(`Conversione completata! Il PDF è stato salvato in: ${outputPdfPath}`);
        } else {
            alert('Conversione annullata.');
        }
    } catch (error) {
        alert('Errore durante la conversione in PDF.');
    }
}
