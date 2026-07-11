const express = require('express');
const cors = require('cors');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const { 
  makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason,
  fetchLatestBaileysVersion,
  generateWAMessageFromContent,
  makeCacheableSignalKeyStore,
  proto 
} = require('@whiskeysockets/baileys');
const NodeCache = require('@cacheable/node-cache');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// WhatsApp connection state
let sock = null;
let isConnected = false;
let latestQR = null;

// Function to delete the auth folder on logout
function clearAuthDir() {
  const authDir = path.join(__dirname, 'auth_info');
  if (fs.existsSync(authDir)) {
    try {
      fs.rmSync(authDir, { recursive: true, force: true });
      console.log('Folder auth_info berhasil dihapus karena logout/de-otorisasi.');
    } catch (e) {
      console.error('Gagal menghapus folder auth_info:', e.message);
    }
  }
}

// Optimization: Periodically clean up old prekeys and unsynced state files to prevent disk bloat
function runPeriodicCleanup() {
  const authDir = path.join(__dirname, 'auth_info');
  if (!fs.existsSync(authDir)) return;

  try {
    const files = fs.readdirSync(authDir);
    let count = 0;
    const now = Date.now();
    // Prekeys, sessions, and other dynamic data older than 6 hours can be purged
    const maxAgeMs = 6 * 60 * 60 * 1000; 

    files.forEach(file => {
      // Keep essential credentials!
      if (file === 'creds.json') return;

      const filePath = path.join(authDir, file);
      const stat = fs.statSync(filePath);
      
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        count++;
      }
    });
    if (count > 0) {
      console.log(`[Cleanup] Berhasil membersihkan ${count} file auth_info usang.`);
    }
  } catch (e) {
    console.error('Cleanup auth_info error:', e.message);
  }
}

// Run cleanup every 1 hour
setInterval(runPeriodicCleanup, 60 * 60 * 1000);

