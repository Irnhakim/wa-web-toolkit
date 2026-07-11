// content.js - Injected automatically on https://web.whatsapp.com/
console.log('[WA Web Toolkit] content.js active.');

// 1. Inject Stylesheet
const linkEl = document.createElement('link');
linkEl.rel = 'stylesheet';
linkEl.href = chrome.runtime.getURL('ui.css');
document.head.appendChild(linkEl);

// 2. Inject Libraries & inject.js in correct order
function injectScript(file) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(file);
    script.onload = () => {
      console.log(`[WA Web Toolkit] Injected: ${file}`);
      script.remove();
      resolve();
    };
    script.onerror = (err) => {
      console.error(`[WA Web Toolkit] Failed to inject: ${file}`, err);
      reject(err);
    };
    (document.head || document.documentElement).appendChild(script);
  });
}

// Sequence injection
async function initInjection() {
  try {
    await injectScript('lib/wppconnect-wa.js');
    await injectScript('inject.js');
    console.log('[WA Web Toolkit] All scripts injected successfully.');
  } catch (err) {
    console.error('[WA Web Toolkit] Injection flow failed.', err);
  }
}
initInjection();

// 3. Build UI Elements
const sidebarHTML = `
  <div class="wat-header">
    <h2>WA Web Toolkit</h2>
    <button class="wat-close-btn" id="wat-close-btn">&times;</button>
  </div>
  
  <div class="wat-tabs">
    <button class="wat-tab-btn active" data-tab="tab-buttons">Buttons</button>
    <button class="wat-tab-btn" data-tab="tab-preview">Link Preview</button>
    <button class="wat-tab-btn" data-tab="tab-carousel">Carousel</button>
  </div>

  <div class="wat-body">
    <!-- Status / Notification -->
    <div class="wat-status" id="wat-status-box"></div>

    <!-- Recipient Section -->
    <div class="wat-form-group">
      <label>Kirim Ke</label>
      <div style="display: flex; gap: 15px; margin-bottom: 8px;">
        <label style="display: flex; align-items: center; gap: 5px; font-size: 13px; text-transform: none; color: #e9edef;">
          <input type="radio" name="wat-recipient-type" value="active" checked> Chat Aktif
        </label>
        <label style="display: flex; align-items: center; gap: 5px; font-size: 13px; text-transform: none; color: #e9edef;">
          <input type="radio" name="wat-recipient-type" value="custom"> Nomor Custom
        </label>
      </div>
      <input type="text" id="wat-custom-recipient" class="wat-input" placeholder="Contoh: 628123456789" style="display: none;">
      <div id="wat-active-chat-info" style="font-size: 13px; color: #00b4db; margin-top: 4px;">Mendeteksi chat aktif...</div>
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

// 4. Toggle Sidebar Logic
toggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  if (sidebar.classList.contains('open')) {
    // Get active chat from page context
    postMessageToInject('GET_ACTIVE_CHAT', {});
  }
});

document.getElementById('wat-close-btn').addEventListener('click', () => {
  sidebar.classList.remove('open');
});

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

// 6. Form Fields Toggle (Recipient and Button type)
const recipientTypeRadios = document.querySelectorAll('[name="wat-recipient-type"]');
const customRecipientInput = document.getElementById('wat-custom-recipient');
const activeChatInfo = document.getElementById('wat-active-chat-info');

document.querySelectorAll('input[name="wat-recipient-type"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
      customRecipientInput.style.display = 'block';
      activeChatInfo.style.display = 'none';
    } else {
      customRecipientInput.style.display = 'none';
      activeChatInfo.style.display = 'block';
      postMessageToInject('GET_ACTIVE_CHAT', {});
    }
  });
});

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

// 7. Data Storage & Builders
let messageButtons = []; // max 3
let carouselCards = []; // max 5

// UI Updates for Builders
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
renderButtonsList();

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
renderCardsList();

// Add Item Handlers
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

// Status Box Helper
function showStatus(type, message) {
  const box = document.getElementById('wat-status-box');
  box.className = `wat-status ${type}`;
  box.innerText = message;
  
  // Clear after 5 seconds
  setTimeout(() => {
    if (box.className.includes(type) && box.innerText === message) {
      box.style.display = 'none';
    }
  }, 5000);
}

// 8. Communication Helpers
function getRecipient() {
  const rType = document.querySelector('input[name="wat-recipient-type"]:checked').value;
  if (rType === 'custom') {
    const val = customRecipientInput.value.trim();
    if (!val) {
      throw new Error('Silakan masukkan nomor tujuan.');
    }
    return val;
  }
  return 'active'; // Instructs inject.js to use the open chat
}

function postMessageToInject(action, payload) {
  window.postMessage({
    source: 'wat-content',
    action: action,
    payload: payload
  }, '*');
}

// Listen to responses from inject.js
window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || event.data.source !== 'wat-inject') {
    return;
  }

  const { type, message, data } = event.data;
  console.log(`[WA Web Toolkit] Received response (${type}): ${message}`, data);

  if (type === 'ready') {
    activeChatInfo.innerText = 'Sistem Siap! Pilih chat untuk memulai.';
  } else if (type === 'active-chat') {
    if (data) {
      activeChatInfo.innerText = `Kirim ke: ${data.name}`;
      activeChatInfo.style.color = '#00e676';
    } else {
      activeChatInfo.innerText = 'Pilih chat di WhatsApp Web atau gunakan nomor custom.';
      activeChatInfo.style.color = '#ff5252';
    }
  } else if (type === 'success') {
    showStatus('success', message);
  } else if (type === 'error') {
    showStatus('error', message);
  } else if (type === 'info') {
    showStatus('info', message);
  }
});

// 9. Send Action Triggers
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

    postMessageToInject('SEND_BUTTON_MESSAGE', {
      chatId: recipient,
      text,
      title,
      footer,
      buttons: messageButtons
    });
  } catch (err) {
    showStatus('error', err.message);
  }
});

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

    postMessageToInject('SEND_LINK_PREVIEW', {
      chatId: recipient,
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

document.getElementById('wat-send-carousel').addEventListener('click', () => {
  try {
    const recipient = getRecipient();

    if (carouselCards.length === 0) {
      showStatus('error', 'Silakan tambahkan minimal 1 kartu karosel.');
      return;
    }

    postMessageToInject('SEND_CAROUSEL_MESSAGE', {
      chatId: recipient,
      cards: carouselCards
    });
  } catch (err) {
    showStatus('error', err.message);
  }
});
