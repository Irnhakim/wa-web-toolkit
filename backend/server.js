const express = require('express');
const cors = require('cors');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const { 
  makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason,
  proto 
} = require('@whiskeysockets/baileys');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// WhatsApp connection state
let sock = null;
let isConnected = false;
let latestQR = null;

// Initialize Baileys Connection
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // We will print it manually using qrcode-terminal
    logger: pino({ level: 'silent' }),
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n--- SILAKAN SCAN QR CODE DI BAWAH INI MENGGUNAKAN WHATSAPP ---');
      qrcode.generate(qr, { small: true });
      console.log('-------------------------------------------------------------\n');
      isConnected = false;
      latestQR = qr;
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Koneksi terputus karena:', lastDisconnect.error, '. Menghubungkan kembali:', shouldReconnect);
      isConnected = false;
      latestQR = null;
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('WhatsApp Bot berhasil terhubung! ✅');
      isConnected = true;
      latestQR = null;
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

// Helper to format JID
function formatJid(number) {
  let clean = number.replace(/[^0-9]/g, '');
  if (clean.includes('@')) return clean;
  // Personal account format is [number]@s.whatsapp.net
  return `${clean}@s.whatsapp.net`;
}

// Convert URL or base64 to Buffer helper
function getThumbnailBuffer(thumbStr) {
  if (!thumbStr) return undefined;
  try {
    if (thumbStr.startsWith('data:image')) {
      const base64Data = thumbStr.replace(/^data:image\/[a-z]+;base64,/, "");
      return Buffer.from(base64Data, 'base64');
    }
    return undefined; // If it's a URL, externalAdReply handles thumbnailUrl
  } catch (err) {
    console.error('Gagal memproses buffer thumbnail:', err);
    return undefined;
  }
}

// API Endpoints
app.get('/api/status', (req, res) => {
  res.json({ connected: isConnected, qr: latestQR });
});

