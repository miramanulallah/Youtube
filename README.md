# YouTube Focus Workspace

I built this because I kept losing hours to the YouTube algorithm. You go in for a 5-minute tutorial and come out 2 hours later having learned nothing useful. This workspace is a tool to help you stay intentional.

## How it works
The core idea is simple: you can't watch a video until you tell the app exactly why you're watching it. 

1. **State your Purpose:** Paste a link and type out your goal. 
2. **Intent Check:** The built-in AI (Gemini) checks if your goal makes sense for that video.
3. **Pure Focus:** Once you start, all the distractions (comments, sidebars, recommended videos) are gone. It's just you and the video in a clean "Cinema Mode" interface.
4. **Active Learning:** There's a side panel for notes. You can use your voice to dictate notes, and the AI can help you turn those notes into a study plan or a quick quiz.

## Tech stuff
- **React 19** for the UI.
- **Gemini 2.5 (Flash Lite)** handles the intent checking and study aids.
- **Tailwind** for the styling.
- **YouTube IFrame API** for the custom player.

Everything is stored locally in your browser. No accounts, no tracking.

## Setup
1. Clone this repo.
2. Run `npm install`.
3. You'll need a Google Gemini API key. Put it in your environment variables as `API_KEY`.
4. Run `npm run dev` to start it up.

## License
This project is under the MIT License. See the LICENSE file for the full text.

Built for people who want to actually learn from the internet instead of just consuming it.