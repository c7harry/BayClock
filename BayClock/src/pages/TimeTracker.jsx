import { useState, useMemo, useEffect } from "react";
import { FaPlay, FaPause, FaStop, FaRegClock } from "react-icons/fa";
import { motion } from "framer-motion";

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
  // ------------------------------------------

  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [timer, setTimer] = useState(0);
  const [intervalId, setIntervalId] = useState(null);

  // Entry form state
  const [description, setDescription] = useState("");
  const [project, setProject] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manualDuration, setManualDuration] = useState("");

  // Manual entry state: separate hours and minutes
  const [manualHours, setManualHours] = useState("");
  const [manualMins, setManualMins] = useState("");

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
    const h = parseInt(manualHours, 10) || 0;
    const m = parseInt(manualMins, 10) || 0;
    if (h === 0 && m === 0) return;
    let durationStr = "";
    if (h > 0) durationStr += `${h}h `;
    if (m > 0) durationStr += `${m}m`;
    addEntry(durationStr.trim());
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
                      label="Hours"
                      type="number"
                      inputProps={{ min: 0 }}
                      value={manualHours}
                      onChange={(e) => setManualHours(e.target.value.replace(/[^0-9]/g, ""))}
                      sx={{ width: 90, bgcolor: "background.default", borderRadius: 2 }}
                    />
                    <TextField
                      label="Minutes"
                      type="number"
                      inputProps={{ min: 0, max: 59 }}
                      value={manualMins}
                      onChange={(e) => {
                        let val = e.target.value.replace(/[^0-9]/g, "");
                        if (parseInt(val, 10) > 59) val = "59";
                        setManualMins(val);
                      }}
                      sx={{ width: 110, bgcolor: "background.default", borderRadius: 2 }}
                    />
                    <Button
                      variant="contained"
                      color="warning"
                      sx={{ borderRadius: 2, fontWeight: 600, px: 3, py: 1.5 }}
                      onClick={handleManualAdd}
                      disabled={
                        (!manualHours && !manualMins) ||
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
                    {entries.slice(0, 5).map((entry) => (
                      <motion.li
                        key={entry.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card
                          elevation={2}
                          sx={{
                            borderRadius: 3,
                            bgcolor: "background.default",
                            display: "flex",
                            flexDirection: { xs: "column", sm: "row" },
                            alignItems: { sm: "center" },
                            justifyContent: "space-between",
                            gap: 2,
                            px: 2,
                            py: 1.5,
                          }}
                        >
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                              <Typography
                                variant="subtitle1"
                                fontWeight={600}
                                color="text.primary"
                                sx={{ flex: 1, minWidth: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}
                              >
                                {entry.description}
                              </Typography>
                              <Box
                                sx={{
                                  bgcolor: "warning.light",
                                  color: "warning.dark",
                                  borderRadius: 2,
                                  px: 1.5,
                                  py: 0.5,
                                  fontSize: 12,
                                  fontWeight: 500,
                                  ml: 1,
                                }}
                              >
                                {entry.project}
                              </Box>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              <span style={{ color: "#aaa" }}>Date:</span>{" "}
                              <span
                                style={{
                                  color:
                                    mode === "dark"
                                      ? "#fff"
                                      : "#444",
                                  fontFamily: "inherit",
                                }}
                              >
                                {entry.date}
                              </span>
                            </Typography>
                          </Box>
                          <Box sx={{ minWidth: 80, textAlign: "right" }}>
                            <Typography variant="h6" fontWeight={700} color="warning.main">
                              {entry.duration}
                            </Typography>
                            <Typography variant="caption" color="text.disabled">
                              Duration
                            </Typography>
                          </Box>
                        </Card>
                      </motion.li>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Box>
      </Box>
    </ThemeProvider>
  );
}