# 💍 Cupid Watch

**Cupid Watch** is a lightweight, real-time web application designed to help you monitor and snag NYC Marriage Ceremony appointment slots. It polls the NYC Clerk Scheduler directly from the backend and provides instant notifications when new slots become available.

<p align="center">
<img width="870" height="484" alt="image" src="https://github.com/user-attachments/assets/0817a31b-9f49-41e0-aedc-9919d70fb9b9" />
</p>

## ✨ Features

- **🚀 Real-time Monitoring**: Automatically checks for new appointment slots every 10 minutes.
- **🔔 Smart Notifications**: 
  - **Browser Alerts**: Get desktop notifications even when the tab is in the background.
  - **Audio Cues**: Optional "beep" alerts so you don't have to watch the screen.
  - **Visual Badges**: New slots are marked with a pulsing "NEW" badge.
- **🌓 Dark Mode**: Fully themed UI with a persistent dark/light mode toggle.
- **📱 Responsive Design**: Built with Next.js and Tailwind CSS for a seamless experience on desktop and mobile.
- **🛠️ Self-Contained Backend**: Communicates directly with the NYC Clerk API using native Node.js fetching (no external scripts required).

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm

### Installation

Install dependencies:
```bash
npm install
```

### Running the App

Start the development server:
```bash
npm run dev
```

Start the development server with the network flag for external access:
```bash
npm run dev:network
```
Open [http://localhost:3000](http://localhost:3000) in your browser to start monitoring.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Data Fetching**: [SWR](https://swr.vercel.app/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: Heroicons / Custom SVG

---
Created with ❤️ by Matthew Huie
