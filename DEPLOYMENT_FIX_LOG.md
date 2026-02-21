# Local Deployment & Debugging Log

**Date:** February 17, 2026
**Objective:** Execute the ML Classifier project and deploy it locally.

## Executive Summary
The project faced multiple startup hurdles on macOS, preventing the frontend from loading and causing the startup script to fail. We diagnosed these issues as a combination of resource locks (zombie processes), strict timeouts, file system watcher limitations, and a mismatch between "development" and "deployment" configurations. 

We successfully resolved these by implementing robust process cleanup, relaxing timeouts, configuring file polling, and consolidating the architecture to serve the frontend directly from the Flask backend.

---

## Detailed Issue Breakdown & Solutions

### 1. The "Zombie" Process Issue (Port Conflicts)
**The Problem:**
During initial attempts to run the project, previous instances of the backend (Flask) and frontend (Vite) servers were not shutting down cleanly. This left ports `5003` and `5173` occupied ("Address already in use"). New startup attempts would fail immediately because they couldn't bind to the required ports.

**The Solution:**
*   **Manual Cleanup:** We used `lsof -ti:5003 | xargs kill -9` and `lsof -ti:5173 | xargs kill -9` to forcefully terminate all lingering processes.
*   **Clean Startup Command:** We updated the project usage to ensure ports are checked and cleared before attempting to start servers.

### 2. Frontend Startup Timeout
**The Problem:**
The `start_servers.py` script was configured with a **30-second timeout** for the frontend. On this specific macOS environment, the initial Vite build and dependency optimization took closer to **60 seconds**.
*   *Evidence:* The script would print "Frontend failed to start" and terminate the process just as the frontend was finalizing its boot sequence.

**The Solution:**
*   We increased the startup timeout in `start_servers.py` from **30s to 60s**.
*   We switched the startup command to `npm run dev:clean` to force a clean cache, preventing corrupted cache files from hanging the build endlessly.

### 3. File Watching Errors (ETIMEDOUT)
**The Problem:**
Vite's default file watcher (`fsevents` on macOS) encountered `ETIMEDOUT` errors. This is a common issue on macOS when a tool tries to watch a large number of files (like `node_modules`) and the operating system limits or delays the resource requests, causing the server to crash or hang.

**The Solution:**
*   We modified `resume-classifier-frontend/vite.config.ts` to enable **Polling**:
    ```typescript
    server: {
        watch: {
            usePolling: true,
        }
    }
    ```
    *Why this works:* Instead of relying on the OS to notify it of changes (which was failing), Vite now actively checks files for changes. This is slightly more resource-intensive but significantly more robust.

### 4. "Deployment" Architecture
**The Problem:**
The user requested to "deploy" the project locally. The original setup ran two separate servers (Flask on 5003, Vite on 5173) which is a **Development** setup, not a deployed one. A true deployment should be a single unified application.

**The Solution:**
We transitioned the project to a production-ready local deployment:
1.  **Build:** We compiled the React frontend into static HTML/CSS/JS files using `npm run build`. This created a `dist/` folder.
2.  **Serve:** We reconfigured the Flask backend (`app.py`) to serve these static files:
    *   `app = Flask(__name__, static_folder='resume-classifier-frontend/dist')`
3.  **Routing:** We added a "catch-all" route in Flask to handle Single Page Application (SPA) routing. This ensures that if a user visits `/dashboard` directly, Flask serves `index.html` so React can handle the route client-side.

---

## Current Status & How to Run

The project is now stable and deployed locally.

**To Run the Deployed Version:**
```bash
python app.py
```
*   **Access:** Open [http://localhost:5003](http://localhost:5003)
*   **Architecture:** Flask serves both the API and the React Frontend. No separate Node.js server is required.

**To Run in Development Mode (for editing code):**
```bash
python start_servers.py
```
*   **Access:** Open [http://localhost:5173](http://localhost:5173)
*   **Architecture:** Runs Flask (5003) and Vite (5173) separately with Hot Module Replacement (HMR) enabled.
