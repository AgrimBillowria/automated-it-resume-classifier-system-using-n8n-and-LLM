# Frontend Won’t Run Locally — Analysis & Fix Prompt

## 1. Where the main problem is

From your project and `resume-classifier-frontend/frontend.log`, the frontend fails locally for at least two reasons:

### A. Port 5173 already in use (Vite fails to start)

- **Evidence:** `frontend.log` shows: `Error: Port 5173 is already in use` when running `npm run dev` (Vite).
- **Cause:** `vite.config.ts` has `strictPort: true`, so Vite does **not** try another port; it exits if 5173 is taken.
- **Typical cases:** A previous run of the dev server or `start_servers.py` left a process on 5173; another app (e.g. another Vite/React app) is using 5173; or the port wasn’t freed before starting the frontend.

### B. Vite starts but file reads time out (ETIMEDOUT)

- **Evidence:** `frontend.log` shows: `Internal server error: ETIMEDOUT: connection timed out, read` in `viteIndexHtmlMiddleware` and `loadAndTransform` (reading from disk).
- **Cause:** Vite’s file reads are timing out (e.g. slow/network drive, antivirus, or resource contention). The dev server may be “running” but requests fail, so the app never loads in the browser.

### C. Backend not reachable (app loads but looks broken)

- **Context:** The frontend calls `http://localhost:5003/stats` and `http://localhost:5003/predict` / `predict_pdf`. If the backend isn’t running or is on a different port, stats and predictions fail and the app appears broken even when the frontend itself runs.

---

## 2. Dedicated prompt to solve it

Copy the block below and use it in Cursor (or with any assistant) to get a concrete fix for “frontend won’t run locally”:

```markdown
**Context:** This is an ML_classifier project. The frontend is a React + Vite app in `resume-classifier-frontend/`. I cannot run the frontend locally: either Vite fails to start or the app doesn’t load / doesn’t work in the browser.

**Evidence from our setup:**
- `resume-classifier-frontend/frontend.log` shows:
  1. "Error: Port 5173 is already in use" when starting the dev server.
  2. "ETIMEDOUT: connection timed out, read" in Vite’s viteIndexHtmlMiddleware and loadAndTransform (file read timeouts).
- `vite.config.ts` has `server: { port: 5173, strictPort: true }`.
- The app is started either by:
  - Running `npm run dev` inside `resume-classifier-frontend/`, or
  - Running the project’s `start_servers.py` (which kills 5003/5173, starts the Flask backend, then runs `npm run dev` in the frontend directory).

**What I need you to do:**
1. **Port 5173 in use:** Make the frontend reliably run locally when 5173 is already in use. Prefer one of:
   - Use a different fixed port (e.g. 5174) in `vite.config.ts` and document it, or
   - Set `strictPort: false` and document that the dev server may use 5174, 5175, etc. if 5173 is taken, or
   - Ensure `start_servers.py` (if used) actually frees 5173 before starting the frontend (e.g. robust kill + short wait) and document how to run frontend-only vs full stack.
2. **ETIMEDOUT file reads:** Reduce or eliminate Vite file read timeouts so the dev server can serve the app. Consider:
   - Increasing any relevant timeouts in the Vite config if the API allows,
   - Excluding the project (or `node_modules`) from antivirus real-time scan if on Windows/macOS,
   - Or suggesting moving the project to a local (non-network) drive if it’s on a network path.
3. **Backend reachability:** Ensure the frontend is configured to talk to the backend (e.g. `http://localhost:5003`) and that running instructions clearly state: “Start the Flask backend (e.g. `python app.py` or `start_servers.py`) so the frontend can load stats and run predictions.”

Apply the minimal code/config changes needed. Update any README or run instructions so that ‘run the frontend locally’ is a single, clear set of steps that work from a clean state (e.g. “kill anything on 5173, then npm run dev” or “run start_servers.py”).
```

---

## 3. Quick reference

| Issue | Location | Fix direction |
|-------|----------|----------------|
| Port 5173 in use | `vite.config.ts` (`strictPort: true`, `port: 5173`) | **Applied:** `strictPort: false` so Vite tries 5174, 5175, … if 5173 is in use. |
| ETIMEDOUT on file read | Vite dev server (middleware/transform) | **Applied:** `server.watch.usePolling: true`. If it persists: move project to a local (non-network) drive; exclude project folder from antivirus real-time scan; on Linux try `ulimit -Sn 10000`. |
| Backend unreachable | `Dashboard.tsx` (`localhost:5003`) | Keep backend running and document; optional: env var for API base URL. |

Use the **Dedicated prompt** (Section 2) in Cursor to get step-by-step changes; use this file as the analysis of where the main problem is.

---

## 4. Reliable way to run the frontend locally (after fixes)

1. **Free port 5173** (if something is still using it):  
   `lsof -ti:5173 | xargs kill -9`
2. **From `resume-classifier-frontend`**, run:  
   `npm run dev:clean`  
   (This clears Vite’s cache so it uses the latest `vite.config.ts`, then starts the dev server. With `strictPort: false`, if 5173 is in use, Vite will use 5174, 5175, etc.)
3. Open the URL Vite prints (e.g. `http://localhost:5173` or `http://localhost:5174`) in your browser.
4. If you still see **ETIMEDOUT** when loading the app, move the project to a local (non-network) drive and/or exclude the project folder from antivirus real-time scanning, then run `npm run dev:clean` again.
