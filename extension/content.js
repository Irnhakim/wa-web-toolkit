// content.js - WA Web Toolkit (Frontend Only via Baileys Server)
console.log('[WA Web Toolkit] Content script loaded (Baileys client mode).');

let BACKEND_URL = 'http://localhost:3000';

// Inject page-context script to read window.Store.Chat.getActive()
const injectStoreListener = () => {
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      let lastJid = null;
      setInterval(() => {
        try {
          if (window.Store && window.Store.Chat && window.Store.Chat.getActive) {
            const activeChat = window.Store.Chat.getActive();
            if (activeChat) {
              const jid = activeChat.id._serialized || activeChat.id;
              if (jid !== lastJid) {
                lastJid = jid;
                window.postMessage({
                  type: 'WAT_ACTIVE_CHAT',
                  jid: jid,
                  name: activeChat.name || activeChat.formattedTitle || 'Chat'
                }, '*');
              }
            }
          }
        } catch (e) {}
      }, 1000);
    })();
  `;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
};
injectStoreListener();

// Active chat detection state
let activeChatJidOrName = null;
let activeChatDisplayName = 'Chat';

// Listen to messages from injected script
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'WAT_ACTIVE_CHAT') {
    const { jid, name } = event.data;
    activeChatJidOrName = jid;
    activeChatDisplayName = name;
    updateActiveChatInfo();
  }
});

// 1. Inject Stylesheet
const linkEl = document.createElement('link');
linkEl.rel = 'stylesheet';
linkEl.href = chrome.runtime.getURL('ui.css');
document.head.appendChild(linkEl);

// 2. Build UI Elements
const sidebarHTML = `
  <div class="wat-header">
    <h2>WA Web Toolkit (Baileys)</h2>
    <button class="wat-close-btn" id="wat-close-btn">&times;</button>
  </div>
  
  <!-- CONNECTION VIEW -->
  <div id="wat-connection-view" style="padding: 20px; display: flex; flex-direction: column; gap: 15px;">
    <div style="font-size: 14px; font-weight: 600; text-align: center; color: #00b4db; text-transform: uppercase; letter-spacing: 0.5px;">Koneksi Server Bot</div>
    <div id="wat-connection-status-info" style="font-size: 13px; text-align: center; color: #ff5252; padding: 10px; background: rgba(255, 82, 82, 0.08); border-radius: 6px; border: 1px solid rgba(255, 82, 82, 0.15);">
      Belum terhubung ke server backend ❌
    </div>
    
    <div class="wat-form-group">
      <label>URL Server Backend</label>
      <input type="text" id="wat-backend-url-input" class="wat-input" placeholder="http://localhost:3000" value="http://localhost:3000">
    </div>
    <button id="wat-connect-server-btn" class="wat-btn wat-btn-primary">Hubungkan Server</button>

    <!-- QR Code Render Container -->
    <div id="wat-qr-container" style="display: none; margin-top: 15px; text-align: center; padding: 15px; background: rgba(0,0,0,0.25); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
      <div style="font-size: 12px; color: #8696a0; margin-bottom: 12px; font-weight: 500; letter-spacing: 0.5px;">PINDAI QR UNTUK LOGIN WHATSAPP</div>
      <div style="display: flex; justify-content: center;">
        <div id="wat-qr-image-container" style="display: inline-block; background: white; padding: 10px; border-radius: 6px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);"></div>
      </div>
      <div style="font-size: 11px; color: #00b4db; margin-top: 12px; font-weight: 600; line-height: 1.4;">
        Buka WhatsApp -> Perangkat Tertaut -> Tautkan Perangkat
      </div>
    </div>
  </div>

  <!-- MAIN TOOLKIT VIEW (Hidden until connected) -->
  <div id="wat-main-view" style="display: none; flex-direction: column; flex: 1; overflow: hidden;">
    <div class="wat-tabs" style="display: flex; flex-wrap: wrap;">
      <button class="wat-tab-btn active" data-tab="tab-buttons" style="flex: 1 1 30%;">Buttons</button>
      <button class="wat-tab-btn" data-tab="tab-preview" style="flex: 1 1 30%;">Preview</button>
      <button class="wat-tab-btn" data-tab="tab-carousel" style="flex: 1 1 30%;">Carousel</button>
      <button class="wat-tab-btn" data-tab="tab-contact-loc" style="flex: 1 1 45%; font-size: 11px;">Contact/Loc</button>
      <button class="wat-tab-btn" data-tab="tab-list" style="flex: 1 1 45%; font-size: 11px;">List Menu</button>
    </div>

    <div class="wat-body">
      <!-- Status / Notification -->
      <div class="wat-status" id="wat-status-box"></div>

      <!-- Recipient Section -->
      <div class="wat-form-group">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
          <label style="margin-bottom: 0;">Nomor/JID Tujuan</label>
          <label style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #00b4db; cursor: pointer; margin-bottom: 0; font-weight: 500;">
            <input type="checkbox" id="wat-use-active-chat" checked style="cursor: pointer; accent-color: #00b4db;"> Chat Aktif WA Web
          </label>
        </div>
        <input type="text" id="wat-recipient-jid" class="wat-input" placeholder="Contoh: 628123456789" style="display: none;">
        <div id="wat-active-chat-indicator" style="font-size: 13px; font-weight: 600; padding: 8px 10px; background: rgba(0, 180, 219, 0.08); border: 1px solid rgba(0, 180, 219, 0.15); border-radius: 6px; color: #00b4db; text-align: center;">
          Mendeteksi chat aktif... 🔍
        </div>
        <div style="font-size: 11px; color: #8696a0; margin-top: 4px;" id="wat-recipient-tip">Mengirim otomatis ke kontak/grup yang sedang Anda buka di WhatsApp Web.</div>
      </div>

      <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.05); margin: 15px 0;" />

      <!-- TAB 1: BUTTONS -->
      <div id="tab-buttons" class="wat-tab-content active">
        <div class="wat-form-group">
          <label>Pesan Utama (Text)</label>
          <textarea id="wat-btn-text" class="wat-textarea" placeholder="Tulis isi pesan Anda di sini..."></textarea>
        </div>
        <div class="wat-form-group">
          <label>Judul Pesan (Title - Opsional)</label>
          <input type="text" id="wat-btn-title" class="wat-input" placeholder="Header pesan">
        </div>
        <div class="wat-form-group">
          <label>Kaki Pesan (Footer - Opsional)</label>
          <input type="text" id="wat-btn-footer" class="wat-input" placeholder="Footer pesan">
        </div>
        
        <div class="wat-form-group">
          <label>Tambah Tombol (Maksimal 3)</label>
          <div class="wat-button-list" id="wat-btn-list-container">
            <!-- Dynamically added button list -->
          </div>
          <div style="display: flex; gap: 5px;">
            <select id="wat-new-btn-type" class="wat-select" style="flex: 1;">
              <option value="quick_reply">Quick Reply (Balas)</option>
              <option value="url">Link URL</option>
              <option value="phone">Panggilan Telepon</option>
            </select>
          </div>
          <div style="display: flex; gap: 5px; margin-top: 5px;">
            <input type="text" id="wat-new-btn-text" class="wat-input" placeholder="Teks Tombol" style="flex: 1;">
            <input type="text" id="wat-new-btn-val" class="wat-input" placeholder="URL / No. Telp" style="flex: 1; display: none;">
          </div>
          <button type="button" id="wat-add-btn-trigger" class="wat-btn wat-btn-secondary" style="margin-top: 8px;">Tambah Tombol</button>
        </div>

        <button id="wat-send-buttons" class="wat-btn wat-btn-primary" style="margin-top: 10px;">Kirim Button Message</button>
      </div>

      <!-- TAB 2: LINK PREVIEW -->
      <div id="tab-preview" class="wat-tab-content">
        <div class="wat-form-group">
          <label>Pesan Utama / Keterangan</label>
          <textarea id="wat-lp-text" class="wat-textarea" placeholder="Tulis isi pesan pengantar..."></textarea>
        </div>
        <div class="wat-form-group">
          <label>Tautan (URL)</label>
          <input type="text" id="wat-lp-url" class="wat-input" placeholder="https://example.com">
        </div>
        <div class="wat-form-group">
          <label>Judul Kustom (Custom Title)</label>
          <input type="text" id="wat-lp-title" class="wat-input" placeholder="Judul Tautan Kustom">
        </div>
        <div class="wat-form-group">
          <label>Deskripsi Kustom (Custom Description)</label>
          <textarea id="wat-lp-desc" class="wat-textarea" placeholder="Deskripsi ringkas halaman..."></textarea>
        </div>
        <div class="wat-form-group">
          <label>Nama Situs (Site Name - Opsional)</label>
          <input type="text" id="wat-lp-sitename" class="wat-input" placeholder="Contoh: Tokopedia, YouTube, MyWebsite">
        </div>
        <div class="wat-form-group">
          <label>Gambar Pratinjau (Thumbnail Base64 / URL)</label>
          <input type="text" id="wat-lp-thumb" class="wat-input" placeholder="URL Gambar atau Base64 JPEG data">
          <div style="margin-top: 5px; font-size: 11px; color: #8696a0;">Gunakan URL gambar publik atau konversi gambar ke data:image/jpeg;base64</div>
        </div>
        <button id="wat-send-preview" class="wat-btn wat-btn-primary" style="margin-top: 10px;">Kirim Link Preview</button>
      </div>

      <!-- TAB 3: CAROUSEL -->
      <div id="tab-carousel" class="wat-tab-content">
        <div class="wat-form-group">
          <label>Kartu Karosel (Carousel Cards)</label>
          <div id="wat-carousel-cards-container" class="wat-card-builder">
            <!-- Dynamically added carousel cards -->
          </div>
          
          <div style="background: rgba(255,255,255,0.02); padding: 10px; border-radius: 6px; border: 1px dashed rgba(255,255,255,0.1);">
            <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px; color: #00b4db;">Buat Kartu Baru</div>
            <div class="wat-form-group">
              <input type="text" id="wat-card-new-title" class="wat-input" placeholder="Judul Kartu">
            </div>
            <div class="wat-form-group">
              <textarea id="wat-card-new-desc" class="wat-textarea" placeholder="Deskripsi Kartu"></textarea>
            </div>
            <div class="wat-form-group">
              <input type="text" id="wat-card-new-url" class="wat-input" placeholder="Tautan URL Kartu">
            </div>
            <div class="wat-form-group">
              <input type="text" id="wat-card-new-thumb" class="wat-input" placeholder="URL Gambar / Base64 Kartu">
            </div>
            
            <div style="font-size: 11px; color: #8696a0; margin: 10px 0 3px 0; text-transform: uppercase;">Tombol Kartu 1 (Opsional)</div>
            <div style="display: flex; gap: 4px; margin-bottom: 8px;">
              <select id="wat-card-btn1-type" class="wat-select" style="width: 30%;">
                <option value="quick_reply">Reply</option>
                <option value="url">URL</option>
              </select>
              <input type="text" id="wat-card-btn1-text" class="wat-input" placeholder="Teks" style="width: 35%;">
              <input type="text" id="wat-card-btn1-val" class="wat-input" placeholder="URL" style="width: 35%;">
            </div>

            <div style="font-size: 11px; color: #8696a0; margin: 5px 0 3px 0; text-transform: uppercase;">Tombol Kartu 2 (Opsional)</div>
            <div style="display: flex; gap: 4px; margin-bottom: 10px;">
              <select id="wat-card-btn2-type" class="wat-select" style="width: 30%;">
                <option value="quick_reply">Reply</option>
                <option value="url">URL</option>
              </select>
              <input type="text" id="wat-card-btn2-text" class="wat-input" placeholder="Teks" style="width: 35%;">
              <input type="text" id="wat-card-btn2-val" class="wat-input" placeholder="URL" style="width: 35%;">
            </div>

            <button type="button" id="wat-add-card-trigger" class="wat-btn wat-btn-secondary">Tambah Kartu</button>
          </div>
        </div>
        
        <button id="wat-send-carousel" class="wat-btn wat-btn-primary" style="margin-top: 10px;">Kirim Carousel Message</button>
      </div>

      <!-- TAB 4: CONTACT & LOCATION -->
      <div id="tab-contact-loc" class="wat-tab-content">
        <div style="font-size: 13px; font-weight: 600; margin-bottom: 10px; color: #00b4db; text-transform: uppercase;">Kirim Kartu Kontak (VCard)</div>
        <div class="wat-form-group">
          <label>Nama Kontak</label>
          <input type="text" id="wat-con-name" class="wat-input" placeholder="Nama Lengkap Kontak">
        </div>
        <div class="wat-form-group">
          <label>Organisasi / Perusahaan (Opsional)</label>
          <input type="text" id="wat-con-org" class="wat-input" placeholder="Nama Perusahaan">
        </div>
        <div class="wat-form-group">
          <label>Nomor Telepon Kontak</label>
          <input type="text" id="wat-con-phone" class="wat-input" placeholder="Contoh: 628123456789">
        </div>
        <button id="wat-send-contact" class="wat-btn wat-btn-primary" style="margin-bottom: 25px;">Kirim Kartu Kontak</button>

        <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.05); margin: 20px 0;" />

        <div style="font-size: 13px; font-weight: 600; margin-bottom: 10px; color: #00b4db; text-transform: uppercase;">Kirim Lokasi Kustom</div>
        <div class="wat-form-group">
          <label>Nama Tempat / Lokasi</label>
          <input type="text" id="wat-loc-name" class="wat-input" placeholder="Contoh: Mall Grand Indonesia">
        </div>
        <div class="wat-form-group">
          <label>Alamat Detail</label>
          <textarea id="wat-loc-address" class="wat-textarea" placeholder="Detail Alamat Lengkap..."></textarea>
        </div>
        <div style="display: flex; gap: 8px;">
          <div class="wat-form-group" style="flex: 1;">
            <label>Latitude</label>
            <input type="text" id="wat-loc-lat" class="wat-input" placeholder="-6.200000">
          </div>
          <div class="wat-form-group" style="flex: 1;">
            <label>Longitude</label>
            <input type="text" id="wat-loc-lng" class="wat-input" placeholder="106.816666">
          </div>
        </div>
        <button id="wat-send-location" class="wat-btn wat-btn-primary">Kirim Lokasi</button>
      </div>

      <!-- TAB 5: LIST MENU -->
      <div id="tab-list" class="wat-tab-content">
        <div class="wat-form-group">
          <label>Judul List Menu (Title - Opsional)</label>
          <input type="text" id="wat-list-title" class="wat-input" placeholder="Header Menu Utama">
        </div>
        <div class="wat-form-group">
          <label>Pesan Utama (Text)</label>
          <textarea id="wat-list-text" class="wat-textarea" placeholder="Silakan pilih opsi yang tersedia..."></textarea>
        </div>
        <div class="wat-form-group">
          <label>Kaki List (Footer - Opsional)</label>
          <input type="text" id="wat-list-footer" class="wat-input" placeholder="Footer teks kecil">
        </div>
        <div class="wat-form-group">
          <label>Teks Tombol Pembuka Menu</label>
          <input type="text" id="wat-list-btn-text" class="wat-input" placeholder="Klik Untuk Memilih Opsi">
        </div>

        <div class="wat-form-group">
          <label>Opsi Pilihan (Maksimal 10)</label>
          <div id="wat-list-options-container" class="wat-button-list" style="max-height: 150px; overflow-y: auto;">
            <!-- Dynamically added list options -->
          </div>
          <div style="background: rgba(255,255,255,0.02); padding: 8px; border-radius: 6px; border: 1px dashed rgba(255,255,255,0.1);">
            <div class="wat-form-group" style="margin-bottom: 8px;">
              <input type="text" id="wat-new-option-title" class="wat-input" placeholder="Judul Pilihan (Contoh: Bantuan)">
            </div>
            <div class="wat-form-group" style="margin-bottom: 8px;">
              <input type="text" id="wat-new-option-desc" class="wat-input" placeholder="Deskripsi Singkat (Opsional)">
            </div>
            <button type="button" id="wat-add-option-trigger" class="wat-btn wat-btn-secondary">Tambah Opsi Baru</button>
          </div>
        </div>

        <button id="wat-send-list" class="wat-btn wat-btn-primary" style="margin-top: 10px;">Kirim List Message</button>
      </div>
    </div>
  </div>
