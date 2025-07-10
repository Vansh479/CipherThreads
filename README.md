# 🔐 CipherThreads – Parallel File Encryptor/Decryptor

CipherThreads is a full-stack web application that allows users to **encrypt and decrypt multiple text files** in bulk using three different execution strategies: **Multithreading**, **Multiprocessing**, and **Sequential Processing**. It visualizes and compares their performance in real-time, helping users understand the trade-offs of parallel file handling techniques.

---

## 🚀 Features

- 📁 Upload up to 1000 `.txt` files at once
- 🔒 Choose between **Encryption** or **Decryption**
- ⚙️ Select processing method:
  - **Multithreading**
  - **Multiprocessing**
  - **Sequential Execution**
- 📊 Real-time performance visualization using **Recharts**
- 📥 Download processed files individually
- 📈 Compare processing time, operation type, and file count across methods

---

## 🛠️ Tech Stack

### Frontend
- React
- Tailwind CSS
- Recharts
- Lucide React Icons

### Backend
- Node.js
- Express.js
- Multer (for file upload handling)
- CORS

---
