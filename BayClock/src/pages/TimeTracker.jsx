import { useState, useMemo, useEffect } from "react";
import { FaPlay, FaPause, FaStop, FaRegClock } from "react-icons/fa";
import { motion } from "framer-motion";

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
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import EntryCard, { EntryCardGroup } from "../components/EntryCard";

export default function TimeTracker() {
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
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualDuration, setManualDuration] = useState("");

  // Manual entry state: start and end time
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");

  // Entries state (simulate localStorage)
  const [entries, setEntries] = useState(() => {
    const saved = localStorage.getItem("entries");
    return saved ? JSON.parse(saved) : [];
  });

  // Projects (static for MVP)
  const projects = ["Project A", "Project B", "Internal"];

  // Timer handlers
  const handleStart = () => {
    if (isRunning) return;
    setIsRunning(true);
    const id = setInterval(() => setTimer((t) => t + 1), 1000);
    setIntervalId(id);
  };

  const handlePause = () => {
    setIsRunning(false);
    clearInterval(intervalId);
  };

  const handleStop = () => {
    setIsRunning(false);
    clearInterval(intervalId);
    if (timer > 0) {
      addEntry(timerToDuration(timer));
    }
    setTimer(0);
  };

  // Add entry (timer or manual)
  const addEntry = (durationStr) => {
    if (!description || !project || !date || !durationStr) return;
    const newEntry = {
      id: Date.now(),
      description,
      project,
      date,
      duration: durationStr,
    };
    const updated = [newEntry, ...entries];
    setEntries(updated);
    localStorage.setItem("entries", JSON.stringify(updated));
    setDescription("");
    setProject("");
    setManualHours("");
    setManualMins("");
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

    addEntry(timerToDuration(diffSec));
    setManualStart("");
    setManualEnd("");
  };

  // Delete entry handler
  const handleDeleteEntry = (id) => {
    const updated = entries.filter((entry) => entry.id !== id);
    setEntries(updated);
    localStorage.setItem("entries", JSON.stringify(updated));
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
    setEditProject(entry.project);
    setEditDate(entry.date);

    // Try to extract start/end time from entry (if you store them), else leave blank
    // If not stored, try to estimate from duration (not precise, so leave blank)
    setEditStart(entry.start || "");
    setEditEnd(entry.end || "");
    setEditOpen(true);
  };

  // Save edit
  const handleEditSave = () => {
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

    const updated = entries.map((entry) =>
      entry.id === editEntry.id
        ? {
            ...entry,
            description: editDescription,
            project: editProject,
            date: editDate,
            duration: durationStr,
            start: editStart,
            end: editEnd,
          }
        : entry
    );
    setEntries(updated);
    localStorage.setItem("entries", JSON.stringify(updated));
    setEditOpen(false);
    setEditEntry(null);
  };

  // Group entries by date
  const grouped = entries.reduce((acc, entry) => {
    acc[entry.date] = acc[entry.date] || [];
    acc[entry.date].push(entry);
    return acc;
  }, {});

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "80vh",
          bgcolor: "background.default",
          py: 6,
          px: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transition: "background-color 0.3s",
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 700, display: "flex", flexDirection: "column", gap: 4 }}>
          {/* Header Tile */}
          <motion.div variants={tileVariants} initial="hidden" animate="visible">
            <Card elevation={6} sx={{ borderRadius: 5, bgcolor: "background.paper" }}>
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
            <Card elevation={4} sx={{ borderRadius: 5, bgcolor: "background.paper" }}>
              <CardContent>
                <Box
                  component="form"
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    gap: 2,
                    mb: 3,
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
                      <MenuItem key={p} value={p}>
                        {p}
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
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography
                      variant="h5"
                      fontFamily="monospace"
                      fontWeight={700}
                      color="primary"
                      sx={{ minWidth: 100 }}
                    >
                      {timerToDuration(timer) || "0s"}
                    </Typography>
                    <Tooltip title="Start" arrow>
                      <span>
                        <IconButton
                          color="warning"
                          onClick={handleStart}
                          disabled={isRunning || !description || !project}
                          sx={{
                            bgcolor: "warning.main",
                            color: "#fff",
                            "&:hover": { bgcolor: "warning.dark" },
                            mx: 0.5,
                          }}
                        >
                          <FaPlay />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Pause" arrow>
                      <span>
                        <IconButton
                          color="default"
                          onClick={handlePause}
                          disabled={!isRunning}
                          sx={{
                            bgcolor: "grey.200",
                            color: "text.primary",
                            "&:hover": { bgcolor: "grey.300" },
                            mx: 0.5,
                          }}
                        >
                          <FaPause />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Stop & Save" arrow>
                      <span>
                        <IconButton
                          color="default"
                          onClick={handleStop}
                          disabled={!timer}
                          sx={{
                            bgcolor: "grey.200",
                            color: "text.primary",
                            "&:hover": { bgcolor: "grey.300" },
                            mx: 0.5,
                          }}
                        >
                          <FaStop />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                  {/* Manual Duration Entry: Separate Hours and Minutes */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
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
            <Card elevation={4} sx={{ borderRadius: 5, bgcolor: "background.paper" }}>
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
                  <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    {Object.entries(grouped)
                      .sort((a, b) => b[0].localeCompare(a[0])) // newest date first
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
                          />
                        ) : (
                          <EntryCard
                            key={group[0].id}
                            entry={group[0]}
                            mode={mode}
                            onEdit={handleEditOpen}
                            onDelete={handleDeleteEntry}
                            showActions
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
        <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Edit Entry</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Task Description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              select
              label="Project"
              value={editProject}
              onChange={(e) => setEditProject(e.target.value)}
              fullWidth
            >
              <MenuItem value="">Select</MenuItem>
              {projects.map((p) => (
                <MenuItem key={p} value={p}>
                  {p}
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
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Start Time"
                type="time"
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
                sx={{ width: 120 }}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 60 }}
              />
              <TextField
                label="End Time"
                type="time"
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
                sx={{ width: 120 }}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 60 }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)} color="inherit">
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              variant="contained"
              color="primary"
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