`;

// Create elements
const toggleBtn = document.createElement('button');
toggleBtn.id = 'wat-toggle-btn';
toggleBtn.innerHTML = '⚡';
document.body.appendChild(toggleBtn);

const sidebar = document.createElement('div');
sidebar.id = 'wat-sidebar';
sidebar.innerHTML = sidebarHTML;
document.body.appendChild(sidebar);

// Get view elements
const connectionView = document.getElementById('wat-connection-view');
const mainView = document.getElementById('wat-main-view');
const connectionInfo = document.getElementById('wat-connection-status-info');
const backendUrlInput = document.getElementById('wat-backend-url-input');
const connectServerBtn = document.getElementById('wat-connect-server-btn');
const qrContainer = document.getElementById('wat-qr-container');
const qrImageContainer = document.getElementById('wat-qr-image-container');
let currentQRString = null;

// Load saved backend URL
chrome.storage.local.get(['backendUrl'], (result) => {
  if (result.backendUrl) {
    BACKEND_URL = result.backendUrl;
    backendUrlInput.value = BACKEND_URL;
  }
});

// Connect to Server trigger
connectServerBtn.addEventListener('click', () => {
  const url = backendUrlInput.value.trim();
  if (!url) return;
  
  BACKEND_URL = url;
  chrome.storage.local.set({ backendUrl: BACKEND_URL });
  
  connectionInfo.innerText = 'Menghubungkan ke server... ⏳';
  connectionInfo.style.color = '#ff9800';
  connectionInfo.style.background = 'rgba(255, 152, 0, 0.08)';
  connectionInfo.style.borderColor = 'rgba(255, 152, 0, 0.15)';
  
  checkBackendStatus();
});

// 3. Toggle Sidebar & Status Polling
let statusInterval = null;

toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  if (sidebar.classList.contains('open')) {
    checkBackendStatus();
    statusInterval = setInterval(checkBackendStatus, 3000); // Poll every 3 seconds for fast QR rendering
    updateActiveChatInfo();
  } else {
    clearInterval(statusInterval);
  }
});

document.getElementById('wat-close-btn').addEventListener('click', () => {
  sidebar.classList.remove('open');
  clearInterval(statusInterval);
});

function updateActiveChatInfo() {
  const activeChatIndicator = document.getElementById('wat-active-chat-indicator');
  const useActiveChat = document.getElementById('wat-use-active-chat').checked;
  
  if (!useActiveChat || !activeChatIndicator) return;

  // Fallback DOM scraper if window.Store is not yet initialized or ready
  let scrapedName = null;
  const header = document.querySelector('#main header');
  if (header) {
    const nameEl = header.querySelector('span[dir="auto"]');
    if (nameEl) {
      scrapedName = nameEl.innerText.trim();
    }
  }

  if (!activeChatJidOrName && !scrapedName) {
    activeChatIndicator.innerText = 'Buka salah satu chat terlebih dahulu ⚠️';
    activeChatIndicator.style.color = '#ff9800';
    activeChatIndicator.style.borderColor = 'rgba(255, 152, 0, 0.2)';
    activeChatIndicator.style.background = 'rgba(255, 152, 0, 0.05)';
    return;
  }
  
  const targetName = activeChatJidOrName ? activeChatDisplayName : scrapedName;
  const targetId = activeChatJidOrName || scrapedName;
  
  if (!activeChatJidOrName && scrapedName) {
    activeChatJidOrName = scrapedName;
    activeChatDisplayName = scrapedName;
  }
  
  let displayJid = targetId.includes('@') ? targetId.split('@')[0] : 'Nama';
  activeChatIndicator.innerText = `Aktif: ${targetName} (${displayJid})`;
  activeChatIndicator.style.color = '#00e676';
  activeChatIndicator.style.borderColor = 'rgba(0, 230, 118, 0.2)';
  activeChatIndicator.style.background = 'rgba(0, 230, 118, 0.05)';
}

// Active chat toggle listener
document.getElementById('wat-use-active-chat').addEventListener('change', (e) => {
  const input = document.getElementById('wat-recipient-jid');
  const indicator = document.getElementById('wat-active-chat-indicator');
  const tip = document.getElementById('wat-recipient-tip');
  
  if (e.target.checked) {
    input.style.display = 'none';
    indicator.style.display = 'block';
    tip.innerText = 'Mengirim otomatis ke kontak/grup yang sedang Anda buka di WhatsApp Web.';
    updateActiveChatInfo();
  } else {
    input.style.display = 'block';
    indicator.style.display = 'none';
    tip.innerText = 'Gunakan kode negara tanpa tanda + (contoh: 628... untuk Indonesia).';
  }
});

// 4. Backend Connection & QR Polling
async function checkBackendStatus() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/status`);
    const data = await res.json();
    
    if (data.connected) {
      // Backend is online and WhatsApp is fully connected!
      connectionView.style.display = 'none';
      mainView.style.display = 'flex';
      qrContainer.style.display = 'none';
      updateActiveChatInfo(); // Update active chat name/JID in UI
    } else {
      // Backend is online but WhatsApp is NOT connected (requires QR Scan)
      connectionView.style.display = 'flex';
      mainView.style.display = 'none';
      
      connectionInfo.innerText = 'Server Aktif. Scan QR Code di bawah untuk login WhatsApp ⚠️';
      connectionInfo.style.color = '#ff9800';
      connectionInfo.style.background = 'rgba(255, 152, 0, 0.08)';
      connectionInfo.style.borderColor = 'rgba(255, 152, 0, 0.15)';
      
      if (data.qr) {
        qrContainer.style.display = 'block';
        if (data.qr !== currentQRString) {
          currentQRString = data.qr;
          qrImageContainer.innerHTML = '';
          new QRCode(qrImageContainer, {
            text: data.qr,
            width: 180,
            height: 180,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
          });
        }
      } else {
        qrContainer.style.display = 'none';
        currentQRString = null;
        connectionInfo.innerText = 'Server Aktif. Menunggu QR Code dari Baileys... ⏳';
      }
    }
  } catch (err) {
    // Backend is offline
    connectionView.style.display = 'flex';
    mainView.style.display = 'none';
    qrContainer.style.display = 'none';
    
    connectionInfo.innerText = 'Server Offline. Jalankan Node.js Backend lokal Anda ❌';
    connectionInfo.style.color = '#ff5252';
    connectionInfo.style.background = 'rgba(255, 82, 82, 0.08)';
    connectionInfo.style.borderColor = 'rgba(255, 82, 82, 0.15)';
  }
}

