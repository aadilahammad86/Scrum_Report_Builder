import { useState, useEffect } from "react";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Sun, Moon, Laptop } from "lucide-react";

export default function ScrumBuilder() {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "system");

  const [inTime, setInTime] = useState("");
  const [breakStart, setBreakStart] = useState("");
  const [breakEnd, setBreakEnd] = useState("");
  const [outTime, setOutTime] = useState("");
  const [tasksWorkedOn, setTasksWorkedOn] = useState("");
  const [willWorkOn, setWillWorkOn] = useState("");

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

  // === LOCAL STORAGE PERSISTENCE ===
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("scrumData")) || {};
    setInTime(saved.inTime || "");
    setBreakStart(saved.breakStart || "");
    setBreakEnd(saved.breakEnd || "");
    setOutTime(saved.outTime || "");
    setTasksWorkedOn(saved.tasksWorkedOn || "");
    setWillWorkOn(saved.willWorkOn || "");
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "scrumData",
      JSON.stringify({ inTime, breakStart, breakEnd, outTime, tasksWorkedOn, willWorkOn })
    );
  }, [inTime, breakStart, breakEnd, outTime, tasksWorkedOn, willWorkOn]);

  return (
    <div className="min-h-screen w-screen bg-background flex items-center justify-center p-6 transition-colors">
      <Card className="w-full shadow-lg">
        <CardContent className="p-6 flex flex-col">
          {/* HEADER */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-center flex-1">SCRUM BUILDER</h1>
            <Button variant="ghost" size="icon" onClick={() => setTheme(getNextTheme())}>
              {theme === "light" && <Sun className="h-5 w-5" />}
              {theme === "dark" && <Moon className="h-5 w-5" />}
              {theme === "system" && <Laptop className="h-5 w-5" />}
            </Button>
          </div>

          {/* TIME INPUT SECTION */}
          <div className="border rounded-lg p-4 mb-6 w-full">
            <div className="flex items-center justify-between gap-4 w-full">
              <div className="flex flex-col items-center">
                <label className="text-sm font-medium mb-1 w-full">IN</label>
                <input
                  type="time"
                  value={inTime}
                  onChange={(e) => setInTime(e.target.value)}
                  className="flex border rounded-md px-2 py-1 w-20 text-center w-full"
                />
              </div>

              <div className="flex flex-col items-center border px-4 py-2 rounded-lg">
                <label className="text-sm font-medium mb-2 w-full">BREAK</label>
                <div className="flex gap-2 ">
                  <input
                    type="time"
                    value={breakStart}
                    onChange={(e) => setBreakStart(e.target.value)}
                    className="flex border rounded-md px-2 py-1 w-20 text-center w-full"
                  />
                  <input
                    type="time"
                    value={breakEnd}
                    onChange={(e) => setBreakEnd(e.target.value)}
                    className="flex border rounded-md px-2 py-1 w-20 text-center w-full"
                  />
                </div>
              </div>

              <div className="flex flex-col items-center">
                <label className="text-sm font-medium mb-1 w-full">OUT</label>
                <input
                  type="time"
                  value={outTime}
                  onChange={(e) => setOutTime(e.target.value)}
                  className="flex border rounded-md px-2 py-1 w-20 text-center w-full"
                />
              </div>
            </div>
          </div>

          {/* TASK SECTIONS */}
          <div className="border rounded-lg p-4 mb-4">
            <label className="block font-medium mb-2">TASKS WORKED ON</label>
            <Textarea
              rows="4"
              value={tasksWorkedOn}
              onChange={(e) => setTasksWorkedOn(e.target.value)}
              placeholder="List the tasks you worked on today..."
            />
          </div>

          <div className="border rounded-lg p-4">
            <label className="block font-medium mb-2">WILL WORK ON</label>
            <Textarea
              rows="4"
              value={willWorkOn}
              onChange={(e) => setWillWorkOn(e.target.value)}
              placeholder="List the tasks you will work on next..."
            />
          </div>

          {/* SAVE BUTTON */}
          <div className="flex justify-center mt-6">
            <Button
              onClick={() =>
                console.log("Saved Scrum Data:", { inTime, breakStart, breakEnd, outTime, tasksWorkedOn, willWorkOn })
              }
            >
              Save Status
            </Button>
          </div>
          <div className="flex justify-center mt-3">
            <Button
              variant="outline"
              onClick={async () => {
                const filePath = await window.api.exportFile({
                  inTime,
                  breakStart,
                  breakEnd,
                  outTime,
                  tasksWorkedOn,
                  willWorkOn,
                });
                alert(`✅ Work log exported successfully!\nSaved at: ${filePath}`);
              }}
            >
              Export as .txt / .md
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
