# 🩸 KWALA BloodVerse  

> **A decentralized, gamified blood donation platform powered by Blockchain + KWALA Automation**

---

## ⚡ Overview  

**KWALA BloodVerse** is a fully decentralized blood donation platform that brings **transparency, automation, and gamification** to the blood donation ecosystem.  

It enables admins to create verified on-chain blood requests, donors to express interest, and automatically rewards verified donors with **NFT badges and level upgrades**.  
All backend logic — notifications, level updates, and donor achievements — is automated using **KWALA workflows**.  

### 🌍 Why This Matters  
Traditional donation systems suffer from:
- 🕒 Manual coordination delays  
- ❌ Centralized & opaque data  
- 😔 No real incentives for donors  

BloodVerse makes it all **transparent, instant, and rewarding**.  

---

## 🧠 The Problem  
Blood donation processes are often slow, unverified, and lack transparency. Donors don’t receive recognition, and hospitals spend time manually matching and validating requests.  

---

## 💡 Our Solution  
BloodVerse automates the entire lifecycle:  

- 🏥 **Admin** creates a blood request on-chain  
- 🩸 **Donor** expresses interest to donate  
- ✅ **Admin** approves donor → **NFT badge minted**  
- ⚡ **KWALA** automation triggers:  
  - **Telegram notifications** for approvals & achievements  
  - **Frontend updates** (Achievements, XP, Level Up popups)  

This system makes the donation process **serverless, transparent, and rewarding** — combining blockchain + automation + gamification.  

---

## 🔬 The Hack (How It Works)

We replaced manual backend logic with **KWALA workflows**:  

1. A `RequestApproved` or `LevelUpdated` event is emitted by the **BloodRegistry** smart contract.  
2. KWALA listens for these events and automatically triggers a Telegram notification.  
3. At the same time, it updates the frontend dashboard via a webhook (`/api/kwala`).  
4. Donors see instant level upgrades, XP animations, and confetti pop-ups — all in real time.  

💡 All this happens **without any backend servers** — powered entirely by **smart contracts + KWALA automation**.

---

## 🧩 Architecture

Frontend (Next.js + Ethers.js)
│
▼
Smart Contract (Solidity)
│
▼
KWALA (Automation Workflows)
├── Telegram Notification Bot
└── Frontend Webhook API

yaml
Copy code

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-------------|
| 🧠 Smart Contracts | Solidity |
| 💻 Frontend | Next.js (App Router), Tailwind, Ethers.js |
| 🤖 Automation | KWALA Workflows |
| 🔐 Wallet | MetaMask / Polygon Amoy |
| 🧩 Hosting | Vercel |
| 🪙 Blockchain | Polygon Amoy Testnet |

---

## 🧱 Smart Contract — `BloodRegistry.sol`

Key functions:
- `createRequest()` → Creates new blood request  
- `expressInterest()` → Donor expresses interest  
- `approveInterest()` → Admin approves donor + mints NFT + emits `RequestApproved` event  
- `LevelUpdated` → Automatically upgrades donor’s level  

---

## 📲 Features

| Category | Description |
|-----------|-------------|
| 🩸 **On-chain Requests** | Every blood request is stored immutably on-chain |
| ❤️ **Verified Donors** | Only approved donors get NFT proof of donation |
| 🧬 **Gamification** | Donors gain XP, levels & badges |
| 🔔 **Live Notifications** | Telegram alerts powered by KWALA |
| 🪩 **NFT Rewards** | Proof-of-donation badges via smart contract |
| 🌐 **Public Leaderboard** | Displays top donors and achievements |
| 🧱 **Serverless Architecture** | No centralized backend — 100% on-chain |

---

## 🚀 Live Demo Links

| Platform | Link |
|-----------|------|
| 🧠 **Admin Dashboard** | [https://blood-dapp-pied.vercel.app/](https://blood-dapp-pied.vercel.app/) |
| ❤️ **Donor Dashboard** | [https://blood-dapp-pied.vercel.app/donor](https://blood-dapp-pied.vercel.app/donor) |
| 🌍 **Public Leaderboard** | [https://blood-dapp-pied.vercel.app/public](https://blood-dapp-pied.vercel.app/public) |


🎥 Video Walkthrough

🎬 Watch the full demo on YouTube:
👉 https://www.youtube.com/watch?v=6ZxVE0Lj13M