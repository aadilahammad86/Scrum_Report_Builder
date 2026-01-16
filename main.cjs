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
    const { inTime, breakStart, breakEnd, outTime, tasksWorkedOn, willWorkOn, date } = data;

    let dateStr;
    if (date) {
      // expect date in YYYY-MM-DD or comparable format, but let's stick to the requested DD-MM-YYYY for display
      // If the incoming 'date' is a Date object or ISO string, parse it.
      // Assuming 'date' is passed as a string or Date from frontend.
      const d = new Date(date);
      dateStr = d.toLocaleDateString("en-GB").replace(/\//g, "-");
    } else {
      const today = new Date();
      dateStr = today.toLocaleDateString("en-GB").replace(/\//g, "-"); // DD-MM-YYYY
    }

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
// ===============================
// 📜 HISTORY HANDLERS
// ===============================
ipcMain.handle("get-history", async () => {
  try {
    const baseDir = path.join(process.env.HOME || process.env.USERPROFILE, "Documents", "WorkLogs");
    if (!fs.existsSync(baseDir)) return [];

    const files = fs.readdirSync(baseDir).filter(f => f.startsWith("Work_Status_") && f.endsWith(".txt"));

    // Sort by date descending (newest first)
    // Filename format: Work_Status_DD-MM-YYYY.txt
    const history = files.map(file => {
      const datePart = file.replace("Work_Status_", "").replace(".txt", "");
      // Parse DD-MM-YYYY to Date object for sorting
      const [d, m, y] = datePart.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      return {
        filename: file,
        dateStr: datePart, // DD-MM-YYYY
        dateObj: dateObj.getTime(), // Timestamp for easier sorting
        path: path.join(baseDir, file)
      };
    }).sort((a, b) => b.dateObj - a.dateObj);

    return history;
  } catch (err) {
    console.error("Error fetching history:", err);
    return [];
  }
});

ipcMain.handle("read-worklog", async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, "utf-8");
    }
    return null;
  } catch (err) {
    console.error("Error reading worklog:", err);
    return null;
  }
});

app.whenReady().then(createWindow);
