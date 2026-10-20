# Identity Prompt Studio — Vercel-ready version (2026)

This folder is the **Vercel adaptation** of Identity Prompt Studio. It is not the earlier Render/Python or Cloudflare Workers version. It has been tested locally with simulated OpenAI responses, but the actual live Vercel deployment has not yet been verified.

## Step 1 — Upload this version to your existing GitHub repository

1. Extract `Identity-Prompt-Studio-Vercel-Ready.zip`.
2. In GitHub, open your existing repository `identity-prompt-studio`.
3. Choose **Add file > Upload files**. Drag all extracted files and folders to the GitHub upload area. **Do not upload the ZIP itself.**
4. Check that these paths exist at the repository root (not inside an additional nested folder):

   - `api/index.js`
   - `lib/worker-core.js`
   - `private/index.html`, `private/app.js`, `private/style.css`
   - `public/robots.txt`
   - `vercel.json`
   - `package.json`

5. Click **Commit changes**. Old `server.py`, `render.yaml` and `wrangler.jsonc` may remain: Vercel will not use them. The old root-level `index.html` may remain because the actual Vercel app uses the `private/` folder and its Vercel function. You can clean up old files after verifying deployment.

**Never add your `OPENAI_API_KEY`, `SITE_PASSWORD`, source photos, or target photos to GitHub.**

## Step 2 — Create a Vercel Hobby project

1. Visit **https://vercel.com/new** and sign in with GitHub (the Hobby plan is free for **personal, noncommercial use**).
2. Click **Add New > Project** or **Import Git Repository**.
3. Locate and import `identity-prompt-studio`. If it is missing, choose **Adjust GitHub App Permissions** and enable that repository.
4. Set **Project Name** to `identity-prompt-studio` or another available name.
5. For **Framework Preset**, choose **Other**. Vercel also reads `vercel.json` in the project.
6. **Root Directory:** leave as `./` (repository root).
7. **Build Command:** leave the override **OFF** or leave it blank. No npm build command is needed.
8. **Output Directory:** use the default. The only truly public static file is `public/robots.txt`; the application pages live in `private/` and are served through a protected Vercel Function.
9. Open the **Environment Variables** section and add:

   - Key: `SITE_PASSWORD` / Value: **your new private password with 12+ characters**.
   - Optional key: `OPENAI_API_KEY` / Value: **your new OpenAI API key starting with `sk-`**.

10. Click **Deploy**. Wait for the page confirming a successful deployment.

**Important:** A previously exposed OpenAI API key must be revoked and replaced before use. Vercel free hosting does not include OpenAI API credits. Do not send screenshots that reveal secrets.

## Step 3 — Open and test

1. Click the domain Vercel provides (typically `https://<project-name>.vercel.app`).
2. Browser login: **username `studio`**, **password your `SITE_PASSWORD`**.
3. Add 1–4 identity photos and one target photo.
4. If `OPENAI_API_KEY` is set in Vercel, click **Generate identity-locked JSON** for actual image analysis. Without the key, you can still generate a generic offline template.
5. You can copy/download JSON. You must attach the original source and target images alongside the JSON in your final image generator.

## Troubleshooting

- **503 setup error:** `SITE_PASSWORD` isn't set or is shorter than 12 characters. Go to **Vercel Project > Settings > Environment Variables**. Add it, then redeploy from the **Deployments** tab. Select the latest deployment > Redeploy.
- **401 login request:** Enter username `studio`, and the exact password from `SITE_PASSWORD`. If you changed the password, redeploy and use a private/incognito tab to avoid stored Basic Auth credentials.
- **404 or asset-missing error:** Check `api/index.js`, `lib/worker-core.js`, `private/` and `vercel.json` are at the repository root and the correct latest commit is deployed. The function packaging uses `includeFiles` to bundle the protected UI.
- **413 FUNCTION_PAYLOAD_TOO_LARGE:** Vercel has a hard 4.5MB Function request limit. This version automatically recompresses photos below 3.9MiB. Try fewer reference photos or crop very detailed uploads.
- **AI says no API key:** Set a fresh `OPENAI_API_KEY` in Vercel Environment Variables and redeploy.
- **AI returns 401 from OpenAI:** The stored key is incorrect or revoked.
- **AI says insufficient quota:** Add credits to the OpenAI API billing account; ChatGPT Plus does not include API usage credits.
- **Function timeout:** Retry with 1–2 photos. Vercel Hobby caps the function runtime; `vercel.json` configures up to 60s here.
- **Framework appears as Python:** Change Framework Preset to **Other** and make sure Vercel deploys the new `vercel.json` and `package.json`.

## What's inside and why

- `api/index.js` — Vercel serverless endpoint and protected UI file delivery
- `lib/worker-core.js` — prompt analysis, identity-lock JSON, authentication
- `private/` — your HTML/CSS/JS; not publicly served as static assets
- `public/robots.txt` — keeps Vercel from serving root source files as static assets
- `vercel.json` — rewrite rules, function asset bundling, function timeout
- `package.json` — Node project metadata; no paid dependencies
- `test/vercel.test.js` — local automated API and security tests

Image files are only held temporarily by the browser and transported via Vercel to OpenAI on request. The app itself does not persist uploads or generated JSON in a database. Vercel and OpenAI do process the request. A password does not offer the same protections as a full multi-user authentication system. This is intended for a private personal tool, not a public image-generation business.

The JSON prompt enforces strong identity rules but cannot guarantee perfect face preservation from a downstream image generator.