// 5. Tabs Navigation
const tabButtons = document.querySelectorAll('.wat-tab-btn');
const tabContents = document.querySelectorAll('.wat-tab-content');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.getAttribute('data-tab');
    tabButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(tabId).classList.add('active');
  });
});

// Form Recipient Helper
function getRecipient() {
  const useActiveChat = document.getElementById('wat-use-active-chat').checked;
  if (useActiveChat) {
    if (!activeChatJidOrName) {
      throw new Error('Tidak ada chat aktif terdeteksi. Silakan buka salah satu chat terlebih dahulu atau pilih input manual.');
    }
    return activeChatJidOrName;
  }

  let jid = document.getElementById('wat-recipient-jid').value.trim();
  if (!jid) {
    throw new Error('Silakan masukkan nomor tujuan.');
  }
  jid = jid.replace(/[^0-9]/g, '');
  if (jid.startsWith('0')) {
    jid = '62' + jid.substring(1);
  }
  return jid;
}

// Form Button Toggle
const newBtnTypeSelect = document.getElementById('wat-new-btn-type');
const newBtnValInput = document.getElementById('wat-new-btn-val');

newBtnTypeSelect.addEventListener('change', (e) => {
  if (e.target.value === 'quick_reply') {
    newBtnValInput.style.display = 'none';
  } else {
    newBtnValInput.style.display = 'block';
    newBtnValInput.placeholder = e.target.value === 'url' ? 'https://example.com' : 'Nomor HP: +6281234...';
  }
});