// Initialize Baileys Connection
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`Menggunakan versi WhatsApp Web: ${version.join('.')}, Terkini: ${isLatest}`);

  const msgRetryCounterCache = new NodeCache();

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    syncFullHistory: false,
    shouldSyncHistoryMessage: () => false,
    msgRetryCounterCache,
    markOnlineOnConnect: false
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
      const statusCode = lastDisconnect.error?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
      console.log(`Koneksi terputus (Status: ${statusCode || 'unknown'}).`);
      
      isConnected = false;
      latestQR = null;

      if (isLoggedOut) {
        console.log('User logout atau sesi de-otorisasi (401). Menghapus kredensial lama dan membuat QR baru...');
        clearAuthDir();
        setTimeout(connectToWhatsApp, 1500);
      } else {
        console.log('Terjadi kesalahan jaringan/koneksi lainnya. Mencoba menghubungkan kembali...');
        setTimeout(connectToWhatsApp, 3000);
      }
    } else if (connection === 'open') {
      console.log('WhatsApp Bot berhasil terhubung! ✅');
      isConnected = true;
      latestQR = null;
      // Run a quick cleanup immediately on connection success
      runPeriodicCleanup();
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

// Helper to format or resolve JID
async function formatJid(recipient) {
  if (recipient.includes('@')) return recipient;
  
  // If it's purely numbers
  const clean = recipient.replace(/[^0-9]/g, '');
  if (clean && clean.length >= 9) {
    return `${clean}@s.whatsapp.net`;
  }
  
  // Try searching in cached contacts
  console.log(`[formatJid] Mencari kontak untuk nama: ${recipient}`);
  const contacts = Object.values(sock.contacts || {});
  const match = contacts.find(c => 
    (c.name && c.name.toLowerCase() === recipient.toLowerCase()) || 
    (c.verifiedName && c.verifiedName.toLowerCase() === recipient.toLowerCase())
  );
  if (match) {
    console.log(`[formatJid] Ditemukan JID: ${match.id} untuk nama ${recipient}`);
    return match.id;
  }
  
  // Try searching in participating groups
  try {
    console.log(`[formatJid] Mencari di daftar grup untuk: ${recipient}`);
    const groups = await sock.groupFetchAllParticipating();
    const groupMatch = Object.values(groups).find(g => 
      g.subject && g.subject.toLowerCase() === recipient.toLowerCase()
    );
    if (groupMatch) {
      console.log(`[formatJid] Ditemukan JID Grup: ${groupMatch.id} untuk nama ${recipient}`);
      return groupMatch.id;
    }
  } catch (err) {
    console.error('Gagal mencari di daftar grup:', err);
  }
  
  throw new Error(`Tujuan "${recipient}" tidak ditemukan. Silakan gunakan nomor HP manual.`);
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
  }
}
// Small 1x1 transparent PNG base64 placeholder (to satisfy WhatsApp thumbnail validation locally without network redirects)
const PLACEHOLDER_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const placeholderBuffer = Buffer.from(PLACEHOLDER_PNG_BASE64, 'base64');

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
    const jid = await formatJid(recipient);

    console.log(`[Backend] Mengirim interactive button message ke ${jid}`);

    const formattedButtons = buttons.map((btn, index) => {
      if (btn.type === 'url') {
        return {
          name: 'cta_url',
          buttonParamsJson: JSON.stringify({
            display_text: btn.text,
            url: btn.value,
            merchant_url: btn.value
          })
        };
      } else if (btn.type === 'phone') {
        return {
          name: 'cta_call',
          buttonParamsJson: JSON.stringify({
            display_text: btn.text,
            id: btn.value
          })
        };
      } else {
        return {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: btn.text,
            id: btn.id || `btn_${index}`
          })
        };
      }
    });

    const message = generateWAMessageFromContent(jid, {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2
          },
          interactiveMessage: proto.Message.InteractiveMessage.create({
            body: proto.Message.InteractiveMessage.Body.create({ text: text }),
            footer: footer ? proto.Message.InteractiveMessage.Footer.create({ text: footer }) : undefined,
            header: title ? proto.Message.InteractiveMessage.Header.create({ title: title, hasMediaAttachment: false }) : undefined,
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
              buttons: formattedButtons
            })
          })
        }
      }
    }, {});

    const nativeFlows = [];
    const hasUrl = buttons.some(b => b.type === 'url');
    const hasPhone = buttons.some(b => b.type === 'phone');
    const hasReply = buttons.some(b => b.type === 'quick_reply' || !b.type);

    if (hasUrl) nativeFlows.push({ tag: 'native_flow', attrs: { name: 'cta_url' } });
    if (hasPhone) nativeFlows.push({ tag: 'native_flow', attrs: { name: 'cta_call' } });
    if (hasReply || nativeFlows.length === 0) nativeFlows.push({ tag: 'native_flow', attrs: { name: 'quick_reply' } });

    await sock.relayMessage(jid, message.message, { 
      messageId: message.key.id,
      additionalNodes: [
        {
          tag: 'biz',
          attrs: {},
          content: [
            {
              tag: 'interactive',
              attrs: { type: 'native_flow', v: '1' },
              content: nativeFlows
            }
          ]
        }
      ]
    });

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
    const jid = await formatJid(recipient);

    console.log(`[Backend] Mengirim link preview ke ${jid}`);

    const isBase64 = thumbnail && thumbnail.startsWith('data:image');
    const thumbBuffer = isBase64 ? getThumbnailBuffer(thumbnail) : undefined;
    const thumbUrl = !isBase64 && thumbnail ? thumbnail : undefined;

    let formattedUrl = url ? url.trim() : '';
    if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const adReply = {
      title: title || 'Tautan',
      body: description || formattedUrl,
      mediaType: 1, // 1 = Image
      sourceUrl: formattedUrl,
      renderLargerThumbnail: true,
      showAdAttribution: false
    };

    if (thumbUrl) {
      adReply.thumbnailUrl = thumbUrl;
    } else if (thumbBuffer) {
      adReply.thumbnail = thumbBuffer;
    } else {
      // Fallback local transparent image buffer (100% reliable, no internet required, no redirects)
      adReply.thumbnail = placeholderBuffer;
    }

    await sock.sendMessage(jid, {
      text: `${text}\n\n${formattedUrl}`,
      contextInfo: {
        externalAdReply: adReply
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
    const jid = await formatJid(recipient);

    console.log(`[Backend] Mengirim carousel cards ke ${jid}`);

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const isBase64 = card.thumbnail && card.thumbnail.startsWith('data:image');
      const thumbBuffer = isBase64 ? getThumbnailBuffer(card.thumbnail) : undefined;
      const thumbUrl = !isBase64 && card.thumbnail ? card.thumbnail : undefined;

      const cardText = `*${card.title}*\n${card.description || ''}`;
      const cardBody = card.url ? `${cardText}\n\n${card.url}` : cardText;

      const adReply = {
        title: card.title,
        body: card.description || '',
        mediaType: 1,
        sourceUrl: card.url || 'https://wa.me',
        renderLargerThumbnail: true,
        showAdAttribution: false
      };

      if (thumbUrl) {
        adReply.thumbnailUrl = thumbUrl;
      } else if (thumbBuffer) {
        adReply.thumbnail = thumbBuffer;
      } else {
        adReply.thumbnail = placeholderBuffer;
      }

      await sock.sendMessage(jid, {
        text: cardBody,
        contextInfo: { externalAdReply: adReply }
      });

      // Wait between card deliveries to preserve order
      if (i < cards.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
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
    const jid = await formatJid(recipient);

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
    const jid = await formatJid(recipient);

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
    const jid = await formatJid(recipient);

    console.log(`[Backend] Mengirim list menu ke ${jid}`);

    // Build native flow single_select payload (Baileys v7 interactiveMessage approach)
    const singleSelectRows = options.map((opt, idx) => ({
      id: `list_opt_${idx}`,
      title: opt.title,
      description: opt.description || ''
    }));

    const listPayload = JSON.stringify({
      title: title || 'Pilihan Menu',
      sections: [
        {
          title: 'Pilihan Menu',
          highlight_label: '',
          rows: singleSelectRows
        }
      ]
    });

    const interactiveMsg = proto.Message.InteractiveMessage.create({
      body: proto.Message.InteractiveMessage.Body.create({ text: text }),
      footer: footer ? proto.Message.InteractiveMessage.Footer.create({ text: footer }) : undefined,
      header: title ? proto.Message.InteractiveMessage.Header.create({ title: title, hasMediaAttachment: false }) : undefined,
      nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
        buttons: [
          {
            name: 'single_select',
            buttonParamsJson: listPayload
          }
        ]
      })
    });

    const message = generateWAMessageFromContent(jid, {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2
          },
          interactiveMessage: interactiveMsg
        }
      }
    }, {});

    await sock.relayMessage(jid, message.message, {
      messageId: message.key.id,
      additionalNodes: [
        {
          tag: 'biz',
          attrs: {},
          content: [
            {
              tag: 'interactive',
              attrs: { type: 'native_flow', v: '1' },
              content: [{ tag: 'native_flow', attrs: { name: 'single_select' } }]
            }
          ]
        }
      ]
    });

    res.json({ success: true, message: 'List menu berhasil dikirim!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. Get Groups API
app.get('/api/groups', async (req, res) => {
  if (!isConnected) {
    return res.status(500).json({ success: false, message: 'WhatsApp Bot belum terhubung.' });
  }

  try {
    console.log('[Backend] Mengambil daftar grup WhatsApp...');
    const groups = await sock.groupFetchAllParticipating();
    const groupList = Object.values(groups).map(g => ({
      id: g.id,
      subject: g.subject
    }));

    groupList.sort((a, b) => (a.subject || '').localeCompare(b.subject || ''));

    res.json({ success: true, groups: groupList });
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
