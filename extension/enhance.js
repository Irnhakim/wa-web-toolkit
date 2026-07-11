
// =============================================================
// ENHANCEMENT ENGINE (No QR/Backend needed)
// =============================================================

// CSS rules for each enhancement feature
const ENH_CSS = {
  'blur-names': `
    [data-testid="cell-frame-title"] span,
    [data-testid="conversation-info-header-chat-title"] span,
    span[data-testid="conversation-info-header-chat-title"],
    ._ao3e { filter: blur(6px) !important; transition: filter 0.2s; }
    [data-testid="cell-frame-title"] span:hover,
    ._ao3e:hover { filter: blur(0) !important; }
  `,
  'blur-avatars': `
    [data-testid="thumb-img"],
    [data-testid="default-user"],
    [data-testid="avatar"],
    img[src*="avatar"],
    img[src*="profile"],
    ._aig- img,
    .zoWT4 img,
    div[style*="background-image"] { filter: blur(8px) !important; transition: filter 0.2s; }
    [data-testid="thumb-img"]:hover,
    img[src*="avatar"]:hover,
    img[src*="profile"]:hover,
    div[style*="background-image"]:hover { filter: blur(0) !important; }
  `,
  'blur-previews': `
    [data-testid="last-msg-status"],
    [data-testid="cell-frame-secondary-detail"],
    ._ao3e.lmggr8aq,
    ._al8u { filter: blur(5px) !important; transition: filter 0.2s; }
    [data-testid="last-msg-status"]:hover,
    ._al8u:hover { filter: blur(0) !important; }
  `,
  'blur-messages': `
    .message-in .copyable-text,
    .message-out .copyable-text,
    [data-testid="msg-container"] .copyable-text,
    ._ao3e._akbu { filter: blur(5px) !important; transition: filter 0.2s; }
    .message-in .copyable-text:hover,
    .message-out .copyable-text:hover,
    [data-testid="msg-container"] .copyable-text:hover { filter: blur(0) !important; }
  `,
  'blur-composer': `
    [data-testid="conversation-compose-box-input"],
    [contenteditable="true"][data-lexical-editor="true"] { filter: blur(4px) !important; transition: filter 0.2s; }
    [data-testid="conversation-compose-box-input"]:focus,
    [contenteditable="true"][data-lexical-editor="true"]:focus { filter: blur(0) !important; }
  `,
  'hide-typing': `
    [data-testid="typing-msg"],
    ._ak2g { display: none !important; }
  `,
  'hide-recording': `
    [data-testid="recording-msg"],
    ._ak2h { display: none !important; }
  `,
  'hide-read-receipts': `
    [data-testid="msg-dblcheck"],
    [data-testid="msg-dblcheck-ack"],
    span[data-icon="msg-dblcheck"],
    span[data-icon="msg-dblcheck-ack"],
    span[data-icon="double-check-blue"],
    span[data-icon="double-check-gray"],
    span[data-icon="single-check"],
    [data-testid="status-dblcheck"],
    [data-testid="status-dblcheck-ack"] { visibility: hidden !important; display: none !important; }
  `,
  'hide-online': `
    [data-testid="conversation-info-header-chat-title"] + div span,
    [data-testid="chat-list-item-header"] ._ao3e + span { display: none !important; }
  `,
  'prevent-jump': `
    [data-testid="chat-list"] { overflow: hidden !important; }
    [data-testid="chat-list"]:hover { overflow-y: auto !important; }
  `,
  'dark-scrollbar': `
    * { scrollbar-width: thin; scrollbar-color: rgba(0,180,219,0.4) rgba(0,0,0,0.1); }
    *::-webkit-scrollbar { width: 5px; height: 5px; }
    *::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
    *::-webkit-scrollbar-thumb { background: rgba(0,180,219,0.4); border-radius: 10px; }
    *::-webkit-scrollbar-thumb:hover { background: rgba(0,180,219,0.7); }
  `,
  'larger-emoji': `
    [data-testid="msg-container"] img.emoji { width: 32px !important; height: 32px !important; }
    .copyable-text img.emoji { width: 28px !important; height: 28px !important; }
  `,
};