// 6. Data Builders & Renderers
let messageButtons = []; // max 3
let carouselCards = []; // max 5
let listOptions = []; // max 10

function renderButtonsList() {
  const container = document.getElementById('wat-btn-list-container');
  container.innerHTML = '';
  if (messageButtons.length === 0) {
    container.innerHTML = '<div style="font-size: 12px; color: #8696a0; text-align: center;">Belum ada tombol ditambahkan.</div>';
    return;
  }

  messageButtons.forEach((btn, index) => {
    const item = document.createElement('div');
    item.className = 'wat-button-item';
    let badge = '';
    if (btn.type === 'url') badge = '🔗 ';
    if (btn.type === 'phone') badge = '📞 ';
    if (btn.type === 'quick_reply') badge = '💬 ';

    item.innerHTML = `
      <span>${badge}<strong>${btn.text}</strong> ${btn.value ? `(${btn.value})` : ''}</span>
      <button class="wat-remove-btn" data-index="${index}">&times;</button>
    `;
    item.querySelector('.wat-remove-btn').addEventListener('click', () => {
      messageButtons.splice(index, 1);
      renderButtonsList();
    });
    container.appendChild(item);
  });
}

function renderCardsList() {
  const container = document.getElementById('wat-carousel-cards-container');
  container.innerHTML = '';
  if (carouselCards.length === 0) {
    container.innerHTML = '<div style="font-size: 12px; color: #8696a0; text-align: center;">Belum ada kartu ditambahkan.</div>';
    return;
  }

  carouselCards.forEach((card, index) => {
    const item = document.createElement('div');
    item.className = 'wat-card-item';
    item.innerHTML = `
      <div class="wat-card-header-info">
        <span>Kartu ${index + 1}: ${card.title}</span>
        <button class="wat-remove-btn" data-index="${index}">&times;</button>
      </div>
      <div style="font-size: 11px; color: #8696a0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${card.description}
      </div>
    `;
    item.querySelector('.wat-remove-btn').addEventListener('click', () => {
      carouselCards.splice(index, 1);
      renderCardsList();
    });
    container.appendChild(item);
  });
}

