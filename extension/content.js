// content.js - WA Web Toolkit (Frontend Only via Baileys Server)
console.log('[WA Web Toolkit] Content script loaded (Baileys client mode).');

let BACKEND_URL = 'http://localhost:3000';

// Active chat detection state (populated by inject.js via postMessage)
let activeChatJidOrName = null;
let activeChatDisplayName = 'Chat';

// Listen for active chat broadcasts from inject.js (MAIN world)
window.addEventListener('message', (event) => {
  if (event.source === window && event.data && event.data.type === 'WAT_ACTIVE_CHAT') {
    activeChatJidOrName = event.data.jid;
    activeChatDisplayName = event.data.name || 'Chat';
    refreshActiveChatIndicator();
  }
});

function refreshActiveChatIndicator() {
  const indicator = document.getElementById('wat-active-chat-indicator');
  const checkbox = document.getElementById('wat-use-active-chat');
  if (!indicator || !checkbox || !checkbox.checked) return;
  if (activeChatJidOrName) {
    const isGroup = activeChatJidOrName.includes('@g.us');
    const label = isGroup ? `${activeChatDisplayName} (Grup)` : `${activeChatDisplayName}`;
    indicator.innerText = `✅ ${label}`;
    indicator.style.color = '#00e676';
    indicator.style.borderColor = 'rgba(0, 230, 118, 0.2)';
    indicator.style.background = 'rgba(0, 230, 118, 0.05)';
  } else {
    indicator.innerText = 'Buka salah satu chat terlebih dahulu ⚠️';
    indicator.style.color = '#ff9800';
    indicator.style.borderColor = 'rgba(255, 152, 0, 0.2)';
    indicator.style.background = 'rgba(255, 152, 0, 0.05)';
  }
}

// 1. Inject Stylesheet
const linkEl = document.createElement('link');
linkEl.rel = 'stylesheet';
linkEl.href = chrome.runtime.getURL('ui.css');
document.head.appendChild(linkEl);

