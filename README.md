# wa-web-toolkit
Power up WhatsApp Web with custom buttons, tailored link previews (title, description, site name, image), and carousels via a sleek glassmorphic UI.

---

## 🚀 Features

- **Interactive Buttons**: Send messages containing up to 3 interactive buttons (Quick Reply, URL Links, and Call shortcuts).
- **Custom Link Previews**: Take control of your links. Customize the title, description, website name, and thumbnail image of shared links.
- **Dynamic Carousels**: Send card-based carousels where each card has a title, description, image, custom link, and independent buttons.
- **Active Chat Detection**: Seamlessly reads your active WhatsApp Web chat, eliminating the need to copy-paste chat IDs or phone numbers.
- **Custom Recipient Picker**: Send messages to any international phone number directly from the control panel.
- **Sleek Floating Panel**: Premium Glassmorphism UI that matches WhatsApp Web's dark theme with subtle animations.

---

## 📦 Tech Stack

- **Extension Framework**: Manifest V3
- **Core Engine**: `@wppconnect/wa-js` (bundled locally for security and offline capability)
- **Styling**: Pure CSS (Modern dark theme, HSL color palette, Glassmorphism, CSS variables)
- **UI Logic**: Vanilla JavaScript

---

## 🛠️ Installation Guide

1. **Clone or Download the Repository:**
   ```bash
   git clone https://github.com/username/wa-web-toolkit.git
   ```
2. **Open Extensions Page:**
   Launch Google Chrome (or any Chromium browser) and go to `chrome://extensions/`.
3. **Enable Developer Mode:**
   Toggle the **"Developer mode"** switch in the top-right corner.
4. **Load Unpacked Extension:**
   Click the **"Load unpacked"** button in the top-left and select the `wa-web-toolkit` folder.
5. **Open WhatsApp Web:**
   Go to [web.whatsapp.com](https://web.whatsapp.com/). A floating lightning bolt button (**⚡**) will appear in the bottom-right corner. Click it to open the control panel.

---

## 📝 Usage

### 1. Interactive Buttons
- Enter your main message body.
- Customize headers (Title) and footers.
- Use the **Add Button** button to add up to 3 buttons.
- Click **Send Button Message** to transmit.

### 2. Custom Link Preview
- Write your caption and paste the URL.
- Enter custom Title, Description, and Site Name.
- Provide a thumbnail image URL or base64 data string.
- Click **Send Link Preview**.

### 3. Carousel Message
- Create cards by defining a Title, Description, URL, and Thumbnail.
- (Optional) Add up to 2 customized buttons for each card.
- Click **Tambah Kartu** to add cards (up to 5 cards).
- Click **Kirim Carousel Message** to send.

---

## ⚠️ Disclaimer

This is an unofficial automation helper tool and is **not** associated with or endorsed by WhatsApp/Meta. Use this extension at your own risk. Sending unsolicited automated messages or spamming may result in your account being permanently banned by WhatsApp. 

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
