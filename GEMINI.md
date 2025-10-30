## 🧠 Project: Scrum Report Builder

### 📘 Overview

**Scrum Report Builder** is an Electron + React (Vite) desktop app designed to help developers, testers, or project managers **quickly log daily work summaries**, calculate effective work hours, and export the summary as `.txt` or `.md` files for archival or reporting.

The app provides a sleek UI with time tracking, work logs, and theme toggling — all in a **single-page lightweight app** built with **Tailwind CSS**, **shadcn/ui**, and **Electron’s native file I/O**.

---

### ⚙️ Tech Stack

| Component                             | Purpose                                       |
| ------------------------------------- | --------------------------------------------- |
| **React (Vite)**                      | Frontend rendering and interaction            |
| **Electron**                          | Desktop wrapper and file handling             |
| **Tailwind CSS**                      | Styling and responsive UI                     |
| **shadcn/ui**                         | UI components (Button, Card, Textarea)        |
| **Node.js fs + path**                 | File creation and storage                     |
| **IPC (inter-process communication)** | Bridges frontend and backend for file exports |

---

### 🖥️ App Flow

1. **UI Layer (`App.jsx`)**

   * Displays input fields for:

     * `IN` time
     * `BREAK` start/end
     * `OUT` time
     * `Tasks Worked On`
     * `Will Work On`
   * Includes a theme toggle (Light / Dark / System)
   * Has two buttons:

     * `Save Status` → Logs entered data to console (for preview)
     * `Export as .txt / .md` → Sends entered data to Electron main process via `window.api.exportFile()`

2. **Bridge Layer (`preload.js`)**

   * Safely exposes a minimal API surface via `contextBridge`.
   * Contract (recommended):

     ```js
     // preload.js
     const { contextBridge, ipcRenderer } = require('electron')

     // Expose a single, well-documented method.
     contextBridge.exposeInMainWorld('api', {
       // Accepts: { inTime, breakStart, breakEnd, outTime, tasksWorkedOn, willWorkOn, date? }
       // Returns: Promise<{ txtPath: string, mdPath: string }>
       exportFile: (data) => ipcRenderer.invoke('export-worklog', data)
     })
     ```

   * Note: only expose functions you actually need. Keep the surface minimal for security.

3. **Backend Layer (`main.cjs`)**

   * Creates the app window via Electron’s `BrowserWindow`.
   * Handles the `export-worklog` IPC invocation with `ipcMain.handle`.
   * On invocation the main process should:

     * Validate and sanitize incoming data.
     * Build a formatted `.txt` and `.md` report.
     * Calculate total work duration (minus break time) using a robust date library or well-tested logic.
     * Format times in **12-hour AM/PM** format for display (keep ISO or machine-friendly format for filenames/storage).
     * Save files to the user's Documents folder (cross-platform) and return the paths.

     Use the platform-agnostic Documents path instead of hardcoding Windows paths. Example:

     ```js
     // Use Electron API to find the user's Documents folder
     const docs = app.getPath('documents')
     const outDir = path.join(docs, 'WorkLogs')
     await fs.mkdir(outDir, { recursive: true })
     ```

---

### 🧮 File Export Logic

#### 🧩 Steps

1. **Receive user input** (renderer → preload → main)

   ```js
   { inTime, breakStart, breakEnd, outTime, tasksWorkedOn, willWorkOn, date? }
   ```

2. **Compute total working hours**

   * Parse time strings into Date/Duration objects (recommend `date-fns` or `luxon`) and compute:

   ```js
   // pseudocode (use a robust date library in production)
   total = (outTime - inTime) - (breakEnd - breakStart)
   ```

3. **Format to 12-hour time**
   Example: `13:45 → 1:45 PM` (display-only)

4. **Generate formatted text content**

   ```text
   Work Status [30-10-2025]
   ===================
   Yesterday
   IN: 10:14 AM
   OUT: 7:14 PM
   BREAK: 1:42 PM - 2:42 PM
   --------------------------------
   * Worked on module integration
   * Fixed login API errors

   Today
   --------------------------------
   * Complete deployment script
   * QA for user dashboard

   Total Work Hours: 8h 0m
   ```

5. **Save both** (filenames should be sanitized):

   ```
   Work_Status_30-10-2025.txt
   Work_Status_30-10-2025.md
   ```

---

### 🧾 File Structure (example)

```
Scrum_Report_Builder/
│
├── main.cjs              # Electron main process (handles file saving)
├── preload.js            # Secure bridge for IPC
├── package.json
├── vite.config.js
│
├── /dist/                # Production build output
│   └── index.html
│
├── /src/
│   ├── App.jsx           # Main React component
│   └── main.jsx          # React entry point
│
└── Documents/WorkLogs/   # Auto-created export directory
    ├── Work_Status_30-10-2025.txt
    └── Work_Status_30-10-2025.md
```

---

### 🎨 UI Summary

| Section         | Description                                                |
| --------------- | ---------------------------------------------------------- |
| **Header**      | App name + theme toggle button                             |
| **Time Inputs** | IN, BREAK, OUT with responsive layout                      |
| **Task Areas**  | Textareas for “Tasks Worked On” and “Will Work On”         |
| **Buttons**     | “Save Status” (logs) & “Export as .txt / .md” (saves file) |
| **Responsive**  | Input cards resize smoothly with the window                |

---

### 🧰 Future Enhancements

* ⏱️ Auto-calculate and display total work hours live on the UI
* 🧾 Include weekly summary mode (combine multiple logs)
* ☁️ Export to Google Drive or OneDrive
* 📆 Add date selector for backdated entries
* 📊 Generate charts for productivity overview

---

### 🪶 Author Notes

Built for internal team reporting — no third-party API dependencies. Focus: fast local use, clean UI, no internet requirement.

``` 