// Style element for CSS features
const enhStyleEl = document.createElement('style');
enhStyleEl.id = 'wat-enh-styles';
document.head.appendChild(enhStyleEl);

// Active features map
const activeFeatures = new Set();
// Active observers/intervals map for JS features
const activeFeatureCleanups = {};

// Render current active CSS rules into the style element
function rebuildEnhCSS() {
  let css = '';
  for (const key of activeFeatures) {
    if (ENH_CSS[key]) css += ENH_CSS[key];
  }
  enhStyleEl.textContent = css;
}

// --------------- Extra Buttons Engine ---------------
let extraButtonsObserver = null;

function injectExtraButtons() {
  const toolbar = document.querySelector('[data-testid="conversation-header"]');
  if (!toolbar || toolbar.querySelector('.wat-extra-btn')) return;

  const btnDefs = [];

  if (activeFeatures.has('btn-like')) {
    btnDefs.push({ emoji: '❤️', title: 'Like chat ini', action: () => {
      const el = document.querySelector('[data-testid="conversation-compose-box-input"]');
      if (el) { el.focus(); document.execCommand('insertText', false, '❤️'); }
    }});
  }
  if (activeFeatures.has('btn-mark-read')) {
    btnDefs.push({ emoji: '✅', title: 'Tandai sebagai dibaca', action: () => {
      window.postMessage({ type: 'WAT_MARK_READ' }, '*');
    }});
  }
  if (activeFeatures.has('btn-top')) {
    btnDefs.push({ emoji: '⬆️', title: 'Scroll ke atas', action: () => {
      const msgs = document.querySelector('[data-testid="msg-list"]');
      if (msgs) msgs.scrollTop = 0;
    }});
  }
  if (activeFeatures.has('btn-mute')) {
    btnDefs.push({ emoji: '🔇', title: 'Bisukan chat', action: () => {
      window.postMessage({ type: 'WAT_MUTE_CHAT' }, '*');
    }});
  }

  btnDefs.forEach(def => {
    const btn = document.createElement('button');
    btn.className = 'wat-extra-btn';
    btn.title = def.title;
    btn.textContent = def.emoji;
    btn.style.cssText = `
      background: none; border: none; cursor: pointer;
      font-size: 18px; padding: 4px 6px; border-radius: 6px;
      transition: background 0.15s; line-height: 1;
    `;
    btn.addEventListener('mouseover', () => btn.style.background = 'rgba(255,255,255,0.1)');
    btn.addEventListener('mouseout', () => btn.style.background = 'none');
    btn.addEventListener('click', def.action);
    toolbar.appendChild(btn);
  });
}

function removeExtraButtons() {
  document.querySelectorAll('.wat-extra-btn').forEach(b => b.remove());
}

function startExtraButtonsObserver() {
  injectExtraButtons();
  extraButtonsObserver = new MutationObserver(() => {
    injectExtraButtons();
  });
  extraButtonsObserver.observe(document.body, { childList: true, subtree: true });
}

function stopExtraButtonsObserver() {
  if (extraButtonsObserver) { extraButtonsObserver.disconnect(); extraButtonsObserver = null; }
  removeExtraButtons();
}

// --------------- Notify Online Engine ---------------
let lastOnlineStates = {};
let onlineCheckInterval = null;

function startOnlineNotify() {
  onlineCheckInterval = setInterval(() => {
    try {
      document.querySelectorAll('[data-testid="chat-list"] [data-testid="cell-frame-container"]').forEach(cell => {
        const nameEl = cell.querySelector('[data-testid="cell-frame-title"] span');
        const statusEl = cell.querySelector('[data-testid="cell-frame-secondary-detail"] span');
        if (!nameEl || !statusEl) return;
        const name = nameEl.innerText.trim();
        const status = statusEl.innerText.trim();
        const isOnline = status === 'online';
        const wasOnline = lastOnlineStates[name];
        if (isOnline && !wasOnline) {
          showEnhNotification(`🟢 ${name} sedang online`);
        }
        lastOnlineStates[name] = isOnline;
      });
    } catch(e) {}
  }, 3000);
}

