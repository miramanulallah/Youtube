# 🎥 YouTube Focus Workspace

A high-performance, distraction-free environment designed for deep learning and intentional content consumption. This isn't just another YouTube wrapper—it's a digital sanctuary that enforces a "Purpose-First" viewing protocol.

## 🧠 Why this exists
We've all been there: you open YouTube to learn a specific skill, and three hours later you're watching a documentary about deep-sea squids. **Focus Workspace** breaks that cycle by requiring you to state your intention before a single frame is played.

## ✨ Key Features

- **Intentional Protocol:** You must declare *why* you are watching a video. The AI evaluates your intent and keeps it visible throughout the session.
- **AI Study Studio:** Powered by Gemini 2.5, generate instant study plans, quizzes, and syntheses of your notes without leaving the workspace.
- **Distraction-Free Player:** A custom-built player interface that strips away recommendations, comments, and the "rabbit hole" sidebar.
- **Voice-to-Note:** Integrated transcription lets you speak your thoughts directly into your workspace notes.
- **Zen Mode:** Support for Cinema Mode and Fullscreen for total immersion.
- **Local Sovereignty:** Your history and watch later lists are stored locally in your browser. No trackers, no bloat.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- A Google Gemini API Key (Gemini 2.5 Flash Lite supported)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/focus-workspace.git
   cd focus-workspace
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your API Key:
   Create a `.env` file or set the environment variable:
   ```env
   API_KEY=your_gemini_api_key_here
   ```

4. Launch the workspace:
   ```bash
   npm run dev
   ```

## 🛠 Tech Stack
- **Framework:** React 19 (TypeScript)
- **Styling:** Tailwind CSS
- **AI:** Google Generative AI (Gemini 2.5)
- **Icons:** Lucide React
- **Build Tool:** Vite

## 📜 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Built for the intentional learner.*