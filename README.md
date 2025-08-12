# Teacher Fairy — Full MVP (Deployable)

This is a deployable Vite + React + TypeScript project of the **full** Teacher Fairy MVP (Path A), including:
- Multi-slot uploads (docs & pictures), date/topic fields
- Standards import/export (JSON) and suggestions by topic/search
- Daily, Weekly, and Unit plan generation
- Export each plan to **Word (.doc)**
- Google Drive backup/restore scaffolding + folder choice + auto-backup w/ countdown

## Quick start
1. Install Node.js (LTS) from https://nodejs.org
2. Unzip, open terminal in the folder, then run:
   ```bash
   npm install
   npm run dev
   ```
3. App opens at `http://localhost:5173`.

## Google Drive setup (optional, for cloud backup)
1. Create a project at Google Cloud Console, enable **Drive API**.
2. Create **OAuth Client ID** (Web) and **API Key**.
3. In `src/App.tsx`, fill in:
   ```ts
   API_KEY: "YOUR_GOOGLE_API_KEY_HERE",
   CLIENT_ID: "YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com",
   ```
4. Reload the app → Connect Drive → Choose Drive Folder → Backup/Restore.

If you want me to publish this to Netlify/Vercel for you, just say the word.