// 2. Build UI Elements
const sidebarHTML = `
  <div class="wat-header">
    <h2>WA Web Toolkit</h2>
    <button class="wat-close-btn" id="wat-close-btn">&times;</button>
  </div>

  <!-- TOP NAV: always visible, switches between Enhance and Bot views -->
  <div style="display: flex; border-bottom: 1px solid rgba(255,255,255,0.07); background: rgba(0,0,0,0.2);">
    <button id="nav-enhance-btn" style="flex:1; padding: 9px 6px; font-size: 12px; font-weight: 700; color: #00b4db; background: rgba(0,180,219,0.1); border: none; cursor: pointer; border-bottom: 2px solid #00b4db; font-family: inherit;">✨ Enhance</button>
    <button id="nav-bot-btn" style="flex:1; padding: 9px 6px; font-size: 12px; font-weight: 700; color: #8696a0; background: none; border: none; cursor: pointer; border-bottom: 2px solid transparent; font-family: inherit;">⚡ Custom Send</button>
  </div>

  <!-- ENHANCE VIEW: always accessible, no login needed -->
  <div id="wat-enhance-view" style="flex:1; overflow-y: auto; padding: 12px 15px;">

    <!-- PRIVATE MODE -->
    <div class="wat-enhance-section">
      <div class="wat-enhance-section-header">
        <span>🔒 Private Mode</span>
        <label class="wat-toggle-switch">
          <input type="checkbox" id="enh-private-master">
          <span class="wat-toggle-slider"></span>
        </label>
      </div>
      <p class="wat-enhance-desc">Sembunyikan info sensitif di layar</p>
      <div class="wat-enhance-options">
        <label class="wat-enh-opt"><input type="checkbox" data-enh="blur-names"> Blur nama kontak</label>
        <label class="wat-enh-opt"><input type="checkbox" data-enh="blur-avatars"> Blur foto kontak</label>
        <label class="wat-enh-opt"><input type="checkbox" data-enh="blur-previews"> Blur preview pesan terakhir</label>
        <label class="wat-enh-opt"><input type="checkbox" data-enh="blur-messages"> Blur isi pesan di chat</label>
        <label class="wat-enh-opt"><input type="checkbox" data-enh="blur-composer"> Blur kotak ketik pesan</label>
        <label class="wat-enh-opt"><input type="checkbox" data-enh="hide-typing"> Sembunyikan status mengetik</label>
        <label class="wat-enh-opt"><input type="checkbox" data-enh="hide-recording"> Sembunyikan status merekam</label>
        <label class="wat-enh-opt"><input type="checkbox" data-enh="hide-read-receipts"> Nonaktifkan centang biru</label>
        <label class="wat-enh-opt"><input type="checkbox" data-enh="hide-online"> Sembunyikan status Online saya</label>
      </div>
    </div>

    <hr style="border:0; border-top:1px solid rgba(255,255,255,0.05); margin: 10px 0;">

    <!-- CUSTOMIZATIONS -->
    <div class="wat-enhance-section">
      <div class="wat-enhance-section-header">
        <span>🎨 Customizations</span>
        <label class="wat-toggle-switch">
          <input type="checkbox" id="enh-custom-master">
          <span class="wat-toggle-slider"></span>
        </label>
      </div>
      <p class="wat-enhance-desc">Fungsi tambahan yang berguna</p>
      <div class="wat-enhance-options">
        <label class="wat-enh-opt"><input type="checkbox" data-enh="notify-online"> Notif saat kontak online</label>
        <label class="wat-enh-opt"><input type="checkbox" data-enh="prevent-jump"> Cegah daftar chat berpindah</label>
        <label class="wat-enh-opt"><input type="checkbox" data-enh="dark-scrollbar"> Scrollbar gelap elegan</label>
        <label class="wat-enh-opt"><input type="checkbox" data-enh="larger-emoji"> Emoji lebih besar di chat</label>
      </div>
    </div>

    <hr style="border:0; border-top:1px solid rgba(255,255,255,0.05); margin: 10px 0;">

    <!-- EXTRA BUTTONS -->
    <div class="wat-enhance-section">
      <div class="wat-enhance-section-header">
        <span>➕ Extra Buttons</span>
        <label class="wat-toggle-switch">
          <input type="checkbox" id="enh-extra-master">
          <span class="wat-toggle-slider"></span>
        </label>
      </div>
      <p class="wat-enhance-desc">Tambah tombol aksi di toolbar chat</p>
      <div class="wat-enhance-options">
        <label class="wat-enh-opt"><input type="checkbox" data-enh="btn-like"> Tombol Like ❤️</label>
        <label class="wat-enh-opt"><input type="checkbox" data-enh="btn-mark-read"> Tombol Tandai Dibaca ✅</label>
        <label class="wat-enh-opt"><input type="checkbox" data-enh="btn-top"> Tombol Scroll ke Atas ⬆️</label>
        <label class="wat-enh-opt"><input type="checkbox" data-enh="btn-mute"> Tombol Bisukan Chat 🔇</label>
      </div>
    </div>

  </div>

  <!-- BOT VIEW: hidden by default, shown when Custom Send tab is clicked -->
  <div id="wat-bot-view" style="display:none; flex-direction:column; flex:1; overflow:hidden;">

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
    </div> <!-- END CONNECTION VIEW -->
  </div> <!-- END BOT VIEW -->
`;

// Create elements
const toggleBtn = document.createElement('button');
toggleBtn.id = 'wat-toggle-btn';
toggleBtn.innerHTML = '⚡';

// Inject toggleBtn directly into WhatsApp Web's left navigation rail
function injectToggleButton() {
  // Try to find the Meta AI button container
  const metaAiIcon = document.querySelector('[data-testid="meta-ai-icon"]') || 
                     document.querySelector('span[data-icon="meta-ai"]') || 
                     document.querySelector('a[href*="meta"]');
  
  if (metaAiIcon) {
    // Navigate up to find the action container wrapper (usually a div with role="button" or styled wrapper)
    const buttonWrapper = metaAiIcon.closest('div[role="button"]') || 
                          metaAiIcon.closest('button') || 
                          metaAiIcon.closest('a') || 
                          metaAiIcon.parentElement;
                          
    if (buttonWrapper && buttonWrapper.parentNode) {
      buttonWrapper.parentNode.insertBefore(toggleBtn, buttonWrapper.nextSibling);
      toggleBtn.className = 'in-rail';
      return;
    }
  }

  // Fallback to searching the side rail navigation
  const sideRail = document.querySelector('[role="navigation"]') || 
                   document.querySelector('header nav') || 
                   document.querySelector('header');
                   
  if (sideRail) {
    sideRail.appendChild(toggleBtn);
    toggleBtn.className = 'in-rail';
  } else {
    // Absolute fallback to body
    document.body.appendChild(toggleBtn);
  }
}