function renderListOptionsList() {
  const container = document.getElementById('wat-list-options-container');
  container.innerHTML = '';
  if (listOptions.length === 0) {
    container.innerHTML = '<div style="font-size: 12px; color: #8696a0; text-align: center;">Belum ada opsi ditambahkan.</div>';
    return;
  }

  listOptions.forEach((opt, index) => {
    const item = document.createElement('div');
    item.className = 'wat-button-item';
    item.innerHTML = `
      <span>🔘 <strong>${opt.title}</strong> ${opt.description ? ` - ${opt.description}` : ''}</span>
      <button class="wat-remove-btn" data-index="${index}">&times;</button>
    `;
    item.querySelector('.wat-remove-btn').addEventListener('click', () => {
      listOptions.splice(index, 1);
      renderListOptionsList();
    });
    container.appendChild(item);
  });
}

// Add Item Triggers
document.getElementById('wat-add-btn-trigger').addEventListener('click', () => {
  if (messageButtons.length >= 3) {
    showStatus('error', 'Maksimal hanya bisa menambahkan 3 tombol.');
    return;
  }

  const text = document.getElementById('wat-new-btn-text').value.trim();
  const type = newBtnTypeSelect.value;
  const val = newBtnValInput.value.trim();

  if (!text) {
    showStatus('error', 'Teks tombol tidak boleh kosong.');
    return;
  }

  if (type !== 'quick_reply' && !val) {
    showStatus('error', 'Nilai tombol (URL / No HP) tidak boleh kosong.');
    return;
  }

  // Validate mixing of button types (WhatsApp API limitation)
  if (messageButtons.length > 0) {
    const hasQuickReply = messageButtons.some(b => b.type === 'quick_reply');
    const hasCTA = messageButtons.some(b => b.type === 'url' || b.type === 'phone');
    const currentIsQuickReply = (type === 'quick_reply');

    if ((currentIsQuickReply && hasCTA) || (!currentIsQuickReply && hasQuickReply)) {
      showStatus('error', 'Batasan WhatsApp: Tidak bisa mencampur tombol Balas (Quick Reply) dengan tombol Tautan/Telepon (CTA) dalam satu pesan.');
      return;
    }
  }

  messageButtons.push({ type, text, value: val });
  document.getElementById('wat-new-btn-text').value = '';
  newBtnValInput.value = '';
  renderButtonsList();
});

