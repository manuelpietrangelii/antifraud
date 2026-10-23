require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Google Sheets Setup ──────────────────────────────────────────────────────
// Le credenziali vengono lette dalle variabili d'ambiente (Render)
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

async function getAuthClient() {
  // Supporta sia JSON completo (per Render) sia file locale
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth.getClient();
}

async function appendToSheet(rowData) {
  const authClient = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  // Aggiunge una riga al foglio "Submissions" (o Sheet1 se non esiste)
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Sheet1!A:H',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        [
          new Date().toLocaleString('it-IT'),
          rowData.nome,
          rowData.cognome,
          rowData.iban,
          rowData.telefono,
          rowData.dataRegistrazione,
          rowData.codiceDocente,
        ],
      ],
    },
  });
}

// ── API Route ────────────────────────────────────────────────────────────────
app.post('/api/submit', async (req, res) => {
  const { nome, cognome, iban, telefono, dataRegistrazione, codiceDocente } = req.body;

  // Validazione server-side
  if (!nome || !cognome || !iban || !telefono || !dataRegistrazione || !codiceDocente) {
    return res.status(400).json({ success: false, message: 'Tutti i campi sono obbligatori.' });
  }

  try {
    await appendToSheet({ nome, cognome, iban, telefono, dataRegistrazione, codiceDocente });
    return res.json({ success: true, message: 'Dati salvati correttamente.' });
  } catch (err) {
    console.error('Errore Google Sheets:', err.message);
    return res.status(500).json({ success: false, message: 'Errore durante il salvataggio.' });
  }
});

// ── Fallback SPA ─────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Antifraud Verify in ascolto su http://localhost:${PORT}`);
});
