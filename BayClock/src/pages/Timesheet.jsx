import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Select,
  MenuItem,
  TextField,
  Button,
  useTheme,
  CssBaseline,
  Card,
  CardContent,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Tooltip,
  Alert,
  Snackbar,
  LinearProgress,
  Fab,
  Zoom,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { FaPlusCircle, FaListAlt, FaChartBar, FaPrint, FaFilter, FaCog, FaCalendarAlt, FaClock, FaProjectDiagram, FaPlus } from "react-icons/fa";
import { MdClose, MdEdit, MdSave, MdCancel, MdRefresh, MdFileUpload } from "react-icons/md";
import { format, startOfWeek, addDays, subWeeks, addWeeks, isToday, startOfMonth, endOfMonth } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabaseClient";
import { GlassCard } from "../components/Theme";

const DAYS_IN_WEEK = 7;

// Existing utility functions remain the same
function padHMS(hms) {
  return hms
    .split(":")
    .map((v) => v.padStart(2, "0"))
    .join(":");
}

function sumHMS(times) {
  let total = 0;
  times.forEach((t) => {
    if (!t) return;
    const [h, m, s] = t.split(":").map(Number);
    total += h * 3600 + m * 60 + s;
  });
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
}

function formatToHMS(value) {
  if (!value) return "00:00:00";
  let cleaned = value.replace(/[^\d:]/g, "");
  let parts = cleaned.split(":");
  if (parts.length === 1) {
    let num = parts[0].padStart(6, "0");
    parts = [num.slice(0, 2), num.slice(2, 4), num.slice(4, 6)];
  } else {
    parts = parts.map((p) => p.padStart(2, "0"));
    while (parts.length < 3) parts.push("00");
    parts = parts.slice(0, 3);
  }
  return parts.join(":");
}

function durationStrToHMS(str) {
  if (!str) return "00:00:00";
  let h = 0, m = 0, s = 0;
  const hourMatch = str.match(/(\d+)\s*h/);
  const minMatch = str.match(/(\d+)\s*m/);
  const secMatch = str.match(/(\d+)\s*s/);
  if (hourMatch) h = parseInt(hourMatch[1], 10);
  if (minMatch) m = parseInt(minMatch[1], 10);
  if (secMatch) s = parseInt(secMatch[1], 10);
  if (!hourMatch && !minMatch && !secMatch && /^\d+$/.test(str)) {
    m = parseInt(str, 10);
  }
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
}

function sumDurationsHMS(durations) {
  let totalSeconds = 0;
  durations.forEach((str) => {
    let h = 0, m = 0, s = 0;
    const hourMatch = str.match(/(\d+)\s*h/);
    const minMatch = str.match(/(\d+)\s*m/);
    const secMatch = str.match(/(\d+)\s*s/);
    if (hourMatch) h = parseInt(hourMatch[1], 10);
    if (minMatch) m = parseInt(minMatch[1], 10);
    if (secMatch) s = parseInt(secMatch[1], 10);
    if (!hourMatch && !minMatch && !secMatch && /^\d+$/.test(str)) {
      m = parseInt(str, 10);
    }
    totalSeconds += h * 3600 + m * 60 + s;
  });
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
}

function hasEdits(projectRows, editTimes) {
  return projectRows.some(row =>
    (editTimes[row.project.id] || []).some((t, i) => t !== row.times[i])
  );
}

// New utility functions
function calculateWeeklyGoal(hours) {
  return hours * 7; // Default 8 hours per day
}

function getWeeklyStats(projectRows, addingRows) {
  const totalHours = sumHMS([
    ...projectRows.flatMap((row) => row.times),
    ...addingRows.flatMap((row) => row.times),
  ]);
  
  const [h, m, s] = totalHours.split(":").map(Number);
  const totalMinutes = h * 60 + m + s / 60;
  const dailyAverage = totalMinutes / 7;
  
  const projectBreakdown = {};
  projectRows.forEach(row => {
    const projectTotal = sumHMS(row.times);
    if (projectTotal !== "00:00:00") {
      projectBreakdown[row.project.name] = projectTotal;
    }
  });
  
  return {
    totalHours,
    totalMinutes,
    dailyAverage,
    projectBreakdown,
    totalProjects: Object.keys(projectBreakdown).length,
  };
}