document.getElementById('wat-add-card-trigger').addEventListener('click', () => {
  if (carouselCards.length >= 5) {
    showStatus('error', 'Maksimal hanya bisa menambahkan 5 kartu karosel.');
    return;
  }

  const title = document.getElementById('wat-card-new-title').value.trim();
  const desc = document.getElementById('wat-card-new-desc').value.trim();
  const url = document.getElementById('wat-card-new-url').value.trim();
  const thumb = document.getElementById('wat-card-new-thumb').value.trim();

  if (!title || !desc) {
    showStatus('error', 'Judul dan Deskripsi kartu tidak boleh kosong.');
    return;
  }

  const buttons = [];
  const btn1Text = document.getElementById('wat-card-btn1-text').value.trim();
  const btn1Type = document.getElementById('wat-card-btn1-type').value;
  const btn1Val = document.getElementById('wat-card-btn1-val').value.trim();
  if (btn1Text) {
    buttons.push({ type: btn1Type, text: btn1Text, value: btn1Val });
  }

  const btn2Text = document.getElementById('wat-card-btn2-text').value.trim();
  const btn2Type = document.getElementById('wat-card-btn2-type').value;
  const btn2Val = document.getElementById('wat-card-btn2-val').value.trim();
  if (btn2Text) {
    buttons.push({ type: btn2Type, text: btn2Text, value: btn2Val });
  }

  carouselCards.push({
    title,
    description: desc,
    url: url || undefined,
    thumbnail: thumb || undefined,
    buttons: buttons.length > 0 ? buttons : undefined
  });

  // Reset inputs
  document.getElementById('wat-card-new-title').value = '';
  document.getElementById('wat-card-new-desc').value = '';
  document.getElementById('wat-card-new-url').value = '';
  document.getElementById('wat-card-new-thumb').value = '';
  document.getElementById('wat-card-btn1-text').value = '';
  document.getElementById('wat-card-btn1-val').value = '';
  document.getElementById('wat-card-btn2-text').value = '';
  document.getElementById('wat-card-btn2-val').value = '';
  
  renderCardsList();
});

