# wa-web-toolkit
Power up WhatsApp Web with custom buttons, tailored link previews (title, description, site name, image), and carousels via a sleek glassmorphic UI.

This toolkit operates in a stable **Client-Server Architecture**:
- **Frontend (Chrome Extension)**: Injects a premium floating control panel directly into the WhatsApp Web page.
- **Backend (Node.js & Baileys)**: A local server powered by Express and Baileys that connects directly to the WhatsApp protocol, bypassing browser injection limitations.

---

## 🚀 Features

- **Interactive Buttons**: Send messages containing up to 3 interactive buttons (Quick Reply, URL Links, and Call shortcuts) that actually render on recipients' devices.
- **Custom Link Previews**: Customize the Title, Description, Site Name, and Thumbnail image of shared links (renders beautifully using `externalAdReply`).
- **Dynamic Carousels**: Send card-based carousels where each card has a title, description, image, custom link, and independent buttons (falls back gracefully to high-fidelity sequential cards).
- **Contact Cards (VCard)**: Send customized contact cards complete with Name, Phone, and Company.
- **Custom Location Message**: Pinpoint any coordinates on the map. Send custom location points with specific Titles, Addresses, Latitudes, and Longitudes.
- **List Menu Message**: Build interactive menu sheets containing up to 10 options for structured responses (ideal for FAQs and Support Trees).
- **Active Chat Detection**: Automatically reads your currently open WhatsApp Web conversation.
- **Sleek Floating Panel**: Premium Glassmorphism UI that matches WhatsApp Web's native dark theme.

---

## 📦 Tech Stack

- **Frontend**: Chrome Extension (Manifest V3), Vanilla JS, Custom CSS (Dark theme / Glassmorphism)
- **Backend**: Node.js, Express, CORS, Pino
- **WhatsApp Library**: `@whiskeysockets/baileys` (Multi-device socket connection)

---

## 🛠️ Installation & Setup Guide

### 1. Run the Backend Server
Go to the backend directory and install dependencies:
```bash
cd backend
npm install
```
Start the server:
```bash
npm start
```
A **QR Code** will be printed in the terminal. Open WhatsApp on your phone -> **Linked Devices** -> **Link a Device** and scan the code.

Once connected, you will see `WhatsApp Bot berhasil terhubung! ✅` in the terminal.

### 2. Load the Chrome Extension
1. Open Google Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the **`extension/`** folder of this project.

### 3. Usage
Open [web.whatsapp.com](https://web.whatsapp.com/). Click the floating lightning bolt button (**⚡**) in the bottom-right corner to open the toolkit. The status bar at the top should say **`Bot Server: Connected Ready ✅`**.

---

## 📝 Usage

### 1. Interactive Buttons
- Enter your main message body.
- Customize headers (Title) and footers.
- Add up to 3 buttons (cannot mix Quick Reply with Link/Call buttons in a single message).
- Click **Kirim Button Message**.

### 2. Custom Link Preview
- Write your caption and paste the URL.
- Enter custom Title, Description, and Site Name.
- Provide a thumbnail image URL or base64 data string.
- Click **Kirim Link Preview**.

### 3. Carousel Message
- Create cards by defining a Title, Description, URL, and Thumbnail.
- (Optional) Add up to 2 customized buttons for each card.
- Click **Tambah Kartu** to add cards (up to 5 cards).
- Click **Kirim Carousel Message**.

---

## ⚠️ Disclaimer

This is an unofficial automation helper tool and is **not** associated with or endorsed by WhatsApp/Meta. Use this extension at your own risk. Sending unsolicited automated messages or spamming may result in your account being permanently banned by WhatsApp. 

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