// Run injection
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectToggleButton);
} else {
  // WhatsApp takes time to render, poll until side rail is present
  const railPoll = setInterval(() => {
    const rail = document.querySelector('[role="navigation"]') || document.querySelector('header');
    if (rail) {
      clearInterval(railPoll);
      injectToggleButton();
    }
  }, 1000);
}

const sidebar = document.createElement('div');
sidebar.id = 'wat-sidebar';
sidebar.innerHTML = sidebarHTML;
document.body.appendChild(sidebar);

// Top Nav: switch between Enhance and Custom Send (Bot) views
const enhanceView = document.getElementById('wat-enhance-view');
const botView = document.getElementById('wat-bot-view');
const navEnhanceBtn = document.getElementById('nav-enhance-btn');
const navBotBtn = document.getElementById('nav-bot-btn');

function switchToEnhance() {
  if (enhanceView) enhanceView.style.setProperty('display', 'block', 'important');
  if (botView) botView.style.setProperty('display', 'none', 'important');
  navEnhanceBtn.style.color = '#00b4db';
  navEnhanceBtn.style.background = 'rgba(0,180,219,0.1)';
  navEnhanceBtn.style.borderBottom = '2px solid #00b4db';
  navBotBtn.style.color = '#8696a0';
  navBotBtn.style.background = 'none';
  navBotBtn.style.borderBottom = '2px solid transparent';
}

function switchToBot() {
  if (enhanceView) enhanceView.style.setProperty('display', 'none', 'important');
  if (botView) botView.style.setProperty('display', 'flex', 'important');
  navBotBtn.style.color = '#00b4db';
  navBotBtn.style.background = 'rgba(0,180,219,0.1)';
  navBotBtn.style.borderBottom = '2px solid #00b4db';
  navEnhanceBtn.style.color = '#8696a0';
  navEnhanceBtn.style.background = 'none';
  navEnhanceBtn.style.borderBottom = '2px solid transparent';
  // Start status check when switching to bot view
  checkBackendStatus();
  if (!statusInterval) statusInterval = setInterval(checkBackendStatus, 3000);
}

navEnhanceBtn.addEventListener('click', switchToEnhance);
navBotBtn.addEventListener('click', switchToBot);

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
    statusInterval = setInterval(checkBackendStatus, 3000);
  } else {
    clearInterval(statusInterval);
  }
});

document.getElementById('wat-close-btn').addEventListener('click', () => {
  sidebar.classList.remove('open');
  clearInterval(statusInterval);
});




// Target Type Selector (Contact vs Group)
document.querySelectorAll('input[name="wat-target-type"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    const contactPicker = document.getElementById('wat-contact-picker-container');
    const groupPicker = document.getElementById('wat-group-picker-container');
    const tip = document.getElementById('wat-recipient-tip');
    
    if (e.target.value === 'group') {
      contactPicker.style.display = 'none';
      groupPicker.style.display = 'block';
      tip.innerText = 'Pilih salah satu grup WhatsApp dari daftar di atas untuk mengirim pesan.';
      fetchGroups();
    } else {
      contactPicker.style.display = 'block';
      groupPicker.style.display = 'none';
      tip.innerText = 'Gunakan kode negara tanpa tanda + (contoh: 628... untuk Indonesia).';
    }
  });
});

// Fetch Groups from Backend
async function fetchGroups() {
  const select = document.getElementById('wat-group-select');
  try {
    const res = await fetch(`${BACKEND_URL}/api/groups`);
    const data = await res.json();
    if (data.success && data.groups) {
      select.innerHTML = '';
      if (data.groups.length === 0) {
        select.innerHTML = '<option value="">Tidak ada grup diikuti</option>';
        return;
      }
      data.groups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.id;
        opt.innerText = g.subject || 'Grup Tanpa Nama';
        select.appendChild(opt);
      });
    } else {
      select.innerHTML = '<option value="">Gagal memuat daftar grup</option>';
    }
  } catch (e) {
    console.error(e);
    select.innerHTML = '<option value="">Gagal menghubungi server backend</option>';
  }
}