document.getElementById('wat-add-option-trigger').addEventListener('click', () => {
  if (listOptions.length >= 10) {
    showStatus('error', 'Maksimal hanya bisa menambahkan 10 pilihan menu.');
    return;
  }

  const title = document.getElementById('wat-new-option-title').value.trim();
  const desc = document.getElementById('wat-new-option-desc').value.trim();

  if (!title) {
    showStatus('error', 'Judul pilihan menu tidak boleh kosong.');
    return;
  }

  listOptions.push({ title, description: desc || undefined });
  document.getElementById('wat-new-option-title').value = '';
  document.getElementById('wat-new-option-desc').value = '';
  renderListOptionsList();
});

// UI Status Box Helper
function showStatus(type, message) {
  const box = document.getElementById('wat-status-box');
  box.className = `wat-status ${type}`;
  box.innerText = message;
  box.style.display = 'block';
  
  setTimeout(() => {
    if (box.className.includes(type) && box.innerText === message) {
      box.style.display = 'none';
    }
  }, 6000);
}

// 7. API Sending Actions
async function sendToBackend(endpoint, payload) {
  showStatus('info', 'Sedang mengirim pesan...');
  try {
    const res = await fetch(`${BACKEND_URL}/api/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    
    if (res.ok && data.success) {
      showStatus('success', 'Pesan berhasil dikirim via Baileys backend! ✅');
    } else {
      showStatus('error', data.message || 'Gagal mengirim pesan melalui backend.');
    }
  } catch (err) {
    console.error(err);
    showStatus('error', 'Gagal menghubungi server backend. Pastikan server Node.js aktif di http://localhost:3000');
  }
}

// Send buttons
document.getElementById('wat-send-buttons').addEventListener('click', () => {
  try {
    const text = document.getElementById('wat-btn-text').value.trim();
    const title = document.getElementById('wat-btn-title').value.trim();
    const footer = document.getElementById('wat-btn-footer').value.trim();
    const recipient = getRecipient();

    if (!text) {
      showStatus('error', 'Isi pesan utama tidak boleh kosong.');
      return;
    }
    if (messageButtons.length === 0) {
      showStatus('error', 'Silakan tambahkan minimal 1 tombol.');
      return;
    }

    sendToBackend('send-buttons', {
      recipient,
      text,
      title,
      footer,
      buttons: messageButtons
    });
  } catch (err) {
    showStatus('error', err.message);
  }
});

// Send custom link preview
document.getElementById('wat-send-preview').addEventListener('click', () => {
  try {
    const text = document.getElementById('wat-lp-text').value.trim();
    const url = document.getElementById('wat-lp-url').value.trim();
    const title = document.getElementById('wat-lp-title').value.trim();
    const description = document.getElementById('wat-lp-desc').value.trim();
    const siteName = document.getElementById('wat-lp-sitename').value.trim();
    const thumbnail = document.getElementById('wat-lp-thumb').value.trim();
    const recipient = getRecipient();

    if (!text || !url) {
      showStatus('error', 'Pesan utama dan URL tidak boleh kosong.');
      return;
    }

    sendToBackend('send-preview', {
      recipient,
      text,
      url,
      title,
      description,
      siteName,
      thumbnail
    });
  } catch (err) {
    showStatus('error', err.message);
  }
});

// Send carousel
document.getElementById('wat-send-carousel').addEventListener('click', () => {
  try {
    const recipient = getRecipient();
    if (carouselCards.length === 0) {
      showStatus('error', 'Silakan tambahkan minimal 1 kartu karosel.');
      return;
    }

    sendToBackend('send-carousel', {
      recipient,
      cards: carouselCards
    });
  } catch (err) {
    showStatus('error', err.message);
  }
});

// Send contact card
document.getElementById('wat-send-contact').addEventListener('click', () => {
  try {
    const name = document.getElementById('wat-con-name').value.trim();
    const org = document.getElementById('wat-con-org').value.trim();
    const phone = document.getElementById('wat-con-phone').value.trim();
    const recipient = getRecipient();

    if (!name || !phone) {
      showStatus('error', 'Nama Kontak dan Nomor Telepon tidak boleh kosong.');
      return;
    }

    sendToBackend('send-contact', {
      recipient,
      name,
      org,
      phone
    });
  } catch (err) {
    showStatus('error', err.message);
  }
});

// Send custom location
document.getElementById('wat-send-location').addEventListener('click', () => {
  try {
    const name = document.getElementById('wat-loc-name').value.trim();
    const address = document.getElementById('wat-loc-address').value.trim();
    const lat = document.getElementById('wat-loc-lat').value.trim();
    const lng = document.getElementById('wat-loc-lng').value.trim();
    const recipient = getRecipient();

    if (!name || !lat || !lng) {
      showStatus('error', 'Nama Tempat, Latitude, dan Longitude tidak boleh kosong.');
      return;
    }

    sendToBackend('send-location', {
      recipient,
      name,
      address,
      latitude: parseFloat(lat),
      longitude: parseFloat(lng)
    });
  } catch (err) {
    showStatus('error', err.message);
  }
});

// Send list menu
document.getElementById('wat-send-list').addEventListener('click', () => {
  try {
    const title = document.getElementById('wat-list-title').value.trim();
    const text = document.getElementById('wat-list-text').value.trim();
    const footer = document.getElementById('wat-list-footer').value.trim();
    const buttonText = document.getElementById('wat-list-btn-text').value.trim();
    const recipient = getRecipient();

    if (!text) {
      showStatus('error', 'Pesan utama (Text) tidak boleh kosong.');
      return;
    }
    if (!buttonText) {
      showStatus('error', 'Teks tombol pembuka menu tidak boleh kosong.');
      return;
    }
    if (listOptions.length === 0) {
      showStatus('error', 'Silakan tambahkan minimal 1 opsi menu.');
      return;
    }

    sendToBackend('send-list', {
      recipient,
      title,
      text,
      footer,
      buttonText,
      options: listOptions
    });
  } catch (err) {
    showStatus('error', err.message);
  }
});
