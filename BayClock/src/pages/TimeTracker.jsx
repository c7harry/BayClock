// =======================
// Imports and Setup
// =======================
import { useState, useMemo, useEffect, useRef } from "react";
import { FaPlay, FaStop, FaRegClock, FaHistory } from "react-icons/fa";
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
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import { GlassCard, getTextColor, getSecondaryTextColor } from "../components/Theme";

// =======================
// Constants and Helpers
// =======================

// Maximum timer value (12 hours in seconds)
const MAX_TIMER = 3600 * 12; 

// Get today's date as YYYY-MM-DD string
function getLocalDateString() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

// Format a date string as "Thu, Jun 12"
function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day); // JS months are 0-based
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Glass morphism card for individual entry groups
const EntryGroupCard = ({ children, date, totalTime, mode, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    style={{
      background: document.documentElement.classList.contains("dark")
        ? "rgba(35, 35, 42, 0.5)" 
        : "rgba(255, 255, 255, 0.5)",
      backdropFilter: "blur(15px)",
      border: document.documentElement.classList.contains("dark")
        ? "1px solid rgba(255, 255, 255, 0.08)" 
        : "1px solid rgba(0, 0, 0, 0.08)",
      borderRadius: "16px",
      boxShadow: document.documentElement.classList.contains("dark")
        ? "0 4px 16px rgba(0, 0, 0, 0.15)"
        : "0 4px 16px rgba(0, 0, 0, 0.06)",
      overflow: 'hidden',
      marginBottom: 16,
    }}
  >
    {/* Date Header */}
    <Box sx={{ 
      bgcolor: 'rgba(251, 146, 60, 0.1)', 
      borderBottom: 1,
      borderColor: 'rgba(251, 146, 60, 0.2)',
      py: 1.5, 
      px: 2.5,
      display: "flex", 
      alignItems: "center", 
      justifyContent: "space-between" 
    }}>
      <Typography 
        variant="subtitle1" 
        fontWeight={700} 
        sx={{ 
          color: "#fb923c",
          fontSize: "1rem"
        }}
      >
        {formatDisplayDate(date)}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          bgcolor: "rgba(251, 146, 60, 0.15)",
          color: "#fb923c",
          borderRadius: 2,
          px: 1.5,
          py: 0.5,
          fontSize: "0.8rem",
          border: 1,
          borderColor: "rgba(251, 146, 60, 0.3)"
        }}
      >
        Total: {totalTime}
      </Typography>
    </Box>
    
    {/* Content */}
    <Box sx={{ p: 2 }}>
      {children}
    </Box>
  </motion.div>
);

