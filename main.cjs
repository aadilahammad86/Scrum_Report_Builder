const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require("fs");
const path = require('path');

// Determine if we are in development mode
// const isDev = process.env.NODE_ENV !== 'production';

function createWindow() {
  const win = new BrowserWindow({
    width: 750, // Changed from 400
    height: 850, // Changed from 600
    resizable: true, // Ensure the window is resizable
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });
  // Load from Vite dev server in development, or from the built file in production
  // if (isDev) {
  //   win.loadURL('http://localhost:5173');
  //   // Optional: Open DevTools automatically in development
  //   win.webContents.openDevTools();
  // } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  // }
}
// ===============================
// 📁 FILE EXPORT HANDLER
// ===============================
ipcMain.handle("export-worklog", async (event, data) => {
  try {
    const { inTime, breakStart, breakEnd, outTime, tasksWorkedOn, willWorkOn } = data;

    const today = new Date();
    const dateStr = today.toLocaleDateString("en-GB").replace(/\//g, "-"); // DD-MM-YYYY

    const baseDir = path.join(process.env.HOME || process.env.USERPROFILE, "Documents", "WorkLogs");
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

    // 🧮 --- Time Calculation Helper ---
    function calculateWorkHours(inT, outT, breakS, breakE) {
      const toDate = (t) => {
        const [h, m] = t.split(":").map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        return d;
      };

      const inDate = toDate(inT);
      const outDate = toDate(outT);
      const breakStartDate = toDate(breakS);
      const breakEndDate = toDate(breakE);

      const totalMs = outDate - inDate - (breakEndDate - breakStartDate);
      const hrs = Math.floor(totalMs / (1000 * 60 * 60));
      const mins = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hrs}h ${mins}m`;
    }

    const totalHours = calculateWorkHours(inTime, outTime, breakStart, breakEnd);

    // 🕑 --- Format to 12-hour (AM/PM) ---
    function formatTime12h(t) {
      const [h, m] = t.split(":").map(Number);
      const suffix = h >= 12 ? "PM" : "AM";
      const hour12 = h % 12 || 12;
      return `${hour12}:${m.toString().padStart(2, "0")} ${suffix}`;
    }

    const header = `Work Status [${dateStr}]\n===================\n`;
    const yesterdaySection = `Yesterday\nIN: ${formatTime12h(inTime)}\nOUT: ${formatTime12h(outTime)}\nBREAK: ${formatTime12h(breakStart)} - ${formatTime12h(breakEnd)}\n--------------------------------\n${tasksWorkedOn
      .split("\n")
      .map((t) => `* ${t}`)
      .join("\n")}\n\n`;
    const todaySection = `Today\n--------------------------------\n${willWorkOn
      .split("\n")
      .map((t) => `* ${t}`)
      .join("\n")}\n\nTotal Work Hours: ${totalHours}\n`;

    const txtContent = `${header}${yesterdaySection}${todaySection}`;
    const mdContent = txtContent;

    fs.writeFileSync(path.join(baseDir, `Work_Status_${dateStr}.txt`), txtContent);
    fs.writeFileSync(path.join(baseDir, `Work_Status_${dateStr}.md`), mdContent);

    return path.join(baseDir, `Work_Status_${dateStr}.txt`);
  } catch (err) {
    console.error("Error exporting worklog:", err);
    return null;
  }
});

// ===============================
// 🚀 APP INITIALIZATION
// ===============================
app.whenReady().then(createWindow);