// Fetch groups when dropdown is clicked/focused (stops background polling spam)
const groupSelectEl = document.getElementById('wat-group-select');
if (groupSelectEl) {
  groupSelectEl.addEventListener('focus', () => {
    fetchGroups();
  });
}

// 4. Backend Connection & QR Polling
async function checkBackendStatus() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/status`);
    const data = await res.json();
    
    if (data.connected) {
      // Backend is online and WhatsApp is fully connected!
      if (connectionView) connectionView.style.display = 'none';
      if (mainView) mainView.style.display = 'flex';
      if (qrContainer) qrContainer.style.display = 'none';
    } else {
      // Backend is online but WhatsApp is NOT connected (requires QR Scan)
      if (connectionView) connectionView.style.display = 'flex';
      if (mainView) mainView.style.display = 'none';
      
      if (connectionInfo) {
        connectionInfo.innerText = 'Server Aktif. Scan QR Code di bawah untuk login WhatsApp ⚠️';
        connectionInfo.style.color = '#ff9800';
        connectionInfo.style.background = 'rgba(255, 152, 0, 0.08)';
        connectionInfo.style.borderColor = 'rgba(255, 152, 0, 0.15)';
      }
      
      if (data.qr) {
        if (qrContainer) qrContainer.style.display = 'block';
        if (data.qr !== currentQRString) {
          currentQRString = data.qr;
          if (qrImageContainer) {
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
        }
      } else {
        if (qrContainer) qrContainer.style.display = 'none';
        currentQRString = null;
        if (connectionInfo) connectionInfo.innerText = 'Server Aktif. Menunggu QR Code dari Baileys... ⏳';
      }
    }
  } catch (err) {
    // Backend is offline
    if (connectionView) connectionView.style.display = 'flex';
    if (mainView) mainView.style.display = 'none';
    if (qrContainer) qrContainer.style.display = 'none';
    
    if (connectionInfo) {
      connectionInfo.innerText = 'Server Offline. Jalankan Node.js Backend lokal Anda ❌';
      connectionInfo.style.color = '#ff5252';
      connectionInfo.style.background = 'rgba(255, 82, 82, 0.08)';
      connectionInfo.style.borderColor = 'rgba(255, 82, 82, 0.15)';
    }
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

// Chat Aktif checkbox toggle
document.getElementById('wat-use-active-chat').addEventListener('change', (e) => {
  const input = document.getElementById('wat-recipient-jid');
  const indicator = document.getElementById('wat-active-chat-indicator');
  const tip = document.getElementById('wat-recipient-tip');
  if (e.target.checked) {
    input.style.display = 'none';
    indicator.style.display = 'block';
    tip.innerText = 'Mengirim otomatis ke chat yang sedang terbuka di WhatsApp Web.';
    refreshActiveChatIndicator();
  } else {
    input.style.display = 'block';
    indicator.style.display = 'none';
    tip.innerText = 'Gunakan kode negara tanpa tanda + (contoh: 628... untuk Indonesia).';
  }
});

// Form Recipient Helper
function getRecipient() {
  const targetType = document.querySelector('input[name="wat-target-type"]:checked').value;
  if (targetType === 'group') {
    const select = document.getElementById('wat-group-select');
    const val = select.value;
    if (!val) {
      throw new Error('Silakan pilih salah satu grup WhatsApp dari daftar.');
    }
    return val;
  }

  // Contact flow
  const useActiveChat = document.getElementById('wat-use-active-chat').checked;
  if (useActiveChat) {
    if (!activeChatJidOrName) {
      throw new Error('Tidak ada chat aktif. Silakan buka salah satu chat di WhatsApp Web terlebih dahulu.');
    }
    return activeChatJidOrName;
  }

  let jid = document.getElementById('wat-recipient-jid').value.trim();
  if (!jid) {
    throw new Error('Silakan masukkan nomor HP tujuan.');
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
  if (messageButtons.length >= 10) {
    showStatus('error', 'Maksimal hanya bisa menambahkan 10 tombol.');
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