// =======================
// Main TimeTracker Component
// =======================
export default function TimeTracker() {
  const navigate = useNavigate();

  // -----------------------
  // Route Protection
  // -----------------------
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/login");
    });
  }, [navigate]);

  // -----------------------
  // Theme (Dark/Light Mode)
  // -----------------------
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
  
  // -----------------------
  // Timer State
  // -----------------------
  const [isRunning, setIsRunning] = useState(false);
  const [timer, setTimer] = useState(0);
  const [intervalId, setIntervalId] = useState(null);
  const [timerId, setTimerId] = useState(null); // Supabase timer row id

  // -----------------------
  // Entry Form State
  // -----------------------
  const [description, setDescription] = useState("");
  const [project, setProject] = useState("");
  const [date, setDate] = useState(() => getLocalDateString());
  const [manualDuration, setManualDuration] = useState("");

  // Manual entry state: start and end time
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");

  // -----------------------
  // Entries State (from Supabase)
  // -----------------------
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

  // -----------------------
  // Projects State (from Supabase)
  // -----------------------
  const [projects, setProjects] = useState([]); // store full objects

  useEffect(() => {
    async function fetchProjects() {
      const { data, error } = await supabase.from("projects").select("*");
      if (!error) setProjects(data || []);
    }
    fetchProjects();
  }, []);

  // -----------------------
  // Timer Interval Ref
  // -----------------------
  const intervalRef = useRef(null);

  // -----------------------
  // Load Timer State from Supabase (on mount and on timer-updated event)
  // -----------------------
  useEffect(() => {
    let unsubscribed = false;

    async function loadActiveTimer() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Get active timer for this user
      const { data: timers, error } = await supabase
        .from("timers")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_running", true)
        .order("started_at", { ascending: false })
        .limit(1);

      if (error || !timers || timers.length === 0) {
        setIsRunning(false);
        setTimer(0);
        setTimerId(null);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        return;
      }
      const t = timers[0];
      setDescription(t.description || "");
      setProject(t.project_id || "");
      setDate(t.date || getLocalDateString());
      setTimerId(t.id);
      setIsRunning(true);

      // Calculate elapsed seconds
      const startedAt = new Date(t.started_at);
      const elapsed = Math.floor((Date.now() - startedAt.getTime()) / 1000);
      setTimer(elapsed);

      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (!unsubscribed) {
          setTimer(Math.floor((Date.now() - startedAt.getTime()) / 1000));
        }
      }, 1000);
    }

    loadActiveTimer();

    // Listen for timer-updated event
    const reload = () => loadActiveTimer();
    window.addEventListener("timer-updated", reload);

    return () => {
      unsubscribed = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      window.removeEventListener("timer-updated", reload);
    };
  }, []);

  // -----------------------
  // Save Timer State to Supabase (heartbeat)
  // -----------------------
  useEffect(() => {
    // Only update if timer is running and timerId exists
    if (isRunning && timerId) {
      // Update updated_at for heartbeat
      supabase
        .from("timers")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", timerId);
    }
    // No-op if not running
  }, [isRunning, timer, timerId]);

  // =======================
  // Timer Handlers
  // =======================

  // Start Timer
  const handleStart = async () => {
    if (isRunning) return;
    // Get user and workspace_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("workspace_id")
      .eq("id", user.id)
      .single();

    // Insert timer row in Supabase
    const { data, error } = await supabase
      .from("timers")
      .insert([{
        user_id: user.id,
        workspace_id: profile?.workspace_id,
        project_id: project,
        description,
        started_at: new Date().toISOString(),
        date,
        is_running: true,
      }])
      .select()
      .single();

    if (error) {
      alert("Failed to start timer: " + error.message);
      return;
    }

    setIsRunning(true);
    setTimer(0);
    setTimerId(data.id);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setTimer((t) => t + 1), 1000);

    window.dispatchEvent(new Event("timer-updated")); 
  };

  // Stop Timer and Save Entry
  const handleStop = async () => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;

    if (timer > 0 && timerId) {
      // Save entry and delete timer row
      await addEntry(timerToDuration(timer));
      await supabase.from("timers").delete().eq("id", timerId);
    }
    setTimer(0);
    setTimerId(null);

    window.dispatchEvent(new Event("timer-updated"));
  };

  // =======================
  // Entry Handlers
  // =======================

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
    setDate(getLocalDateString());
    setManualDuration("");
    setManualStart("");
    setManualEnd("");
  };

  // Add Manual Entry (from start/end time)
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

  // Delete Entry Handler
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

  // -----------------------
  // Animation Variants for Tiles
  // -----------------------
  const tileVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  // -----------------------
  // Edit Dialog State
  // -----------------------
  const [editOpen, setEditOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [editDescription, setEditDescription] = useState("");
  const [editProject, setEditProject] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStart, setEditStart] = useState(""); 
  const [editEnd, setEditEnd] = useState("");   

  // Open Edit Dialog
  const handleEditOpen = (entry) => {
    setEditEntry(entry);
    setEditDescription(entry.description);
    setEditProject(entry.project_id);
    setEditDate(entry.date);
    setEditStart(entry.start || "");
    setEditEnd(entry.end || "");
    setEditOpen(true);
  };

  // Save Edit
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

  // -----------------------
  // Group Entries by Date and Description
  // -----------------------
  const grouped = entries.reduce((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = {};
    if (!acc[entry.date][entry.description]) acc[entry.date][entry.description] = [];
    acc[entry.date][entry.description].push(entry);
    return acc;
  }, {});

  // =======================
  // Resume Task Handler
  // =======================
  const handleResumeTask = async (entry) => {
    // Stop any existing timer for this user
    if (timerId) {
      await supabase.from("timers").delete().eq("id", timerId);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsRunning(false);
      setTimer(0);
      setTimerId(null);
    }
    const today = getLocalDateString();
    setDescription(entry.description);
    setProject(entry.project_id);
    setDate(today);

    // Get user and workspace_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("workspace_id")
      .eq("id", user.id)
      .single();

    // Insert new timer row
    const { data, error } = await supabase
      .from("timers")
      .insert([{
        user_id: user.id,
        workspace_id: profile?.workspace_id,
        project_id: entry.project_id,
        description: entry.description,
        started_at: new Date().toISOString(),
        date: today,
        is_running: true,
      }])
      .select()
      .single();

    if (error) {
      alert("Failed to resume timer: " + error.message);
      return;
    }

    setIsRunning(true);
    setTimer(0);
    setTimerId(data.id);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setTimer((t) => t + 1), 1000);

    window.dispatchEvent(new Event("timer-updated"));
  };

  // -----------------------
  // Project Prompt Snackbar State
  // -----------------------
  const [showProjectPrompt, setShowProjectPrompt] = useState(false);

  const handleClosePrompt = (event, reason) => {
    if (reason === "clickaway") return;
    setShowProjectPrompt(false);
  };

  // =======================
  // Render UI
  // =======================
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          py: { xs: 1.5, md: 2 },
          px: { xs: 1, sm: 2, md: 3 },
          width: "100%",
          boxSizing: "border-box",
          overflowX: "auto",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: "100%",
            mx: "auto",
            display: "flex",
            flexDirection: "column",
            gap: { xs: 1.5, md: 2 },
            boxSizing: "border-box",
          }}
        >
          {/* =====================
              Entry Form Tile
              ===================== */}
          <GlassCard 
            title="Track Your Time" 
            icon={<FaRegClock size={16} />} 
            delay={0.1}
          >
            <Box sx={{ p: 2.5 }}>
              {/* Compact Primary Input Row */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr' }, 
                gap: 2, 
                mb: 2 
              }}>
                <TextField
                  label="What are you working on?"
                  variant="outlined"
                  fullWidth
                  size="small"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: 'background.default',
                    },
                    '& .MuiInputLabel-root': {
                      color: getSecondaryTextColor(mode)
                    },
                    '& .MuiOutlinedInput-input': {
                      color: getTextColor(mode)
                    }
                  }}
                />

                <TextField
                  select
                  label="Project"
                  fullWidth
                  size="small"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: 'background.default',
                    },
                    '& .MuiInputLabel-root': {
                      color: getSecondaryTextColor(mode)
                    },
                    '& .MuiOutlinedInput-input': {
                      color: getTextColor(mode)
                    }
                  }}
                >
                  <MenuItem value="">Select Project</MenuItem>
                  {projects.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ 
                          width: 6, 
                          height: 6, 
                          borderRadius: '50%', 
                          bgcolor: 'warning.main' 
                        }} />
                        {p.name}
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Date"
                  type="date"
                  fullWidth
                  size="small"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: 'background.default',
                    },
                    '& .MuiInputLabel-root': {
                      color: getSecondaryTextColor(mode)
                    },
                    '& .MuiOutlinedInput-input': {
                      color: getTextColor(mode)
                    },
                    '& .MuiInputBase-input::-webkit-calendar-picker-indicator': {
                      filter: mode === "light" ? "invert(1)" : "none",
                      cursor: "pointer",
                      opacity: 0.8,
                      "&:hover": {
                        opacity: 1,
                      },
                    },
                    '& input[type="date"]::-webkit-calendar-picker-indicator': {
                      filter: mode === "light" ? "invert(1)" : "none",
                      cursor: "pointer",
                      opacity: 0.8,
                      "&:hover": {
                        opacity: 1,
                      },
                    },
                  }}
                />
              </Box>

              {/* Compact Timer and Controls Section */}
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', md: 'row' },
                gap: 2,
                alignItems: 'center',
                p: 2,
                bgcolor: mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                borderRadius: 3,
                border: 1,
                borderColor: 'divider'
              }}>
                {/* Compact Timer Display */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 2
                }}>
                  <Box sx={{ position: 'relative', width: 80, height: 80 }}>
                    <CircularProgressbar
                      value={timer % MAX_TIMER}
                      maxValue={MAX_TIMER}
                      text={timerToDuration(timer) || "0s"}
                      styles={buildStyles({
                        pathColor: isRunning ? "#fb923c" : "#bdbdbd",
                        textColor: getTextColor(mode),
                        trailColor: mode === 'dark' ? "#2a2a32" : "#f1f5f9",
                        textSize: "12px",
                        pathTransitionDuration: 0.5,
                      })}
                    />
                    {isRunning && (
                      <Box sx={{
                        position: 'absolute',
                        top: -3,
                        right: -3,
                        width: 12,
                        height: 12,
                        bgcolor: 'success.main',
                        borderRadius: '50%',
                        animation: 'pulse 2s infinite',
                        '@keyframes pulse': {
                          '0%': { transform: 'scale(1)', opacity: 1 },
                          '50%': { transform: 'scale(1.2)', opacity: 0.7 },
                          '100%': { transform: 'scale(1)', opacity: 1 },
                        }
                      }} />
                    )}
                  </Box>
                  
                  {/* Compact Timer Control Buttons */}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant={isRunning ? "outlined" : "contained"}
                      color="warning"
                      size="small"
                      startIcon={<FaPlay size={12} />}
                      onClick={handleStart}
                      disabled={isRunning}
                      sx={{
                        borderRadius: 2,
                        px: 2,
                        py: 1,
                        fontWeight: 600,
                        fontSize: '0.75rem'
                      }}
                    >
                      Start
                    </Button>
                    
                    <Button
                      variant="contained"
                      color="error"
                      size="small"
                      startIcon={<FaStop size={12} />}
                      onClick={handleStop}
                      disabled={!timer}
                      sx={{
                        borderRadius: 2,
                        px: 2,
                        py: 1,
                        fontWeight: 600,
                        fontSize: '0.75rem'
                      }}
                    >
                      Stop
                    </Button>
                  </Box>
                </Box>

                {/* Compact Manual Entry Section */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: 1,
                  flex: 1,
                  minWidth: 0
                }}>
                  <Typography variant="caption" sx={{ 
                    whiteSpace: 'nowrap',
                    color: getSecondaryTextColor(mode),
                    fontWeight: 600
                  }}>
                    Manual:
                  </Typography>
                  
                  <TextField
                    label="Start"
                    type="time"
                    size="small"
                    value={manualStart}
                    onChange={(e) => setManualStart(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ step: 60 }}
                    sx={{
                      minWidth: 100,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1,
                        bgcolor: 'background.default',
                      },
                      '& .MuiInputLabel-root': {
                        color: getSecondaryTextColor(mode)
                      },
                      '& .MuiOutlinedInput-input': {
                        color: getTextColor(mode)
                      },
                      '& .MuiInputBase-input::-webkit-calendar-picker-indicator': {
                        filter: mode === "light" ? "invert(1)" : "none",
                        cursor: "pointer",
                        opacity: 0.8,
                        "&:hover": {
                          opacity: 1,
                        },
                      },
                      '& input[type="time"]::-webkit-calendar-picker-indicator': {
                        filter: mode === "light" ? "invert(1)" : "none",
                        cursor: "pointer",
                        opacity: 0.8,
                        "&:hover": {
                          opacity: 1,
                        },
                      },
                    }}
                  />
                  
                  <TextField
                    label="End"
                    type="time"
                    size="small"
                    value={manualEnd}
                    onChange={(e) => setManualEnd(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ step: 60 }}
                    sx={{
                      minWidth: 100,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1,
                        bgcolor: 'background.default',
                      },
                      '& .MuiInputLabel-root': {
                        color: getSecondaryTextColor(mode)
                      },
                      '& .MuiOutlinedInput-input': {
                        color: getTextColor(mode)
                      },
                      '& .MuiInputBase-input::-webkit-calendar-picker-indicator': {
                        filter: mode === "light" ? "invert(1)" : "none",
                        cursor: "pointer",
                        opacity: 0.8,
                        "&:hover": {
                          opacity: 1,
                        },
                      },
                      '& input[type="time"]::-webkit-calendar-picker-indicator': {
                        filter: mode === "light" ? "invert(1)" : "none",
                        cursor: "pointer",
                        opacity: 0.8,
                        "&:hover": {
                          opacity: 1,
                        },
                      },
                    }}
                  />
                  
                  <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    onClick={handleManualAdd}
                    disabled={!manualStart || !manualEnd}
                    sx={{
                      borderRadius: 1,
                      px: 2,
                      py: 1,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      fontSize: '0.75rem'
                    }}
                  >
                    Add
                  </Button>
                </Box>
              </Box>
            </Box>
          </GlassCard>

          {/* =====================
              Entries List Tile
              ===================== */}
          <GlassCard 
            title="Recent Entries" 
            icon={<FaHistory size={16} />} 
            delay={0.2}
          >
            <Box sx={{ p: 2.5 }}>
              {entries.length === 0 ? (
                <Typography sx={{ 
                  textAlign: "center",
                  color: getSecondaryTextColor(mode)
                }}>
                  No entries yet.
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {/* --------- Group and Display Recent Entries --------- */}
                  {Object.entries(grouped)
                    .sort((a, b) => b[0].localeCompare(a[0]))
                    .slice(0, 5)
                    .map(([date, tasks], index) => {
                      // Flatten all entries for this date to calculate total duration
                      const allEntries = Object.values(tasks).flat();
                      // Helper to sum durations like "1h 2m 3s"
                      function sumDurations(durations) {
                        let totalSeconds = 0;
                        const regex = /(\d+)h|(\d+)m|(\d+)s/g;
                        durations.forEach((str) => {
                          let match;
                          while ((match = regex.exec(str))) {
                            if (match[1]) totalSeconds += parseInt(match[1]) * 3600;
                            if (match[2]) totalSeconds += parseInt(match[2]) * 60;
                            if (match[3]) totalSeconds += parseInt(match[3]);
                          }
                        });
                        const h = Math.floor(totalSeconds / 3600);
                        const m = Math.floor((totalSeconds % 3600) / 60);
                        const s = totalSeconds % 60;
                        let out = [];
                        if (h) out.push(`${h}h`);
                        if (m) out.push(`${m}m`);
                        out.push(`${s}s`);
                        return out.join(" ") || "0s";
                      }
                      const totalTime = sumDurations(allEntries.map(e => e.duration));
                      
                      return (
                        <EntryGroupCard
                          key={date}
                          date={date}
                          totalTime={totalTime}
                          mode={mode}
                          delay={index * 0.1}
                        >
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            {Object.values(tasks).map((group) =>
                              group.length > 1 ? (
                                <EntryCardGroup
                                  key={group[0].id}
                                  entries={group}
                                  mode={mode}
                                  onEdit={handleEditOpen}
                                  onDelete={handleDeleteEntry}
                                  showActions
                                  onResume={handleResumeTask}
                                  isRunning={isRunning}
                                  projects={projects}
                                  hideDate
                                  hideTotal
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
                                  projects={projects}
                                  hideDate
                                  hideTotal
                                />
                              )
                            )}
                          </Box>
                        </EntryGroupCard>
                      );
                    })}
                </Box>
              )}
            </Box>
          </GlassCard>
        </Box>
        {/* =====================
            Edit Dialog
            ===================== */}
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
              color: getTextColor(mode),
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
              sx={{ 
                mt: 3,
                '& .MuiInputLabel-root': {
                  color: getSecondaryTextColor(mode)
                },
                '& .MuiOutlinedInput-input': {
                  color: getTextColor(mode)
                }
              }}
            />
            <TextField
              select
              label="Project"
              value={editProject}
              onChange={(e) => setEditProject(e.target.value)}
              fullWidth
              variant="outlined"
              sx={{
                '& .MuiInputLabel-root': {
                  color: getSecondaryTextColor(mode)
                },
                '& .MuiOutlinedInput-input': {
                  color: getTextColor(mode)
                }
              }}
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
              sx={{
                '& .MuiInputLabel-root': {
                  color: getSecondaryTextColor(mode)
                },
                '& .MuiOutlinedInput-input': {
                  color: getTextColor(mode)
                },
                '& .MuiInputBase-input::-webkit-calendar-picker-indicator': {
                  filter: mode === "light" ? "invert(1)" : "none",
                  cursor: "pointer",
                  opacity: 0.8,
                  "&:hover": {
                    opacity: 1,
                  },
                },
                '& input[type="date"]::-webkit-calendar-picker-indicator': {
                  filter: mode === "light" ? "invert(1)" : "none",
                  cursor: "pointer",
                  opacity: 0.8,
                  "&:hover": {
                    opacity: 1,
                  },
                },
              }}
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
                sx={{
                  '& .MuiInputLabel-root': {
                    color: getSecondaryTextColor(mode)
                  },
                  '& .MuiOutlinedInput-input': {
                    color: getTextColor(mode)
                  },
                  '& .MuiInputBase-input::-webkit-calendar-picker-indicator': {
                    filter: mode === "light" ? "invert(1)" : "none",
                    cursor: "pointer",
                    opacity: 0.8,
                    "&:hover": {
                      opacity: 1,
                    },
                  },
                  '& input[type="time"]::-webkit-calendar-picker-indicator': {
                    filter: mode === "light" ? "invert(1)" : "none",
                    cursor: "pointer",
                    opacity: 0.8,
                    "&:hover": {
                      opacity: 1,
                    },
                  },
                }}
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
                sx={{
                  '& .MuiInputLabel-root': {
                    color: getSecondaryTextColor(mode)
                  },
                  '& .MuiOutlinedInput-input': {
                    color: getTextColor(mode)
                  },
                  '& .MuiInputBase-input::-webkit-calendar-picker-indicator': {
                    filter: mode === "light" ? "invert(1)" : "none",
                    cursor: "pointer",
                    opacity: 0.8,
                    "&:hover": {
                      opacity: 1,
                    },
                  },
                  '& input[type="time"]::-webkit-calendar-picker-indicator': {
                    filter: mode === "light" ? "invert(1)" : "none",
                    cursor: "pointer",
                    opacity: 0.8,
                    "&:hover": {
                      opacity: 1,
                    },
                  },
                }}
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