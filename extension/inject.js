// inject.js - Runs in MAIN world (page context) to access window.Store
// This file is NOT an inline script - it is loaded by Chrome as an extension file.
// No CSP violations occur here.

(function () {
  let lastJid = null;

  function broadcastActiveChat() {
    try {
      if (window.Store && window.Store.Chat && window.Store.Chat.getActive) {
        const activeChat = window.Store.Chat.getActive();
        if (activeChat) {
          const jid = (activeChat.id && activeChat.id._serialized) || activeChat.id;
          const name = activeChat.name || activeChat.formattedTitle || activeChat.pushname || 'Chat';
          if (jid !== lastJid) {
            lastJid = jid;
            window.postMessage({ type: 'WAT_ACTIVE_CHAT', jid, name }, '*');
          }
        }
      }
    } catch (e) {
      // Store not ready yet
    }
  }

  setInterval(broadcastActiveChat, 1000);
})();
