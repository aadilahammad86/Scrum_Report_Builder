import { useState, useEffect } from "react";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Sun, Moon, Laptop, Clock, FileText, ChevronRight, History, PanelLeftClose, PanelLeftOpen, Calendar, Plus } from "lucide-react";

// Helper to convert 12h time (e.g. "02:30 PM") to 24h (e.g. "14:30") for input fields
const convert12to24 = (time12h) => {
  if (!time12h) return "";
  const [time, modifier] = time12h.split(" ");
  let [hours, minutes] = time.split(":");
  if (hours === "12") {
    hours = modifier === "PM" ? "12" : "00";
  } else if (modifier === "PM") {
    hours = parseInt(hours, 10) + 12;
  }
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
};

function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center bg-primary text-primary-foreground px-4 py-1 rounded-md shadow-sm">
      <div className="text-lg font-bold leading-none tracking-wider font-mono">
        {time.toLocaleTimeString('en-GB', { hour12: false })}
      </div>
      <div className="text-[10px] opacity-90 uppercase tracking-widest mt-0.5">
        {time.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
      </div>
    </div>
  );
}

export default function ScrumBuilder() {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "system");

  // Form State
  const [reportDate, setReportDate] = useState(new Date());
  const [inTime, setInTime] = useState("");
  const [breakStart, setBreakStart] = useState("");
  const [breakEnd, setBreakEnd] = useState("");
  const [outTime, setOutTime] = useState("");
  const [tasksWorkedOn, setTasksWorkedOn] = useState("");
  const [willWorkOn, setWillWorkOn] = useState("");

  // App State
  const [history, setHistory] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isViewingHistory, setIsViewingHistory] = useState(false); // Track if we are viewing a history file

  // Helper to check if reportDate is today
  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const handleGoToToday = () => {
    const today = new Date();
    setReportDate(today);
    // Load from localstorage to restore draft
    const saved = JSON.parse(localStorage.getItem("scrumData")) || {};
    setInTime(saved.inTime || "");
    setBreakStart(saved.breakStart || "");
    setBreakEnd(saved.breakEnd || "");
    setOutTime(saved.outTime || "");
    setTasksWorkedOn(saved.tasksWorkedOn || "");
    setWillWorkOn(saved.willWorkOn || "");

    setIsViewingHistory(false);
  };

  // === THEME HANDLER ===
  useEffect(() => {
    const root = window.document.documentElement;
    const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = (newTheme) => {
      root.classList.remove("light", "dark");
      if (newTheme === "system") {
        const isSystemDark = systemThemeQuery.matches;
        root.classList.add(isSystemDark ? "dark" : "light");
      } else {
        root.classList.add(newTheme);
      }
      localStorage.setItem("theme", newTheme);
      setTheme(newTheme);
    };

    const handleSystemChange = () => {
      if (theme === "system") applyTheme("system");
    };

    systemThemeQuery.addEventListener("change", handleSystemChange);
    applyTheme(theme);
    return () => systemThemeQuery.removeEventListener("change", handleSystemChange);
  }, [theme]);

  const getNextTheme = () => {
    if (theme === "light") return "dark";
    if (theme === "dark") return "system";
    return "light";
  };

  // === DATA LOADING & HISTORY ===
  const refreshHistory = async () => {
    if (window.api && window.api.getHistory) {
      const logs = await window.api.getHistory();
      setHistory(logs);
    }
  };

  useEffect(() => {
    // Initial Load
    const saved = JSON.parse(localStorage.getItem("scrumData")) || {};
    setInTime(saved.inTime || "");
    setBreakStart(saved.breakStart || "");
    setBreakEnd(saved.breakEnd || "");
    setOutTime(saved.outTime || "");
    setTasksWorkedOn(saved.tasksWorkedOn || "");
    setWillWorkOn(saved.willWorkOn || "");

    refreshHistory();
  }, []);

  // Autosave current work to localStorage (ONLY if NOT viewing history)
  useEffect(() => {
    if (!isViewingHistory) {
      localStorage.setItem(
        "scrumData",
        JSON.stringify({ inTime, breakStart, breakEnd, outTime, tasksWorkedOn, willWorkOn })
      );
    }
  }, [inTime, breakStart, breakEnd, outTime, tasksWorkedOn, willWorkOn, isViewingHistory]);

  const handleHistoryClick = async (filePath) => {
    if (!window.api.readWorklog) return;
    const content = await window.api.readWorklog(filePath);
    if (!content) return;

    setIsViewingHistory(true); // Mark as viewing history

    // Parsing Logic (Best Effort)
    // Regex for 12h time: \d{1,2}:\d{2} [AP]M
    const inMatch = content.match(/IN: (\d{1,2}:\d{2} [AP]M)/);
    const outMatch = content.match(/OUT: (\d{1,2}:\d{2} [AP]M)/);
    const breakMatch = content.match(/BREAK: (\d{1,2}:\d{2} [AP]M) - (\d{1,2}:\d{2} [AP]M)/);

    if (inMatch) setInTime(convert12to24(inMatch[1]));
    if (outMatch) setOutTime(convert12to24(outMatch[1]));
    if (breakMatch) {
      setBreakStart(convert12to24(breakMatch[1]));
      setBreakEnd(convert12to24(breakMatch[2]));
    }

    // Task parsing
    // Split by "Yesterday", "Today", "Total Work Hours" to isolate sections
    const parts = content.split("--------------------------------");
    // Ensure we have enough parts. Typical structure:
    // Header...
    // Yesterday... break...
    // --- [1] tasks worked on ---
    // Today
    // --- [2] will work on ---
    // Total Work Hours...

    // A safer split might be better based on known headers
    const yesterdayIdx = content.indexOf("Yesterday");
    const todayIdx = content.indexOf("Today");
    const totalIdx = content.indexOf("Total Work Hours");

    if (yesterdayIdx !== -1 && todayIdx !== -1) {
      let workedSection = content.substring(yesterdayIdx, todayIdx);
      // simple cleanup: remove 'Yesterday', 'IN...', 'OUT...', 'BREAK...', dashed lines
      workedSection = workedSection.split("\n").filter(line => line.trim().startsWith("*")).map(l => l.replace(/^\* /, "")).join("\n");
      setTasksWorkedOn(workedSection);
    }

    if (todayIdx !== -1) {
      let willSection = content.substring(todayIdx, totalIdx !== -1 ? totalIdx : content.length);
      willSection = willSection.split("\n").filter(line => line.trim().startsWith("*")).map(l => l.replace(/^\* /, "")).join("\n");
      setWillWorkOn(willSection);
    }
  };

  // === EXPORT HANDLER ===
  const performExport = async (action) => {
    const exportResult = await window.api.exportFile({
      inTime,
      breakStart,
      breakEnd,
      outTime,
      tasksWorkedOn,
      willWorkOn,
      date: reportDate // Pass current report date
    });

    if (exportResult) {
      if (action === "NEXT") {
        // Move to next day
        const nextDay = new Date(reportDate);
        nextDay.setDate(nextDay.getDate() + 1);
        setReportDate(nextDay);

        // Clear fields
        setInTime("");
        setBreakStart("");
        setBreakEnd("");
        setOutTime("");
        setTasksWorkedOn("");
        setWillWorkOn("");

        alert(`✅ Exported! Moving to ${nextDay.toLocaleDateString()}`);
      } else {
        alert(`✅ Exported successfully!`);
      }
      refreshHistory(); // Update sidebar
    }
    setShowExportModal(false);
  };

  return (
    <div className="flex h-screen w-screen bg-background text-foreground transition-colors overflow-hidden font-sans">

      {/* SIDEBAR */}
      <aside
        className={`bg-card/50 border-r border-border flex flex-col flex-shrink-0 backdrop-blur-sm transition-all duration-300 ease-in-out ${isSidebarCollapsed ? "w-16" : "w-64"
          }`}
      >
        <div className={`p-4 border-b border-border flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"}`}>
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <History className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <h2 className="font-semibold text-lg truncate">History</h2>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </Button>
        </div>

        {/* NEW SCRUM BUTTON */}
        <div className="p-2 pb-0">
          <Button
            className={`w-full ${isSidebarCollapsed ? "px-0 justify-center" : "justify-start gap-2"}`}
            onClick={handleGoToToday} // Resets form and sets date to today
            title="New Scrum"
          >
            <Plus className="w-4 h-4" />
            {!isSidebarCollapsed && <span>New Scrum</span>}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {history.length === 0 && !isSidebarCollapsed && (
            <div className="text-sm text-muted-foreground text-center mt-10">No logs found.</div>
          )}
          {history.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleHistoryClick(item.path)}
              className={`w-full text-left rounded-md hover:bg-accent/50 transition-colors group flex items-center ${isSidebarCollapsed ? "justify-center p-2" : "px-3 py-2 flex-col gap-0.5"
                }`}
              title={isSidebarCollapsed ? `${item.dateStr} - ${item.filename}` : ""}
            >
              {isSidebarCollapsed ? (
                <FileText className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              ) : (
                <>
                  <span className="font-medium text-sm group-hover:text-primary transition-colors">{item.dateStr}</span>
                  <span className="text-xs text-muted-foreground truncate opacity-70 w-full">{item.filename}</span>
                </>
              )}
            </button>
          ))}
        </div>

        {/* SIDEBAR FOOTER - GO TO TODAY */}
        {(!isToday(reportDate) || isViewingHistory) && (
          <div className="p-2 border-t border-border">
            <Button
              variant="secondary"
              className={`w-full ${isSidebarCollapsed ? "px-0 justify-center" : "justify-start gap-2"}`}
              onClick={handleGoToToday}
              title="Go to Current Day"
            >
              <Calendar className="w-4 h-4" />
              {!isSidebarCollapsed && <span>Go to Today</span>}
            </Button>
          </div>
        )}
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-full relative">

        {/* HEADER */}
        <header className="h-16 border-b border-border flex items-center justify-between px-6 flex-shrink-0 bg-background/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-6">
            <LiveClock />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold tracking-tight">SCRUM BUILDER</h1>
              <span className="text-xs text-muted-foreground font-medium">
                Report Date: {reportDate.toLocaleDateString("en-GB", { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setTheme(getNextTheme())}>
            {theme === "light" && <Sun className="h-5 w-5" />}
            {theme === "dark" && <Moon className="h-5 w-5" />}
            {theme === "system" && <Laptop className="h-5 w-5" />}
          </Button>
        </header>

        {/* SCROLLABLE FORM AREA */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto space-y-6 pb-20">

            {/* TIME INPUTS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* IN */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-muted-foreground">IN TIME</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="time"
                    value={inTime}
                    onChange={(e) => setInTime(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm pl-9 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              {/* BREAK */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-muted-foreground">BREAK (START - END)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="time"
                    value={breakStart}
                    onChange={(e) => setBreakStart(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                  <span className="text-muted-foreground">-</span>
                  <input
                    type="time"
                    value={breakEnd}
                    onChange={(e) => setBreakEnd(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </div>

              {/* OUT */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-muted-foreground">OUT TIME</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="time"
                    value={outTime}
                    onChange={(e) => setOutTime(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm pl-9 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* TEXT AREAS */}
            <div className="grid gap-6">
              <Card className="shadow-sm border-muted/40">
                <CardContent className="p-4 space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> TASKS WORKED ON
                  </label>
                  <Textarea
                    rows={6}
                    value={tasksWorkedOn}
                    onChange={(e) => setTasksWorkedOn(e.target.value)}
                    placeholder="- Fixed login bug&#10;- Updated UI components..."
                    className="resize-none font-mono text-sm leading-relaxed"
                  />
                </CardContent>
              </Card>

              <Card className="shadow-sm border-muted/40">
                <CardContent className="p-4 space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> WILL WORK ON
                  </label>
                  <Textarea
                    rows={6}
                    value={willWorkOn}
                    onChange={(e) => setWillWorkOn(e.target.value)}
                    placeholder="- Integration testing&#10;- Deploy to staging..."
                    className="resize-none font-mono text-sm leading-relaxed"
                  />
                </CardContent>
              </Card>
            </div>

            {/* ACTION BAR */}
            <div className="flex items-center justify-end gap-4 pt-4">
              <Button
                variant="secondary"
                onClick={() => console.log({ reportDate, inTime, breakStart, breakEnd, outTime, tasksWorkedOn, willWorkOn })}
              >
                Log to Console
              </Button>
              <Button size="lg" onClick={() => setShowExportModal(true)}>
                Export Report
              </Button>
            </div>

          </div>
        </div>

        {/* MODAL OVERLAY */}
        {showExportModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border p-6 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-center mb-6">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Export Work Log</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Report for <span className="font-medium text-foreground">{reportDate.toLocaleDateString()}</span> is ready. <br />What would you like to do next?
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  className="w-full relative overflow-hidden"
                  onClick={() => performExport("NEXT")}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Move to Next Day <ChevronRight className="w-4 h-4" />
                  </span>
                  <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
                </Button>
                <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-medium">or</p>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => performExport("STAY")}
                >
                  Stay on Current Day
                </Button>
                <Button
                  variant="ghost"
                  className="mt-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowExportModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
