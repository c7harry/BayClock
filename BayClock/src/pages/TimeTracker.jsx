import { useState, useMemo, useEffect } from "react";
import { FaPlay, FaStop, FaRegClock } from "react-icons/fa";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import EntryCard, { EntryCardGroup } from "../components/EntryCard";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const TIMER_STATE_KEY = "timerState";
const MAX_TIMER = 3600;

function getLocalDateString() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export default function TimeTracker() {
  const navigate = useNavigate();

  // Route protection
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/login");
    });
  }, [navigate]);

  // Dark/Light mode with Tailwind
  const [mode, setMode] = useState(
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );

  useEffect(() => {
    const getMode = () =>
      document.documentElement.classList.contains("dark") ? "dark" : "light";
    setMode(getMode());

    const observer = new MutationObserver(() => {
      setMode(getMode());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === "light"
            ? {
                background: {
                  default: "#f3f4f6",
                  paper: "#fff",
                },
              }
            : {
                background: {
                  default: "#18181b",
                  paper: "#23232a",
                },
              }),
          warning: {
            main: "#fb923c",
            light: "#ffe6d3",
            dark: "#b45309",
          },
        },
      }),
    [mode]
  );
  
  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [timer, setTimer] = useState(0);
  const [intervalId, setIntervalId] = useState(null);

  // Entry form state
  const [description, setDescription] = useState("");
  const [project, setProject] = useState("");
  const [date, setDate] = useState(() => getLocalDateString());
  const [manualDuration, setManualDuration] = useState("");

  // Manual entry state: start and end time
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");

  // Entries state (from Supabase)
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch entries from Supabase
  useEffect(() => {
    async function fetchEntries() {
      setLoading(true);
      const { data, error } = await supabase
        .from("entries")
        .select("*")
        .order("date", { ascending: false });
      if (!error) setEntries(data || []);
      setLoading(false);
    }
    fetchEntries();
    // Listen for custom event to reload
    window.addEventListener("entries-updated", fetchEntries);
    return () => window.removeEventListener("entries-updated", fetchEntries);
  }, []);

  // Projects (from Supabase)
  const [projects, setProjects] = useState([]); // store full objects

  useEffect(() => {
    async function fetchProjects() {
      const { data, error } = await supabase.from("projects").select("*");
      if (!error) setProjects(data || []);
    }
    fetchProjects();
  }, []);

  // --- Load timer state from localStorage on mount ---
  useEffect(() => {
    const saved = localStorage.getItem(TIMER_STATE_KEY);
    if (saved) {
      const { isRunning, timer, startedAt, description, project, date } = JSON.parse(saved);
      setDescription(description || "");
      setProject(project || "");
      setDate(date || new Date().toISOString().slice(0, 10));
      if (isRunning && startedAt) {
        // Always calculate timer as (Date.now() - startedAt) / 1000
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        setTimer(elapsed);
        setIsRunning(true);
        const id = setInterval(() => setTimer(Math.floor((Date.now() - startedAt) / 1000)), 1000);
        setIntervalId(id);
      } else {
        setTimer(timer || 0);
        setIsRunning(false);
      }
    }
    // eslint-disable-next-line
  }, []);

  // --- Save timer state to localStorage whenever timer or running state changes ---
  useEffect(() => {
    // Only save if timer is running or has a value
    if (isRunning || timer > 0) {
      localStorage.setItem(
        TIMER_STATE_KEY,
        JSON.stringify({
          isRunning,
          timer,
          startedAt: isRunning ? Date.now() - timer * 1000 : null,
          description,
          project,
          date,
        })
      );
    } else {
      localStorage.removeItem(TIMER_STATE_KEY);
    }
    // eslint-disable-next-line
  }, [isRunning, timer, description, project, date]);

  // Timer handlers
  const handleStart = () => {
    if (isRunning) return;
    setIsRunning(true);
    // Save the start time to localStorage
    localStorage.setItem(
      TIMER_STATE_KEY,
      JSON.stringify({
        isRunning: true,
        timer,
        startedAt: Date.now() - timer * 1000,
        description,
        project,
        date,
      })
    );
    const id = setInterval(() => setTimer((t) => t + 1), 1000);
    setIntervalId(id);
  };

  const handleStop = () => {
    setIsRunning(false);
    clearInterval(intervalId);
    if (timer > 0) {
      addEntry(timerToDuration(timer));
    }
    setTimer(0);
    localStorage.removeItem(TIMER_STATE_KEY);
  };

  // Add entry (timer or manual)
  const addEntry = async (durationStr, startTime = "", endTime = "") => {
    if (!description || !project || !date || !durationStr) return;
    let start = startTime;
    let end = endTime;
    if (!start || !end) {
      const now = new Date();
      if (timer > 0) {
        const endDate = new Date(now);
        const startDate = new Date(now - timer * 1000);
        const pad = (n) => n.toString().padStart(2, "0");
        start = `${pad(startDate.getHours())}:${pad(startDate.getMinutes())}`;
        end = `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;
      } else {
        const pad = (n) => n.toString().padStart(2, "0");
        start = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
        end = start;
      }
    }
    // Get user and workspace_id
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("workspace_id")
      .eq("id", user.id)
      .single();
    const { error } = await supabase.from("entries").insert([{
      description,
      project_id: project, // <-- use the selected project id
      date,
      duration: durationStr,
      start,
      end,
      user_id: user.id,
      workspace_id: profile.workspace_id,
    }]);
    if (error) {
      alert("Failed to save entry: " + error.message);
      return;
    }
    window.dispatchEvent(new Event("entries-updated"));
    setDescription("");
    setProject("");
    setDate(new Date().toISOString().slice(0, 10));
    setManualDuration("");
    setManualStart("");
    setManualEnd("");
  };

  // Manual entry handler (combine hours and mins)
  const handleManualAdd = () => {
    if (!manualStart || !manualEnd) return;
    // Parse times as Date objects (today's date)
    const [startH, startM] = manualStart.split(":").map(Number);
    const [endH, endM] = manualEnd.split(":").map(Number);
    const start = new Date();
    start.setHours(startH, startM, 0, 0);
    const end = new Date();
    end.setHours(endH, endM, 0, 0);

    // If end is before start, treat as next day
    if (end < start) end.setDate(end.getDate() + 1);

    const diffMs = end - start;
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec <= 0) return;

    addEntry(timerToDuration(diffSec), manualStart, manualEnd);
    // Inputs are already reset in addEntry
  };

  // Delete entry handler
  const handleDeleteEntry = async (id) => {
    await supabase.from("entries").delete().eq("id", id);
    window.dispatchEvent(new Event("entries-updated"));
  };

  // Utility: seconds to "1h 23m 45s"
  function timerToDuration(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return [
      h ? `${h}h` : "",
      m ? `${m}m` : "",
      s ? `${s}s` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  // Animation variants for tiles
  const tileVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [editDescription, setEditDescription] = useState("");
  const [editProject, setEditProject] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStart, setEditStart] = useState(""); 
  const [editEnd, setEditEnd] = useState("");   

  // Open edit dialog
  const handleEditOpen = (entry) => {
    setEditEntry(entry);
    setEditDescription(entry.description);
    setEditProject(entry.project_id);
    setEditDate(entry.date);
    setEditStart(entry.start || "");
    setEditEnd(entry.end || "");
    setEditOpen(true);
  };

  // Save edit
  const handleEditSave = async () => {
    if (!editDescription || !editProject || !editDate || !editStart || !editEnd) return;

    // Calculate duration from start/end time
    const [startH, startM] = editStart.split(":").map(Number);
    const [endH, endM] = editEnd.split(":").map(Number);
    const start = new Date();
    start.setHours(startH, startM, 0, 0);
    const end = new Date();
    end.setHours(endH, endM, 0, 0);
    if (end < start) end.setDate(end.getDate() + 1);
    const diffMs = end - start;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec <= 0) return;
    const durationStr = timerToDuration(diffSec);

    // Update in Supabase
    const { error } = await supabase
      .from("entries")
      .update({
        description: editDescription,
        project_id: editProject,
        date: editDate,
        duration: durationStr,
        start: editStart,
        end: editEnd,
      })
      .eq("id", editEntry.id);

    if (error) {
      alert("Failed to update entry: " + error.message);
      return;
    }

    setEditOpen(false);
    setEditEntry(null);
    window.dispatchEvent(new Event("entries-updated"));
  };

  // Group entries by date
  const grouped = entries.reduce((acc, entry) => {
    acc[entry.date] = acc[entry.date] || [];
    acc[entry.date].push(entry);
    return acc;
  }, {});

  // Resume task handler
  const handleResumeTask = (entry) => {
    const today = getLocalDateString(); // Use local date, not UTC
    setDescription(entry.description);
    setProject(entry.project_id); // Use project_id, not project
    setDate(today);
    setTimer(0);
    setIsRunning(true);
    if (intervalId) clearInterval(intervalId);
    const id = setInterval(() => setTimer((t) => t + 1), 1000);
    setIntervalId(id);
    // Save timer state for persistence
    localStorage.setItem(
      TIMER_STATE_KEY,
      JSON.stringify({
        isRunning: true,
        timer: 0,
        startedAt: Date.now(),
        description: entry.description,
        project: entry.project_id, // Use project_id
        date: today,
      })
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          py: { xs: 2, md: 4 },
          px: { xs: 0, sm: 1, md: 2 },
          width: "100%",
          maxWidth: "100%", 
          boxSizing: "border-box",
          overflowX: "hidden",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: "1600px",
            mx: "auto",
            display: "flex",
            flexDirection: "column",
            gap: { xs: 2, md: 3 },
            px: { xs: 0.5, sm: 2, md: 4 },
            boxSizing: "border-box",
            overflowX: "hidden",
          }}
        >
          {/* Header Tile */}
          <motion.div variants={tileVariants} initial="hidden" animate="visible">
            <Card elevation={6} sx={{ borderRadius: 5, bgcolor: "background.paper", width: "100%", maxWidth: "100%" }}>
              <CardContent
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  py: 3,
                  bgcolor: "background.paper",
                  transition: "background-color 0.3s",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <FaRegClock size={32} color="#fb923c" />
                  <Typography
                    variant="h4"
                    fontWeight={700}
                    color="text.primary"
                    sx={{ textAlign: "center" }}
                  >
                    Time Tracker
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </motion.div>

          {/* Entry Form Tile */}
          <motion.div variants={tileVariants} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
            <Card elevation={4} sx={{ borderRadius: 5, bgcolor: "background.paper", width: "100%", maxWidth: "100%" }}>
              <CardContent>
                <Box
                  component="form"
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    gap: 2,
                    mb: 3,
                    width: "100%", // Full width for form
                  }}
                  noValidate
                  autoComplete="off"
                >
                  <TextField
                    label="Task Description"
                    variant="outlined"
                    fullWidth
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    sx={{ bgcolor: "background.default", borderRadius: 2 }}
                    placeholder="What are you working on?"
                  />
                  <TextField
                    select
                    label="Project"
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    sx={{ minWidth: 160, bgcolor: "background.default", borderRadius: 2 }}
                  >
                    <MenuItem value="">Select</MenuItem>
                    {projects.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    sx={{ minWidth: 140, bgcolor: "background.default", borderRadius: 2 }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
                <Divider sx={{ my: 2 }} />
                {/* Timer Controls Tile */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    alignItems: { md: "center" },
                    gap: 2,
                    width: "100%", // Full width for controls
                  }}
                >
                  {/* Timer display */}
                  <Box
                    sx={{
                      width: 70,
                      height: 55,
                      mr: { xs: 0, md: 0 },
                      ml: 0,
                      p: 0,
                      m: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                    <CircularProgressbar
                      value={timer % MAX_TIMER}
                      maxValue={MAX_TIMER}
                      text={timerToDuration(timer) || "0s"}
                      styles={buildStyles({
                        pathColor: isRunning ? "#fb923c" : "#bdbdbd",
                        textColor: "#fb923c",
                        trailColor: "#ffe6d3",
                        textSize: "16px",
                        pathTransitionDuration: 0.5,
                      })}
                    />
                  </Box>
                  {/* Start/Stop buttons moved outside timer box */}
                  <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", mb: { xs: 2, md: 0 } }}>
                    <Tooltip title="Start" arrow>
                      <span>
                        <Button
                          variant="contained"
                          color="warning"
                          startIcon={<FaPlay />}
                          onClick={handleStart}
                          disabled={isRunning || !description || !project}
                        >
                          Start
                        </Button>
                      </span>
                    </Tooltip>
                    <Tooltip title="Stop & Save" arrow>
                      <span>
                        <Button
                          variant="contained"
                          color={isRunning ? "error" : "inherit"}
                          startIcon={<FaStop />}
                          onClick={handleStop}
                          disabled={!timer}
                          sx={{ ml: 1 }}
                        >
                          Stop & Save
                        </Button>
                      </span>
                    </Tooltip>
                  </Box>
                  {/* Manual Duration Entry: Separate Hours and Minutes */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flex: 1,
                      justifyContent: "flex-end",
                    }}
                  >
                    <TextField
                      label="Start Time"
                      type="time"
                      value={manualStart}
                      onChange={(e) => setManualStart(e.target.value)}
                      sx={{ width: 130, bgcolor: "background.default", borderRadius: 2 }}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ step: 60 }}
                    />
                    <TextField
                      label="End Time"
                      type="time"
                      value={manualEnd}
                      onChange={(e) => setManualEnd(e.target.value)}
                      sx={{ width: 130, bgcolor: "background.default", borderRadius: 2 }}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ step: 60 }}
                    />
                    <Button
                      variant="contained"
                      color="warning"
                      sx={{ borderRadius: 2, fontWeight: 600, px: 3, py: 1.5 }}
                      onClick={handleManualAdd}
                      disabled={
                        !manualStart ||
                        !manualEnd ||
                        !description ||
                        !project
                      }
                    >
                      Add Manual Entry
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </motion.div>

          {/* Entries List Tile */}
          <motion.div variants={tileVariants} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
            <Card elevation={4} sx={{ borderRadius: 5, bgcolor: "background.paper", width: "100%", maxWidth: "100%" }}>
              <CardContent>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  color="text.secondary"
                  mb={2}
                  sx={{ textAlign: "center" }}
                >
                  Recent Entries
                </Typography>
                {entries.length === 0 ? (
                  <Typography color="text.disabled" sx={{ textAlign: "center" }}>
                    No entries yet.
                  </Typography>
                ) : (
                  <Box
                    component="ul"
                    sx={{
                      listStyle: "none",
                      p: 0,
                      m: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      width: "100%",
                    }}
                  >
                    {Object.entries(grouped)
                      .sort((a, b) => b[0].localeCompare(a[0]))
                      .slice(0, 5)
                      .map(([date, group]) =>
                        group.length > 1 ? (
                          <EntryCardGroup
                            key={date}
                            entries={group}
                            mode={mode}
                            onEdit={handleEditOpen}
                            onDelete={handleDeleteEntry}
                            showActions
                            onResume={handleResumeTask}
                            isRunning={isRunning}
                            projects={projects}
                          />
                        ) : (
                          <EntryCard
                            key={group[0].id}
                            entry={group[0]}
                            mode={mode}
                            onEdit={handleEditOpen}
                            onDelete={handleDeleteEntry}
                            showActions
                            onResume={handleResumeTask}
                            isRunning={isRunning}
                            projects={projects} // <-- ADD THIS LINE
                          />
                        )
                      )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Box>
        {/* Edit Dialog */}
        <Dialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              p: 2,
              bgcolor: "background.paper",
              boxShadow: 6,
            },
          }}
        >
          <DialogTitle
            sx={{
              fontWeight: 700,
              fontSize: 22,
              color: "text.primary",
              pb: 1,
              borderBottom: "1px solid",
              borderColor: "divider",
              bgcolor: "transparent",
            }}
          >
            Edit Entry
          </DialogTitle>
          <DialogContent
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              pt: 2,
              pb: 1,
              bgcolor: "transparent",
            }}
          >
            <TextField
              label="Task Description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              fullWidth
              autoFocus
              variant="outlined"
              inputProps={{ maxLength: 100, style: { minWidth: 0 } }}
              InputProps={{ style: { minWidth: 0 } }}
              multiline
              minRows={1}
              maxRows={3}
              sx={{ mt: 3 }}
            />
            <TextField
              select
              label="Project"
              value={editProject}
              onChange={(e) => setEditProject(e.target.value)}
              fullWidth
              variant="outlined"
            >
              <MenuItem value="">Select</MenuItem>
              {projects.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Date"
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              variant="outlined"
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Start Time"
                type="time"
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 60, style: { minWidth: 0 } }}
                variant="outlined"
              />
              <TextField
                label="End Time"
                type="time"
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 60, style: { minWidth: 0 } }}
                variant="outlined"
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
            <Button onClick={() => setEditOpen(false)} color="inherit" variant="outlined">
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              variant="contained"
              color="warning"
              disabled={!editDescription || !editProject || !editDate || !editStart || !editEnd}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}