export default function Timesheet() {
  // Existing theme setup
  const [mode, setMode] = useState(
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );
  useEffect(() => {
    const getMode = () =>
      document.documentElement.classList.contains("dark") ? "dark" : "light";
    setMode(getMode());
    const observer = new MutationObserver(() => setMode(getMode()));
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
          primary: {
            main: "#38bdf8",
          },
          success: {
            main: "#22c55e",
            light: "#bbf7d0",
            dark: "#15803d",
          },
          info: {
            main: "#3b82f6",
            light: "#dbeafe",
            dark: "#1d4ed8",
          },
        },
      }),
    [mode]
  );

  // Existing state
  const [projects, setProjects] = useState([]);
  const [entries, setEntries] = useState([]);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [userId, setUserId] = useState(null);
  const [addingRows, setAddingRows] = useState([
    { project_id: "", times: Array(DAYS_IN_WEEK).fill("") },
  ]);
  const [editTimes, setEditTimes] = useState({});
  const [isEditing, setIsEditing] = useState({});

  // New enhanced state
  const [viewMode, setViewMode] = useState("table"); // "table", "calendar", "chart"
  const [showStats, setShowStats] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [filterProject, setFilterProject] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [loading, setLoading] = useState(false);
  const [weeklyGoal, setWeeklyGoal] = useState(40); // Default 40 hours per week
  const [showWeekends, setShowWeekends] = useState(true);
  const [autoSave, setAutoSave] = useState(false);
  const [highlightToday, setHighlightToday] = useState(true);
  const [showProjectColors, setShowProjectColors] = useState(true);

  // Enhanced project colors
  const projectColors = useMemo(() => {
    const colors = ["#fb923c", "#3b82f6", "#22c55e", "#8b5cf6", "#ef4444", "#06b6d4", "#f59e0b", "#ec4899"];
    const colorMap = {};
    projects.forEach((project, index) => {
      colorMap[project.id] = colors[index % colors.length];
    });
    return colorMap;
  }, [projects]);

  // Existing data fetching
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUserId(user?.id);

        const { data: projectsData } = await supabase
          .from("projects")
          .select("*")
          .order("name", { ascending: true });
        setProjects(projectsData || []);

        if (user?.id) {
          const { data: entriesData } = await supabase
            .from("entries")
            .select("*")
            .eq("user_id", user.id)
            .gte("date", format(weekStart, "yyyy-MM-dd"))
            .lte("date", format(addDays(weekStart, 6), "yyyy-MM-dd"));
          setEntries(entriesData || []);
        }
      } catch (error) {
        setSnackbar({ open: true, message: "Failed to fetch data", severity: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [weekStart]);

  // Existing computed values
  const projectRows = useMemo(() => {
    const map = {};
    projects.forEach((p) => {
      map[p.id] = { project: p, times: Array(DAYS_IN_WEEK).fill("") };
    });
    
    for (const p of projects) {
      for (let i = 0; i < DAYS_IN_WEEK; i++) {
        const day = format(addDays(weekStart, i), "yyyy-MM-dd");
        const durations = entries
          .filter(e => e.project_id === p.id && e.date === day)
          .map(e => e.duration || "00:00:00");
        map[p.id].times[i] = durations.length > 0 ? sumDurationsHMS(durations) : "";
      }
    }
    
    // Filter by selected project if any
    const rows = Object.values(map);
    return filterProject ? rows.filter(row => row.project.id === filterProject) : rows;
  }, [projects, entries, weekStart, filterProject]);

  // New computed values
  const weeklyStats = useMemo(() => {
    return getWeeklyStats(projectRows, addingRows);
  }, [projectRows, addingRows]);

  const goalProgress = useMemo(() => {
    const [h, m] = weeklyStats.totalHours.split(":").map(Number);
    const totalHours = h + m / 60;
    return Math.min((totalHours / weeklyGoal) * 100, 100);
  }, [weeklyStats.totalHours, weeklyGoal]);

  // Sync editTimes with projectRows
  useEffect(() => {
    const newEditTimes = {};
    const newIsEditing = {};
    projectRows.forEach(row => {
      newEditTimes[row.project.id] = [...row.times];
      newIsEditing[row.project.id] = Array(DAYS_IN_WEEK).fill(false);
    });
    setEditTimes(newEditTimes);
    setIsEditing(newIsEditing);
  }, [projectRows]);

  // Existing handlers
  const handleAddRow = () => {
    setAddingRows((rows) => [
      ...rows,
      { project_id: "", times: Array(DAYS_IN_WEEK).fill("") },
    ]);
  };

  const handleRemoveRow = (idx) => {
    setAddingRows((rows) => rows.filter((_, i) => i !== idx));
  };

  const handleSelectProject = (idx, value) => {
    setAddingRows((rows) =>
      rows.map((row, i) =>
        i === idx ? { ...row, project_id: value } : row
      )
    );
  };

  const handleTimeChange = (rowIdx, dayIdx, value) => {
    setAddingRows((rows) =>
      rows.map((row, i) =>
        i === rowIdx
          ? {
              ...row,
              times: row.times.map((t, j) =>
                j === dayIdx ? formatToHMS(value) : t
              ),
            }
          : row
      )
    );
  };

  const handleEditTime = (projectId, dayIdx, value) => {
    setEditTimes(prev => ({
      ...prev,
      [projectId]: prev[projectId].map((t, i) => i === dayIdx ? formatToHMS(value) : t)
    }));
  };

  const handleStartEdit = (projectId, dayIdx) => {
    setIsEditing(prev => ({
      ...prev,
      [projectId]: prev[projectId].map((v, i) => i === dayIdx ? true : v)
    }));
  };

  const handleStopEdit = (projectId, dayIdx) => {
    setIsEditing(prev => ({
      ...prev,
      [projectId]: prev[projectId].map((v, i) => i === dayIdx ? false : v)
    }));
  };

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      for (const projectId of Object.keys(editTimes)) {
        for (let dayIdx = 0; dayIdx < DAYS_IN_WEEK; dayIdx++) {
          const date = format(addDays(weekStart, dayIdx), "yyyy-MM-dd");
          const duration = editTimes[projectId][dayIdx];
          const entry = entries.find(
            e => e.project_id === projectId && e.date === date
          );
          if (entry) {
            if (duration !== durationStrToHMS(entry.duration || "00:00:00")) {
              await supabase
                .from("entries")
                .update({ duration })
                .eq("id", entry.id);
            }
          } else if (duration && duration !== "00:00:00") {
            await supabase.from("entries").insert([
              {
                user_id: userId,
                project_id: projectId,
                date,
                duration,
                start: "",
                end: "",
                description: "",
                status: "pending",
              },
            ]);
          }
        }
      }
      
      // Refetch entries
      const { data: entriesData } = await supabase
        .from("entries")
        .select("*")
        .eq("user_id", userId)
        .gte("date", format(weekStart, "yyyy-MM-dd"))
        .lte("date", format(addDays(weekStart, 6), "yyyy-MM-dd"));
      setEntries(entriesData || []);
      
      setSnackbar({ open: true, message: "Timesheet saved successfully", severity: "success" });
    } catch (error) {
      setSnackbar({ open: true, message: "Failed to save timesheet", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRow = async (row) => {
    if (!row.project_id) return;
    setLoading(true);
    try {
      for (let i = 0; i < DAYS_IN_WEEK; i++) {
        const duration = row.times[i];
        if (duration) {
          await supabase.from("entries").insert([
            {
              user_id: userId,
              project_id: row.project_id,
              date: format(addDays(weekStart, i), "yyyy-MM-dd"),
              duration: duration,
              start: "",
              end: "",
              description: "",
              status: "pending",
            },
          ]);
        }
      }
      setAddingRows([{ project_id: "", times: Array(DAYS_IN_WEEK).fill("") }]);
      
      // Refetch entries
      const { data: entriesData } = await supabase
        .from("entries")
        .select("*")
        .eq("user_id", userId)
        .gte("date", format(weekStart, "yyyy-MM-dd"))
        .lte("date", format(addDays(weekStart, 6), "yyyy-MM-dd"));
      setEntries(entriesData || []);
      
      setSnackbar({ open: true, message: "Row added successfully", severity: "success" });
    } catch (error) {
      setSnackbar({ open: true, message: "Failed to add row", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Navigation handlers
  const handlePrevWeek = () => setWeekStart(addDays(weekStart, -7));
  const handleNextWeek = () => setWeekStart(addDays(weekStart, 7));
  const handleToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const handlePrint = () => {
    window.print();
  };

  // Table data
  const days = Array.from({ length: DAYS_IN_WEEK }, (_, i) =>
    addDays(weekStart, i)
  );

  const dayTotals = useMemo(() => {
    return days.map((_, i) =>
      sumHMS([
        ...projectRows.map((row) => row.times[i]),
        ...addingRows.map((row) => row.times[i]),
      ])
    );
  }, [projectRows, addingRows, days]);

  const projectTotals = (row) => sumHMS(row.times);

  const grandTotal = sumHMS([
    ...projectRows.flatMap((row) => row.times),
    ...addingRows.flatMap((row) => row.times),
  ]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          py: { xs: 2, md: 4 },
          px: { xs: 0, sm: 1, md: 2 },
          width: "100%",
          maxWidth: "100vw",
          boxSizing: "border-box",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: { xs: "100vw", md: "100%" },
            mx: "auto",
            display: "flex",
            flexDirection: "column",
            gap: { xs: 2, md: 3 },
            px: { xs: 0.5, sm: 1, md: 2 },
            boxSizing: "border-box",
          }}
        >
          {/* Enhanced Stats Card */}
          <AnimatePresence>
            {showStats && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ width: "100%" }}
              >
                <GlassCard
                  title="Weekly Overview"
                  icon={<FaChartBar size={16} />}
                  delay={0}
                  sx={{ width: "100%", mb: 2 }}
                  whileHover={{}}
                >
                  <Box sx={{ p: 2.5 }}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: "success.light", color: "success.dark", height: "100%" }}>
                          <CardContent sx={{ textAlign: "center", py: 2 }}>
                            <Typography variant="h4" fontWeight={700}>
                              {weeklyStats.totalHours}
                            </Typography>
                            <Typography variant="caption">Total Hours</Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={goalProgress} 
                              sx={{ mt: 1, bgcolor: "success.dark", "& .MuiLinearProgress-bar": { bgcolor: "success.main" } }}
                            />
                            <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                              {goalProgress.toFixed(1)}% of {weeklyGoal}h goal
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: "info.light", color: "info.dark", height: "100%" }}>
                          <CardContent sx={{ textAlign: "center", py: 2 }}>
                            <Typography variant="h4" fontWeight={700}>
                              {weeklyStats.totalProjects}
                            </Typography>
                            <Typography variant="caption">Active Projects</Typography>
                            <Box sx={{ mt: 1 }}>
                              <FaProjectDiagram size={24} />
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: "warning.light", color: "warning.dark", height: "100%" }}>
                          <CardContent sx={{ textAlign: "center", py: 2 }}>
                            <Typography variant="h4" fontWeight={700}>
                              {(weeklyStats.dailyAverage / 60).toFixed(1)}h
                            </Typography>
                            <Typography variant="caption">Daily Average</Typography>
                            <Box sx={{ mt: 1 }}>
                              <FaClock size={24} />
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: "background.paper", border: 1, borderColor: "divider", height: "100%" }}>
                          <CardContent sx={{ textAlign: "center", py: 2 }}>
                            <Typography variant="h6" fontWeight={700} color="text.primary">
                              {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d")}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Current Week</Typography>
                            <Box sx={{ mt: 1 }}>
                              <FaCalendarAlt size={24} color="#fb923c" />
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Enhanced Timesheet Table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
            <GlassCard
              title="Weekly Timesheet"
              icon={<FaListAlt size={16} />}
              delay={0}
              sx={{ width: "100%", maxWidth: "100%", overflow: 'hidden' }}
              whileHover={{}}
            >
              <Box sx={{ p: 2.5 }}>
                {/* Enhanced Header Controls */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 2 }}>
                  {/* Left side - Navigation */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Button
                      variant="outlined"
                      onClick={handlePrevWeek}
                      sx={{
                        borderRadius: 2,
                        fontWeight: 600,
                        color: "text.primary",
                        borderColor: "divider",
                        bgcolor: "background.paper",
                        transition: "all 0.3s",
                        minWidth: 32,
                        px: 1,
                        py: 0.5,
                        fontSize: "0.9rem",
                        "&:hover": {
                          borderColor: "warning.main",
                          color: "warning.main",
                        },
                      }}
                    >
                      &lt;
                    </Button>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <TextField
                        type="date"
                        value={format(weekStart, "yyyy-MM-dd")}
                        onChange={e => setWeekStart(startOfWeek(new Date(e.target.value), { weekStartsOn: 1 }))}
                        size="small"
                        sx={{
                          bgcolor: "background.default",
                          borderRadius: 2,
                          minWidth: 110,
                          "& .MuiInputBase-input": { fontSize: "0.95rem", py: 0.5 },
                          "& .MuiInputBase-input::-webkit-calendar-picker-indicator": {
                            filter: mode === "light" ? "invert(1)" : "none",
                            cursor: "pointer",
                            opacity: 0.8,
                            "&:hover": {
                              opacity: 1,
                            },
                          },
                          "& input[type='date']::-webkit-calendar-picker-indicator": {
                            filter: mode === "light" ? "invert(1)" : "none",
                            cursor: "pointer",
                            opacity: 0.8,
                            "&:hover": {
                              opacity: 1,
                            },
                          },
                        }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Week {format(weekStart, "w")}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      onClick={handleNextWeek}
                      sx={{
                        borderRadius: 2,
                        fontWeight: 600,
                        color: "text.primary",
                        borderColor: "divider",
                        bgcolor: "background.paper",
                        transition: "all 0.3s",
                        minWidth: 32,
                        px: 1,
                        py: 0.5,
                        fontSize: "0.9rem",
                        "&:hover": {
                          borderColor: "warning.main",
                          color: "warning.main",
                        },
                      }}
                    >
                      &gt;
                    </Button>
                    <Button
                      onClick={handleToday}
                      variant="outlined"
                      size="small"
                      sx={{
                        borderRadius: 2,
                        fontWeight: 600,
                        color: "text.primary",
                        borderColor: "divider",
                        bgcolor: "background.paper",
                        transition: "all 0.3s",
                        "&:hover": {
                          borderColor: "success.main",
                          color: "success.main",
                        },
                      }}
                    >
                      Today
                    </Button>
                  </Box>

                  {/* Right side - Action buttons */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Tooltip title="Filter by project">
                      <Select
                        value={filterProject}
                        onChange={(e) => setFilterProject(e.target.value)}
                        size="small"
                        displayEmpty
                        sx={{
                          minWidth: 120,
                          bgcolor: "background.paper",
                          borderRadius: 2,
                        }}
                      >
                        <MenuItem value="">All Projects</MenuItem>
                        {projects.map((project) => (
                          <MenuItem key={project.id} value={project.id}>
                            {project.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </Tooltip>

                    <Tooltip title="Print timesheet">
                      <IconButton
                        onClick={handlePrint}
                        size="small"
                        sx={{
                          bgcolor: "background.paper",
                          border: 1,
                          borderColor: "divider",
                          color: "text.primary",
                          "&:hover": {
                            bgcolor: "warning.light",
                            borderColor: "warning.main",
                            color: "warning.dark",
                          },
                        }}
                      >
                        <FaPrint />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Toggle statistics">
                      <IconButton
                        onClick={() => setShowStats(!showStats)}
                        size="small"
                        sx={{
                          bgcolor: showStats ? "success.light" : "background.paper",
                          border: 1,
                          borderColor: showStats ? "success.main" : "divider",
                          color: showStats ? "success.dark" : "text.primary",
                          "&:hover": {
                            bgcolor: "success.light",
                            borderColor: "success.main",
                          },
                        }}
                      >
                        <FaChartBar />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Settings">
                      <IconButton
                        onClick={() => setSettingsOpen(true)}
                        size="small"
                        sx={{
                          bgcolor: "background.paper",
                          border: 1,
                          borderColor: "divider",
                          color: "text.primary",
                          "&:hover": {
                            bgcolor: "warning.light",
                            borderColor: "warning.main",
                            color: "warning.dark",
                          },
                        }}
                      >
                        <FaCog />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Active Filters Display */}
                {filterProject && (
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label={`Filtered: ${projects.find(p => p.id === filterProject)?.name}`}
                      onDelete={() => setFilterProject("")}
                      color="info"
                      variant="filled"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                )}

                {/* Loading Progress */}
                {loading && (
                  <Box sx={{ mb: 2 }}>
                    <LinearProgress color="warning" />
                  </Box>
                )}

                {/* Enhanced Table */}
                <TableContainer
                  component={Paper}
                  sx={{
                    borderRadius: 2,
                    bgcolor: "background.default",
                    boxShadow: mode === "dark"
                      ? "0 2px 8px 0 rgba(0,0,0,0.18)"
                      : "0 2px 8px 0 rgba(251,146,60,0.10)",
                    minWidth: 600,
                    overflowX: "auto",
                    border: 1,
                    borderColor: "divider",
                  }}
                >
                  <Table
                    sx={{
                      minWidth: 600,
                      "& td, & th": {
                        borderRight: "none !important",
                        borderLeft: "none !important",
                      },
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            width: 120,
                            fontSize: "0.85rem",
                            bgcolor: theme.palette.mode === "dark"
                              ? "#35363c"
                              : "#e5e7eb",
                          }}
                        >
                          Projects
                        </TableCell>
                        {days.map((d, i) => (
                          <TableCell
                            key={i}
                            align="center"
                            sx={{
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              bgcolor: isToday(d) && highlightToday
                                ? "warning.light"
                                : theme.palette.mode === "dark"
                                  ? "#35363c"
                                  : "#e5e7eb",
                              px: 0.5,
                              color: isToday(d) && highlightToday ? "warning.dark" : "inherit",
                            }}
                          >
                            <Box>
                              <Typography variant="caption" fontWeight={700}>
                                {format(d, "EEE")}
                              </Typography>
                              <Typography variant="caption" sx={{ display: "block", fontSize: "0.7rem" }}>
                                {format(d, "MMM d")}
                              </Typography>
                            </Box>
                          </TableCell>
                        ))}
                        <TableCell
                          align="center"
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            bgcolor: theme.palette.mode === "dark"
                              ? "#35363c"
                              : "#e5e7eb",
                          }}
                        >
                          Total
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* Existing project rows with enhancements */}
                      {projectRows.map((row, idx) => (
                        <TableRow
                          key={row.project.id}
                          sx={{
                            bgcolor: "background.paper",
                            "&:hover": {
                              bgcolor: "action.hover",
                            },
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              {showProjectColors && (
                                <Box
                                  sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: "50%",
                                    bgcolor: projectColors[row.project.id] || "#fb923c",
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                              <Typography fontSize="0.97rem" fontWeight={500}>
                                {row.project.name}
                              </Typography>
                            </Box>
                          </TableCell>
                          {row.times.map((t, i) => (
                            <TableCell key={i} align="center" sx={{ px: 0.5 }}>
                              <TextField
                                value={t}
                                variant="outlined"
                                size="small"
                                inputProps={{
                                  style: {
                                    textAlign: "center",
                                    width: 60,
                                    fontSize: "0.95rem",
                                  },
                                  readOnly: true,
                                  tabIndex: -1,
                                }}
                                disabled
                                sx={{
                                  bgcolor: isToday(days[i]) && highlightToday 
                                    ? "warning.light" 
                                    : "background.paper",
                                  borderRadius: 1,
                                  "& .MuiInputBase-input.Mui-disabled": {
                                    WebkitTextFillColor: theme.palette.text.primary,
                                  },
                                  m: 0,
                                }}
                              />
                            </TableCell>
                          ))}
                          <TableCell
                            align="center"
                            sx={{
                              px: 0.5,
                              bgcolor: "background.paper",
                              borderLeft: "none !important",
                            }}
                          >
                            <Chip
                              label={projectTotals(row)}
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ fontWeight: 700, fontSize: "0.8rem" }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Enhanced adding rows */}
                      {addingRows.map((row, idx) => (
                        <TableRow
                          key={`add-${idx}`}
                          sx={{
                            bgcolor: "background.paper",
                            border: 2,
                            borderColor: "primary.main",
                            borderStyle: "dashed",
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <FaPlusCircle color="#38bdf8" size={16} />
                              <Select
                                value={row.project_id}
                                displayEmpty
                                size="small"
                                sx={{
                                  minWidth: 80,
                                  color: "#38bdf8",
                                  bgcolor: "background.paper",
                                  borderRadius: 1,
                                  fontSize: "0.95rem",
                                }}
                                disabled
                                inputProps={{ readOnly: true, tabIndex: -1 }}
                              >
                                <MenuItem value="">
                                  <em>Select Project</em>
                                </MenuItem>
                                {projects.map((p) => (
                                  <MenuItem key={p.id} value={p.id}>
                                    {p.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </Box>
                          </TableCell>
                          {row.times.map((t, i) => (
                            <TableCell key={i} align="center" sx={{ px: 0.5 }}>
                              <TextField
                                value={formatToHMS(t)}
                                variant="outlined"
                                size="small"
                                inputProps={{
                                  style: { textAlign: "center", width: 60, fontSize: "0.95rem" },
                                  readOnly: true,
                                  tabIndex: -1,
                                }}
                                disabled
                                sx={{
                                  bgcolor: "background.paper",
                                  borderRadius: 1,
                                  m: 0,
                                }}
                              />
                            </TableCell>
                          ))}
                          <TableCell
                            align="center"
                            sx={{
                              px: 0.5,
                              bgcolor: "background.paper",
                              borderLeft: "none !important",
                            }}
                          >
                            <Chip
                              label={projectTotals(row)}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ fontWeight: 700, fontSize: "0.8rem" }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Enhanced total row */}
                      <TableRow>
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.95rem",
                            bgcolor: theme.palette.mode === "dark"
                              ? "#35363c"
                              : "#e5e7eb",
                            borderTop: `2px solid ${theme.palette.mode === "dark" ? "#444" : "#d1d5db"}`,
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <FaClock color="#fb923c" />
                            <Typography fontWeight={700}>Weekly Total</Typography>
                          </Box>
                        </TableCell>
                        {dayTotals.map((t, i) => (
                          <TableCell
                            key={i}
                            align="center"
                            sx={{
                              px: 0.5,
                              bgcolor: isToday(days[i]) && highlightToday
                                ? "warning.light"
                                : theme.palette.mode === "dark"
                                  ? "#35363c"
                                  : "#e5e7eb",
                              borderTop: `2px solid ${theme.palette.mode === "dark" ? "#444" : "#d1d5db"}`,
                            }}
                          >
                            <Chip
                              label={t}
                              size="small"
                              color={isToday(days[i]) && highlightToday ? "warning" : "default"}
                              variant={isToday(days[i]) && highlightToday ? "filled" : "outlined"}
                            />
                          </TableCell>
                        ))}
                        <TableCell
                          align="center"
                          sx={{
                            px: 0.5,
                            bgcolor: theme.palette.mode === "dark"
                              ? "#35363c"
                              : "#e5e7eb",
                            borderTop: `2px solid ${theme.palette.mode === "dark" ? "#444" : "#d1d5db"}`,
                            borderLeft: "none !important",
                          }}
                        >
                          <Chip
                            label={grandTotal}
                            size="medium"
                            color="warning"
                            variant="filled"
                            sx={{ fontWeight: 700, fontSize: "0.9rem" }}
                          />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {/* Enhanced action buttons */}
                <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    {/* Keep view-only buttons disabled */}
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      variant="outlined"
                      color="info"
                      size="small"
                      onClick={() => setStatsDialogOpen(true)}
                      startIcon={<FaChartBar />}
                      sx={{ borderRadius: 2, fontWeight: 600 }}
                    >
                      Detailed Stats
                    </Button>
                  </Box>
                </Box>
              </Box>
            </GlassCard>
          </motion.div>
        </Box>

        {/* Settings Dialog */}
        <Dialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              bgcolor: "background.paper",
              boxShadow: mode === "dark"
                ? "0 4px 24px 0 rgba(0,0,0,0.24)"
                : "0 4px 24px 0 rgba(251,146,60,0.06)",
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 700, color: "text.primary" }}>
            Timesheet Settings
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
              <TextField
                label="Weekly Goal (hours)"
                type="number"
                value={weeklyGoal}
                onChange={(e) => setWeeklyGoal(Number(e.target.value))}
                size="small"
                sx={{ bgcolor: "background.default", borderRadius: 2 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={compactMode}
                    onChange={(e) => setCompactMode(e.target.checked)}
                    color="warning"
                  />
                }
                label="Compact Mode"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showProjectColors}
                    onChange={(e) => setShowProjectColors(e.target.checked)}
                    color="warning"
                  />
                }
                label="Show Project Colors"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={highlightToday}
                    onChange={(e) => setHighlightToday(e.target.checked)}
                    color="warning"
                  />
                }
                label="Highlight Today"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={autoSave}
                    onChange={(e) => setAutoSave(e.target.checked)}
                    color="warning"
                  />
                }
                label="Auto Save (Coming Soon)"
                disabled
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setSettingsOpen(false)}
              color="warning"
              variant="contained"
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Detailed Stats Dialog */}
        <Dialog
          open={statsDialogOpen}
          onClose={() => setStatsDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              bgcolor: "background.paper",
              boxShadow: mode === "dark"
                ? "0 4px 24px 0 rgba(0,0,0,0.24)"
                : "0 4px 24px 0 rgba(251,146,60,0.06)",
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 700, color: "text.primary" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FaChartBar color="#fb923c" />
              Detailed Statistics
            </Box>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 2, bgcolor: "background.default" }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Project Breakdown
                  </Typography>
                  {Object.entries(weeklyStats.projectBreakdown).map(([project, hours], index) => (
                    <Box key={project} sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            bgcolor: projectColors[projects.find(p => p.name === project)?.id] || "#fb923c",
                          }}
                        />
                        <Typography variant="body2">{project}</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={600}>
                        {hours}
                      </Typography>
                    </Box>
                  ))}
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ p: 2, bgcolor: "background.default" }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    Daily Breakdown
                  </Typography>
                  {days.map((day, index) => (
                    <Box key={index} sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2">
                        {format(day, "EEEE, MMM d")}
                      </Typography>
                      <Chip
                        label={dayTotals[index]}
                        size="small"
                        color={isToday(day) ? "warning" : "default"}
                        variant={isToday(day) ? "filled" : "outlined"}
                      />
                    </Box>
                  ))}
                </Card>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setStatsDialogOpen(false)}
              color="warning"
              variant="contained"
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%', borderRadius: 2 }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* Floating Action Button */}
        <Zoom in={true}>
          <Fab
            color="warning"
            sx={{
              position: "fixed",
              bottom: 24,
              right: 24,
              zIndex: 1000,
            }}
            onClick={() => window.open('/timetracker', '_blank')}
          >
            <FaPlus />
          </Fab>
        </Zoom>
      </Box>
    </ThemeProvider>
  );
}