// 1. Send Buttons API
app.post('/api/send-buttons', async (req, res) => {
  if (!isConnected) {
    return res.status(500).json({ success: false, message: 'WhatsApp Bot belum terhubung.' });
  }

  try {
    const { recipient, text, title, footer, buttons } = req.body;
    const jid = formatJid(recipient);

    console.log(`[Backend] Mengirim button message ke ${jid}`);

    // Standard buttons (Quick replies) vs Template buttons (URL/Phone)
    const isTemplate = buttons.some(b => b.type === 'url' || b.type === 'phone');

    if (isTemplate) {
      // Send template buttons
      const templateButtons = buttons.map((btn, index) => {
        if (btn.type === 'url') {
          return {
            index: index + 1,
            urlButton: { displayText: btn.text, url: btn.value }
          };
        } else if (btn.type === 'phone') {
          return {
            index: index + 1,
            callButton: { displayText: btn.text, phoneNumber: btn.value }
          };
        } else {
          return {
            index: index + 1,
            quickReplyButton: { displayText: btn.text, id: btn.id || `btn_${index}` }
          };
        }
      });

      await sock.sendMessage(jid, {
        text: text,
        footer: footer || undefined,
        templateButtons: templateButtons
      });
    } else {
      // Send interactive reply buttons
      const formattedButtons = buttons.map((btn, index) => ({
        buttonId: btn.id || `btn_${index}`,
        buttonText: { displayText: btn.text },
        type: 1 // 1 is response button
      }));

      await sock.sendMessage(jid, {
        text: text,
        footer: footer || undefined,
        buttons: formattedButtons,
        headerType: 1
      });
    }

    res.json({ success: true, message: 'Button message berhasil dikirim!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Send Custom Link Preview API (via externalAdReply)
app.post('/api/send-preview', async (req, res) => {
  if (!isConnected) {
    return res.status(500).json({ success: false, message: 'WhatsApp Bot belum terhubung.' });
  }

  try {
    const { recipient, text, url, title, description, siteName, thumbnail } = req.body;
    const jid = formatJid(recipient);

    console.log(`[Backend] Mengirim link preview ke ${jid}`);

    const isBase64 = thumbnail && thumbnail.startsWith('data:image');
    const thumbBuffer = isBase64 ? getThumbnailBuffer(thumbnail) : undefined;
    const thumbUrl = !isBase64 && thumbnail ? thumbnail : undefined;

    await sock.sendMessage(jid, {
      text: `${text}\n\n${url}`,
      contextInfo: {
        externalAdReply: {
          title: title || undefined,
          body: description || undefined,
          mediaType: 1, // 1 = image
          thumbnailUrl: thumbUrl || undefined,
          thumbnail: thumbBuffer || undefined,
          sourceUrl: url,
          mediaUrl: url,
          renderLargerThumbnail: true, // premium look!
          showAdAttribution: false
        }
      }
    });

    res.json({ success: true, message: 'Link preview berhasil dikirim!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Send Carousel API (fallback to multiple high-fidelity cards)
app.post('/api/send-carousel', async (req, res) => {
  if (!isConnected) {
    return res.status(500).json({ success: false, message: 'WhatsApp Bot belum terhubung.' });
  }

  try {
    const { recipient, cards } = req.body;
    const jid = formatJid(recipient);

    console.log(`[Backend] Mengirim carousel cards ke ${jid}`);

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const isBase64 = card.thumbnail && card.thumbnail.startsWith('data:image');
      const thumbBuffer = isBase64 ? getThumbnailBuffer(card.thumbnail) : undefined;
      const thumbUrl = !isBase64 && card.thumbnail ? card.thumbnail : undefined;

      const cardText = `*${card.title}*\n${card.description}`;
      const payload = {
        text: card.url ? `${cardText}\n\n${card.url}` : cardText
      };

      // Add custom externalAdReply card structure
      payload.contextInfo = {
        externalAdReply: {
          title: card.title,
          body: card.description,
          mediaType: 1,
          thumbnailUrl: thumbUrl || undefined,
          thumbnail: thumbBuffer || undefined,
          sourceUrl: card.url || '',
          renderLargerThumbnail: true
        }
      };

      // Add buttons if card has buttons
      if (card.buttons && card.buttons.length > 0) {
        const isTemplate = card.buttons.some(b => b.type === 'url' || b.type === 'phone');
        if (isTemplate) {
          payload.templateButtons = card.buttons.map((btn, index) => {
            if (btn.type === 'url') {
              return { index: index + 1, urlButton: { displayText: btn.text, url: btn.value } };
            } else {
              return { index: index + 1, callButton: { displayText: btn.text, phoneNumber: btn.value } };
            }
          });
        } else {
          payload.buttons = card.buttons.map((btn, index) => ({
            buttonId: `card_${i}_btn_${index}`,
            buttonText: { displayText: btn.text },
            type: 1
          }));
          payload.headerType = 1;
        }
      }

      await sock.sendMessage(jid, payload);
      // Wait 1 second between card deliveries to preserve order
      await new Promise(resolve => setTimeout(resolve, 1200));
    }

    res.json({ success: true, message: 'Carousel message berhasil dikirim!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Send Contact Card API
app.post('/api/send-contact', async (req, res) => {
  if (!isConnected) {
    return res.status(500).json({ success: false, message: 'WhatsApp Bot belum terhubung.' });
  }

  try {
    const { recipient, name, org, phone } = req.body;
    const jid = formatJid(recipient);

    console.log(`[Backend] Mengirim kartu kontak ke ${jid}`);

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const vcard = 'BEGIN:VCARD\n'
                + 'VERSION:3.0\n'
                + `FN:${name}\n`
                + (org ? `ORG:${org};\n` : '')
                + `TEL;type=CELL;type=VOICE;waid=${cleanPhone}:+${cleanPhone}\n`
                + 'END:VCARD';

    await sock.sendMessage(jid, {
      contacts: {
        displayName: name,
        contacts: [{ vcard }]
      }
    });

    res.json({ success: true, message: 'Kartu kontak berhasil dikirim!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. Send Location API
app.post('/api/send-location', async (req, res) => {
  if (!isConnected) {
    return res.status(500).json({ success: false, message: 'WhatsApp Bot belum terhubung.' });
  }

  try {
    const { recipient, name, address, latitude, longitude } = req.body;
    const jid = formatJid(recipient);

    console.log(`[Backend] Mengirim lokasi kustom ke ${jid}`);

    await sock.sendMessage(jid, {
      location: {
        degreesLatitude: latitude,
        degreesLongitude: longitude,
        name: name,
        address: address || undefined
      }
    });

    res.json({ success: true, message: 'Lokasi berhasil dikirim!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. Send List Message API
app.post('/api/send-list', async (req, res) => {
  if (!isConnected) {
    return res.status(500).json({ success: false, message: 'WhatsApp Bot belum terhubung.' });
  }

  try {
    const { recipient, title, text, footer, buttonText, options } = req.body;
    const jid = formatJid(recipient);

    console.log(`[Backend] Mengirim list menu ke ${jid}`);

    const rows = options.map((opt, idx) => ({
      title: opt.title,
      rowId: `list_opt_${idx}`,
      description: opt.description || undefined
    }));

    const listMessage = {
      title: title || undefined,
      text: text,
      footer: footer || undefined,
      buttonText: buttonText,
      sections: [
        {
          title: 'Pilihan Menu',
          rows: rows
        }
      ]
    };

    await sock.sendMessage(jid, listMessage);

    res.json({ success: true, message: 'List menu berhasil dikirim!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`\n=============================================================`);
  console.log(`Backend Server WA Web Toolkit berjalan di http://localhost:${PORT}`);
  console.log(`=============================================================\n`);
  connectToWhatsApp();
});
