// inject.js - Runs in the main page context of WhatsApp Web
console.log('[WA Web Toolkit] inject.js loaded.');

// Utility to notify content.js about initialization status
function notifyUI(type, message, data = null) {
  window.postMessage({
    source: 'wat-inject',
    type: type,
    message: message,
    data: data
  }, '*');
}

// Check if WPP is ready
function checkWPPReady() {
  if (typeof WPP !== 'undefined' && WPP.isReady) {
    notifyUI('ready', 'WA-JS is fully loaded and ready.');
    listenToContentScript();
  } else {
    // Retry in 1 second
    setTimeout(checkWPPReady, 1000);
  }
}

// Listen to messages from content.js
function listenToContentScript() {
  window.addEventListener('message', async (event) => {
    // Only accept messages from the same window and from content.js
    if (event.source !== window || !event.data || event.data.source !== 'wat-content') {
      return;
    }

    const { action, payload } = event.data;
    console.log(`[WA Web Toolkit] Received action: ${action}`, payload);

    try {
      let chatId = payload.chatId;

      // If chatId is empty or 'active', try to get the active chat from WA-JS
      if (!chatId || chatId === 'active') {
        const activeChat = WPP.chat.getActiveChat();
        if (activeChat) {
          chatId = activeChat.id._serialized || activeChat.id;
        } else {
          throw new Error('Tidak ada obrolan aktif. Silakan pilih chat terlebih dahulu atau masukkan nomor tujuan.');
        }
      }

      // Format chatId to WhatsApp format if it's just a number
      if (chatId && !chatId.includes('@')) {
        chatId = chatId.replace(/[^0-9]/g, '') + '@c.us';
      }

      switch (action) {
        case 'GET_ACTIVE_CHAT': {
          const activeChat = WPP.chat.getActiveChat();
          if (activeChat) {
            notifyUI('active-chat', 'Chat aktif berhasil diambil.', {
              id: activeChat.id._serialized || activeChat.id,
              name: activeChat.name || activeChat.formattedName || chatId
            });
          } else {
            notifyUI('active-chat', 'Tidak ada chat aktif.', null);
          }
          break;
        }

        case 'SEND_BUTTON_MESSAGE': {
          const { text, title, footer, buttons } = payload;
          
          // Map buttons into WA-JS format
          const formattedButtons = buttons.map((btn, index) => {
            if (btn.type === 'url') {
              return {
                url: btn.value,
                text: btn.text
              };
            } else if (btn.type === 'phone') {
              return {
                phoneNumber: btn.value,
                text: btn.text
              };
            } else {
              // quick_reply
              return {
                id: btn.id || `btn_${index}`,
                text: btn.text
              };
            }
          });

          console.log('[WA Web Toolkit] Sending interactive button message to:', chatId);
          await WPP.chat.sendTextMessage(chatId, text, {
            useInteractiveMessage: true,
            title: title || undefined,
            footer: footer || undefined,
            buttons: formattedButtons
          });

          notifyUI('success', 'Button Message berhasil dikirim!');
          break;
        }

        case 'SEND_LINK_PREVIEW': {
          const { text, url, title, description, siteName, thumbnail } = payload;

          console.log('[WA Web Toolkit] Sending link preview message to:', chatId);
          
          // We can pass custom link preview data inside options
          await WPP.chat.sendTextMessage(chatId, text, {
            linkPreview: {
              title: title || undefined,
              description: description || undefined,
              thumbnail: thumbnail || undefined, // Must be base64 (image/jpeg) without data:image/jpeg;base64 prefix if WPP expects it, or with it. Usually full data URI works.
              canonicalUrl: url,
              matchedText: url,
              source: siteName || undefined,
              siteName: siteName || undefined,
              domain: siteName || undefined
            }
          });

          notifyUI('success', 'Link Preview Message berhasil dikirim!');
          break;
        }

        case 'SEND_CAROUSEL_MESSAGE': {
          const { cards } = payload;
          
          console.log('[WA Web Toolkit] Sending carousel message to:', chatId);

          if (typeof WPP.chat.sendCarouselMessage === 'function') {
            // If the library supports native carousel message
            await WPP.chat.sendCarouselMessage(chatId, cards);
            notifyUI('success', 'Carousel Message berhasil dikirim!');
          } else {
            // Fallback: Send cards as successive rich previews or catalog/product message
            // Let's check if we can send a custom multi-product or multiple custom cards
            notifyUI('info', 'Mengirim karosel sebagai rangkaian kartu pesan...');
            
            for (let i = 0; i < cards.length; i++) {
              const card = cards[i];
              let cardText = `*${card.title}*\n${card.description}\n\n${card.url || ''}`;
              
              if (card.buttons && card.buttons.length > 0) {
                const formattedButtons = card.buttons.map((btn, idx) => {
                  if (btn.type === 'url') {
                    return { url: btn.value, text: btn.text };
                  } else if (btn.type === 'phone') {
                    return { phoneNumber: btn.value, text: btn.text };
                  } else {
                    return { id: `card_${i}_btn_${idx}`, text: btn.text };
                  }
                });

                await WPP.chat.sendTextMessage(chatId, cardText, {
                  useInteractiveMessage: true,
                  buttons: formattedButtons
                });
              } else if (card.url) {
                await WPP.chat.sendTextMessage(chatId, cardText, {
                  linkPreview: {
                    title: card.title,
                    description: card.description,
                    thumbnail: card.thumbnail || undefined,
                    canonicalUrl: card.url,
                    matchedText: card.url
                  }
                });
              } else {
                await WPP.chat.sendTextMessage(chatId, cardText);
              }
              // Small delay between cards
              await new Promise(resolve => setTimeout(resolve, 800));
            }
            notifyUI('success', 'Carousel (Rangkaian Kartu) berhasil dikirim!');
          }
          break;
        }

        default:
          throw new Error(`Aksi tidak dikenal: ${action}`);
      }
    } catch (err) {
      console.error('[WA Web Toolkit] Error processing action:', err);
      notifyUI('error', err.message || 'Terjadi kesalahan saat memproses permintaan.');
    }
  });
}

// Start checking for WPP
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  checkWPPReady();
} else {
  window.addEventListener('DOMContentLoaded', checkWPPReady);
}
