# Teacher Fairy — Deploy Pack

Drop these files into your project folder (same level as `package.json`).

## Netlify
1) Go to https://app.netlify.com → **Add new site** → **Import from Git** (or **Deploy manually** for drag & drop).
2) If importing from GitHub:
   - Ensure the repo contains this `netlify.toml`.
   - Build command: `npm run build`
   - Publish directory: `dist`
3) If deploying manually:
   - Run locally: `npm install && npm run build`
   - Drag the generated `dist/` folder onto Netlify **Deploys** page.

## Vercel
1) Go to https://vercel.com → **New Project** → import your repo.
2) Vercel detects Vite automatically. If prompted, set:
   - Build command: `npm run build`
   - Output directory: `dist`
3) To deploy without Git, use **Vercel CLI**:
   ```bash
   npm i -g vercel
   vercel
   ```

## Notes
- These configs assume a standard Vite build that outputs to `dist`.
- For Google Drive features, you'll still add your API keys in `src/App.tsx` per the README.
- For single-page app routing, both configs route all paths to `index.html`.