function stopOnlineNotify() {
  clearInterval(onlineCheckInterval);
  onlineCheckInterval = null;
  lastOnlineStates = {};
}

// Simple notification toast for Enhancement features
function showEnhNotification(msg) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 80px; right: 20px; z-index: 999999;
    background: rgba(0,20,40,0.95); color: #00e676;
    border: 1px solid rgba(0,230,118,0.3); border-radius: 10px;
    padding: 10px 16px; font-size: 13px; font-weight: 600;
    font-family: 'Segoe UI', sans-serif; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    backdrop-filter: blur(8px); max-width: 280px; pointer-events: none;
    animation: watToastIn 0.3s ease;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// --------------- Feature Toggle Core ---------------
function applyFeature(key, enabled) {
  if (enabled) {
    activeFeatures.add(key);
  } else {
    activeFeatures.delete(key);
  }

  // CSS-based features — just rebuild stylesheet
  if (ENH_CSS[key]) {
    rebuildEnhCSS();
    return;
  }

  // JS-based features
  if (key === 'notify-online') {
    enabled ? startOnlineNotify() : stopOnlineNotify();
  }
  if (key.startsWith('btn-')) {
    // Re-inject buttons when any btn- feature changes
    removeExtraButtons();
    const anyBtnActive = ['btn-like','btn-mark-read','btn-top','btn-mute'].some(k => activeFeatures.has(k));
    if (anyBtnActive) {
      startExtraButtonsObserver();
    } else {
      stopExtraButtonsObserver();
    }
  }
}

// --------------- Settings Persistence ---------------
function saveEnhSettings() {
  chrome.storage.local.set({ watEnhFeatures: [...activeFeatures] });
}

function loadEnhSettings() {
  chrome.storage.local.get(['watEnhFeatures'], (result) => {
    if (result.watEnhFeatures && Array.isArray(result.watEnhFeatures)) {
      result.watEnhFeatures.forEach(key => {
        // Tick the checkbox
        const cb = document.querySelector(`[data-enh="${key}"]`);
        if (cb) cb.checked = true;
        // Apply feature
        applyFeature(key, true);
      });
      // Sync master toggles
      syncMasterToggles();
    }
  });
}

function syncMasterToggles() {
  const privateKeys = ['blur-names','blur-avatars','blur-previews','blur-messages','blur-composer','hide-typing','hide-recording','hide-read-receipts','hide-online'];
  const customKeys = ['notify-online','prevent-jump','dark-scrollbar','larger-emoji'];
  const extraKeys = ['btn-like','btn-mark-read','btn-top','btn-mute'];

  document.getElementById('enh-private-master').checked = privateKeys.some(k => activeFeatures.has(k));
  document.getElementById('enh-custom-master').checked = customKeys.some(k => activeFeatures.has(k));
  document.getElementById('enh-extra-master').checked = extraKeys.some(k => activeFeatures.has(k));
}

// --------------- Wire up Enhancement checkboxes ---------------
document.querySelectorAll('[data-enh]').forEach(cb => {
  cb.addEventListener('change', () => {
    applyFeature(cb.dataset.enh, cb.checked);
    saveEnhSettings();
    syncMasterToggles();
  });
});

// Master toggles — enable/disable all in section
function bindMasterToggle(masterId, keys) {
  document.getElementById(masterId).addEventListener('change', (e) => {
    const enabled = e.target.checked;
    keys.forEach(key => {
      const cb = document.querySelector(`[data-enh="${key}"]`);
      if (cb) cb.checked = enabled;
      applyFeature(key, enabled);
    });
    saveEnhSettings();
  });
}

bindMasterToggle('enh-private-master', ['blur-names','blur-avatars','blur-previews','blur-messages','blur-composer','hide-typing','hide-recording','hide-read-receipts','hide-online']);
bindMasterToggle('enh-custom-master', ['notify-online','prevent-jump','dark-scrollbar','larger-emoji']);
bindMasterToggle('enh-extra-master', ['btn-like','btn-mark-read','btn-top','btn-mute']);

// Load saved settings on startup
loadEnhSettings();
