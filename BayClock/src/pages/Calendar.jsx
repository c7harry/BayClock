import React, { useMemo, useState, useEffect } from "react";
import {
  ThemeProvider,
  CssBaseline,
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  ButtonGroup,
  Fab,
  Zoom,
  Card,
  CardContent,
  Divider,
  Grid,
  Switch,
  FormControlLabel,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import { format, startOfWeek, addDays, isToday, setHours, setMinutes, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isWeekend } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { createTheme } from "@mui/material/styles";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { FaCalendar, FaPlus, FaFilter, FaChartBar, FaClock, FaProjectDiagram } from "react-icons/fa";
import { MdViewWeek, MdViewModule, MdSettings, MdRefresh } from "react-icons/md";
import { GlassCard } from "../components/Theme";

// Get the start of the week (Sunday)
function getWeekStart(date) {
  return startOfWeek(date, { weekStartsOn: 0 });
}

// Get all days in the current week
function getWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

// Get all hours in a day (0-23)
function getDayHours() {
  return Array.from({ length: 24 }, (_, i) => i);
}

// Format hour as AM/PM
function formatHour(hour) {
  const date = setHours(new Date(), hour);
  return format(date, "h a");
}

// Get entry's start and end hour as numbers
function getEntryHourRange(entry) {
  if (entry.start && entry.end) {
    const [startH] = entry.start.split(":").map(Number);
    const [endH] = entry.end.split(":").map(Number);
    return [startH, endH];
  }
  // fallback: show at 9am if no time
  return [9, 10];
}

// Helper: group entries by day and hour span (for rendering as one block)
function getSpanningEntries(entries, weekDays) {
  // Map: { [date]: [ { ...entry, startH, endH } ] }
  const map = {};
  weekDays.forEach((day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    map[dateStr] = [];
  });
  entries.forEach((entry) => {
    const dateStr = entry.date;
    if (!map[dateStr]) return;
    let [startH, endH] = getEntryHourRange(entry);
    // Clamp to 0-24
    startH = Math.max(0, Math.min(23, startH));
    endH = Math.max(startH + 1, Math.min(24, endH));
    map[dateStr].push({ ...entry, startH, endH });
  });
  return map;
}

// Utility: sum durations like "1h 30m 10s"
function sumDurationStr(str) {
  if (!str) return 0;
  let total = 0;
  const regex = /(\d+)h|(\d+)m|(\d+)s/g;
  let match;
  while ((match = regex.exec(str))) {
    if (match[1]) total += parseInt(match[1]) * 3600;
    if (match[2]) total += parseInt(match[2]) * 60;
    if (match[3]) total += parseInt(match[3]);
  }
  return total;
}

// Format duration in "Xh Ym"
function formatDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return [h ? `${h}h` : "", m ? `${m}m` : ""].filter(Boolean).join(" ") || "0m";
}

function getDayTotal(entries) {
  let total = 0;
  entries.forEach((entry) => {
    total += sumDurationStr(entry.duration);
  });
  // Format as HH:MM:SS
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// New: Get month view data
function getMonthDays(date) {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return eachDayOfInterval({ start, end });
}

// New: Calculate weekly stats
function getWeeklyStats(entries, weekDays) {
  let totalHours = 0;
  let totalEntries = 0;
  const projectCounts = {};
  
  weekDays.forEach(day => {
    const dateStr = format(day, "yyyy-MM-dd");
    const dayEntries = entries.filter(entry => entry.date === dateStr);
    totalEntries += dayEntries.length;
    
    dayEntries.forEach(entry => {
      totalHours += sumDurationStr(entry.duration);
      const projectName = entry.projectName || "No Project";
      projectCounts[projectName] = (projectCounts[projectName] || 0) + 1;
    });
  });

  const topProject = Object.keys(projectCounts).reduce((a, b) => 
    projectCounts[a] > projectCounts[b] ? a : b, "None");

  return {
    totalHours: totalHours / 3600, // Convert to hours
    totalEntries,
    topProject,
    averagePerDay: totalHours / (7 * 3600),
  };
}

export default function CalendarPage() {
  const navigate = useNavigate();

  // Route protection
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/login");
    });
  }, [navigate]);

  // Use dark/light mode like other pages
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
  
  const theme = React.useMemo(
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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entries, setEntries] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogEntries, setDialogEntries] = useState([]);
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const [projects, setProjects] = useState([]);
  const [projectMap, setProjectMap] = useState({});

  // New enhanced state
  const [viewMode, setViewMode] = useState("week"); // "week" or "month"
  const [showStats, setShowStats] = useState(false);
  const [showWeekends, setShowWeekends] = useState(true);
  const [selectedProject, setSelectedProject] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
  const [compactView, setCompactView] = useState(false);
  const [showProjectColors, setShowProjectColors] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Load entries from Supabase with enhanced refresh
  const fetchEntries = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.from("entries").select("*");
      if (!error) setEntries(data || []);
    } catch (err) {
      console.error("Failed to fetch entries:", err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEntries();
    window.addEventListener("entries-updated", fetchEntries);
    return () => window.removeEventListener("entries-updated", fetchEntries);
  }, []);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchEntries, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Fetch projects
  useEffect(() => {
    async function fetchProjects() {
      const { data, error } = await supabase.from("projects").select("id, name");
      if (!error && data) {
        setProjects(data);
        // Build a map for quick lookup
        const map = {};
        data.forEach((proj) => {
          map[proj.id] = proj.name;
        });
        setProjectMap(map);
      }
    }
    fetchProjects();
  }, []);

  // Enhanced computed values
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const monthDays = useMemo(() => getMonthDays(selectedDate), [selectedDate]);
  const hours = useMemo(() => getDayHours(), []);

  // Filter entries based on selected project
  const filteredEntries = useMemo(() => {
    if (!selectedProject) return entries;
    return entries.filter(entry => entry.project_id === selectedProject);
  }, [entries, selectedProject]);

  // Group entries by date for dialog
  const entriesByDate = useMemo(() => {
    const map = {};
    filteredEntries.forEach((entry) => {
      map[entry.date] = map[entry.date] || [];
      map[entry.date].push(entry);
    });
    return map;
  }, [filteredEntries]);

  // Group entries for spanning display
  const spanningEntries = useMemo(() => getSpanningEntries(filteredEntries, weekDays), [filteredEntries, weekDays]);

  // Weekly statistics
  const weeklyStats = useMemo(() => {
    return getWeeklyStats(filteredEntries, weekDays);
  }, [filteredEntries, weekDays]);

  // Project color mapping
  const projectColors = useMemo(() => {
    const colors = ["#fb923c", "#3b82f6", "#22c55e", "#8b5cf6", "#ef4444", "#06b6d4", "#f59e0b"];
    const colorMap = {};
    projects.forEach((project, index) => {
      colorMap[project.id] = colors[index % colors.length];
    });
    return colorMap;
  }, [projects]);

  // Navigation
  const handlePrevWeek = () => setWeekStart((ws) => addDays(ws, -7));
  const handleNextWeek = () => setWeekStart((ws) => addDays(ws, 7));
  const handleToday = () => setWeekStart(getWeekStart(new Date()));

  // Open dialog with entries for a block
  const handleBlockClick = (entry) => {
    setDialogEntries([entry]);
    setSelectedDate(new Date(entry.date));
    setDialogOpen(true);
  };

  // New handlers
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  const handleRefresh = () => {
    fetchEntries();
  };

  const handleProjectFilter = (projectId) => {
    setSelectedProject(projectId);
    setFilterMenuAnchor(null);
  };

  const clearFilters = () => {
    setSelectedProject("");
    setFilterMenuAnchor(null);
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
          overflowX: "auto",
          transition: "background 0.3s",
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
            alignItems: "center",
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
                  title="Weekly Statistics"
                  icon={<FaChartBar size={16} />}
                  delay={0}
                  sx={{ width: "100%", mb: 2 }}
                  whileHover={{}}
                >
                  <Box sx={{ p: 2.5 }}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: "success.light", color: "success.dark" }}>
                          <CardContent sx={{ textAlign: "center", py: 1.5 }}>
                            <Typography variant="h4" fontWeight={700}>
                              {weeklyStats.totalHours.toFixed(1)}h
                            </Typography>
                            <Typography variant="caption">Total Hours</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: "info.light", color: "info.dark" }}>
                          <CardContent sx={{ textAlign: "center", py: 1.5 }}>
                            <Typography variant="h4" fontWeight={700}>
                              {weeklyStats.totalEntries}
                            </Typography>
                            <Typography variant="caption">Total Entries</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: "warning.light", color: "warning.dark" }}>
                          <CardContent sx={{ textAlign: "center", py: 1.5 }}>
                            <Typography variant="h6" fontWeight={700} sx={{ fontSize: "1.2rem" }}>
                              {weeklyStats.topProject}
                            </Typography>
                            <Typography variant="caption">Top Project</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
                          <CardContent sx={{ textAlign: "center", py: 1.5 }}>
                            <Typography variant="h4" fontWeight={700} color="text.primary">
                              {weeklyStats.averagePerDay.toFixed(1)}h
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Daily Average</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Calendar Card */}
          <motion.div style={{ width: "100%" }}>
            <GlassCard
              title="Calendar"
              icon={<FaCalendar size={16} />}
              delay={0}
              sx={{ width: "100%", maxWidth: "100%" }}
              whileHover={{}}
            >
              <Box sx={{ p: 2.5 }}>
                {/* Enhanced Header with Controls */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 2 }}>
                  {/* Left side - Navigation */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Button
                      onClick={handlePrevWeek}
                      variant="outlined"
                      size="small"
                      startIcon={<ArrowBackIosNewIcon fontSize="small" />}
                      sx={{
                        borderRadius: 2,
                        fontWeight: 600,
                        color: "text.primary",
                        borderColor: "divider",
                        bgcolor: "background.paper",
                        transition: "all 0.3s",
                        "&:hover": {
                          borderColor: "warning.main",
                          color: "warning.main",
                        },
                      }}
                    >
                      Prev
                    </Button>
                    <Typography variant="h5" fontWeight={700} color="text.primary" sx={{ mx: 2 }}>
                      Week of {format(weekStart, "MMMM d, yyyy")}
                    </Typography>
                    <Button
                      onClick={handleNextWeek}
                      variant="outlined"
                      size="small"
                      endIcon={<ArrowForwardIosIcon fontSize="small" />}
                      sx={{
                        borderRadius: 2,
                        fontWeight: 600,
                        color: "text.primary",
                        borderColor: "divider",
                        bgcolor: "background.paper",
                        transition: "all 0.3s",
                        "&:hover": {
                          borderColor: "warning.main",
                          color: "warning.main",
                        },
                      }}
                    >
                      Next
                    </Button>
                  </Box>

                  {/* Center - View Mode Toggle */}
                  <ButtonGroup variant="outlined" size="small">
                    <Button
                      onClick={() => handleViewModeChange("week")}
                      variant={viewMode === "week" ? "contained" : "outlined"}
                      color="warning"
                      startIcon={<MdViewWeek />}
                    >
                      Week
                    </Button>
                    <Button
                      onClick={() => handleViewModeChange("month")}
                      variant={viewMode === "month" ? "contained" : "outlined"}
                      color="warning"
                      startIcon={<MdViewModule />}
                      disabled // Keep week view only for now since month view isn't implemented
                    >
                      Month
                    </Button>
                  </ButtonGroup>

                  {/* Right side - Action buttons */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
                    
                    <IconButton
                      onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
                      size="small"
                      sx={{
                        bgcolor: selectedProject ? "warning.light" : "background.paper",
                        border: 1,
                        borderColor: selectedProject ? "warning.main" : "divider",
                        color: selectedProject ? "warning.dark" : "text.primary",
                        "&:hover": {
                          bgcolor: "warning.light",
                          borderColor: "warning.main",
                        },
                      }}
                    >
                      <FaFilter />
                    </IconButton>

                    <IconButton
                      onClick={handleRefresh}
                      size="small"
                      disabled={refreshing}
                      sx={{
                        bgcolor: "background.paper",
                        border: 1,
                        borderColor: "divider",
                        color: "text.primary",
                        "&:hover": {
                          bgcolor: "info.light",
                          borderColor: "info.main",
                          color: "info.dark",
                        },
                      }}
                    >
                      <motion.div
                        animate={{ rotate: refreshing ? 360 : 0 }}
                        transition={{ duration: 1, repeat: refreshing ? Infinity : 0 }}
                      >
                        <MdRefresh />
                      </motion.div>
                    </IconButton>

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
                      <MdSettings />
                    </IconButton>
                  </Box>
                </Box>

                {/* Active Filters Display */}
                {selectedProject && (
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label={`Project: ${projectMap[selectedProject]}`}
                      onDelete={clearFilters}
                      color="warning"
                      variant="filled"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                )}

                {/* Enhanced Calendar Grid */}
                <Box
                  sx={{
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns: "80px repeat(7, 1fr)",
                    gridTemplateRows: compactView ? "32px 28px repeat(24, 32px)" : "32px 28px repeat(24, 48px)",
                    gap: 0,
                    borderRadius: 2,
                    overflow: "auto",
                    bgcolor: "background.default",
                    minHeight: compactView ? "800px" : "1200px",
                    transition: "all 0.3s",
                    border: 1,
                    borderColor: "divider",
                  }}
                >
                  {/* Enhanced dotted line overlay */}
                  <Box
                    sx={{
                      pointerEvents: "none",
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 1,
                      backgroundImage: `
                        linear-gradient(to right, ${mode === "dark" ? "#333" : "#ccc"} 1px, transparent 1.5px)
                      `,
                      backgroundSize: `calc((100% - 80px) / 7) ${compactView ? 32 : 48}px`,
                      backgroundPosition: `80px 60px`,
                      backgroundRepeat: "repeat",
                      opacity: 0.6,
                    }}
                  />

                  {/* Top-left empty cell */}
                  <Box
                    sx={{
                      gridColumn: "1",
                      gridRow: "1",
                      bgcolor: "background.paper",
                      zIndex: 10,
                      borderTopLeftRadius: 8,
                      borderRight: "1px solid",
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      transition: "background 0.3s",
                    }}
                  />

                  {/* Top-left total cell */}
                  <Box
                    sx={{
                      gridColumn: "1",
                      gridRow: "2",
                      bgcolor: "background.paper",
                      zIndex: 10,
                      borderRight: "1px solid",
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      transition: "background 0.3s",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  />

                  {/* Enhanced weekday headers */}
                  {weekDays.map((day, idx) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const total = getDayTotal(entriesByDate[dateStr] || []);
                    const dayEntries = entriesByDate[dateStr] || [];
                    const isWeekendDay = isWeekend(day);
                    
                    return (
                      <React.Fragment key={idx}>
                        {/* Enhanced weekday header */}
                        <Box
                          sx={{
                            gridColumn: `${idx + 2} / ${idx + 3}`,
                            gridRow: "1/2",
                            bgcolor: isToday(day) 
                              ? "warning.light" 
                              : isWeekendDay 
                                ? "background.default" 
                                : "background.paper",
                            textAlign: "center",
                            py: 0.5,
                            fontWeight: 700,
                            color: isToday(day) ? "warning.dark" : "text.primary",
                            zIndex: 2,
                            borderTopLeftRadius: idx === 0 ? 8 : 0,
                            borderTopRightRadius: idx === 6 ? 8 : 0,
                            borderBottom: "1px solid",
                            transition: "all 0.3s",
                            border: isToday(day) ? 2 : 1,
                            borderColor: isToday(day) ? "warning.main" : "divider",
                          }}
                        >
                          <Typography 
                            variant="subtitle2" 
                            fontWeight={700}
                            sx={{ 
                              color: isToday(day) ? "warning.dark" : "text.primary",
                              fontSize: "0.8rem"
                            }}
                          >
                            {format(day, "EEE, MMM d")}
                          </Typography>
                        </Box>

                        {/* Enhanced total time row */}
                        <Box
                          sx={{
                            gridColumn: `${idx + 2} / ${idx + 3}`,
                            gridRow: "2/3",
                            bgcolor: isToday(day) 
                              ? "success.light" 
                              : isWeekendDay 
                                ? "background.default" 
                                : "background.paper",
                            textAlign: "center",
                            fontWeight: 600,
                            color: isToday(day) ? "success.dark" : "success.main",
                            fontSize: 13,
                            zIndex: 2,
                            pt: 0.5,
                            pb: 0.5,
                            borderBottom: "1px solid",
                            transition: "all 0.3s",
                            border: isToday(day) ? 2 : 1,
                            borderColor: isToday(day) ? "success.main" : "divider",
                          }}
                        >
                          <Typography variant="caption" fontWeight={700}>
                            {total}
                          </Typography>
                        </Box>
                      </React.Fragment>
                    );
                  })}

                  {/* Enhanced hour labels */}
                  {hours.map((hour) => (
                    <Box
                      key={hour}
                      sx={{
                        gridColumn: "1/2",
                        gridRow: `${hour + 3} / ${hour + 4}`,
                        bgcolor: "background.paper",
                        borderRight: "1px solid",
                        borderColor: "divider",
                        textAlign: "right",
                        pr: "10px",
                        pl: "1px",
                        fontSize: compactView ? 10 : 12,
                        color: "text.secondary",
                        fontWeight: 500,
                        zIndex: 2,
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "flex-end",
                        minHeight: compactView ? "32px" : "48px",
                        lineHeight: 1,
                        overflow: "visible",
                        minWidth: "40px",
                        transition: "all 0.3s",
                        "&:hover": {
                          bgcolor: "action.hover",
                        },
                      }}
                    >
                      {formatHour(hour)}
                    </Box>
                  ))}

                  {/* Enhanced horizontal grid lines */}
                  {hours.map((hour) =>
                    hour === 0 ? null : (
                      <Box
                        key={hour}
                        sx={{
                          position: "absolute",
                          left: 80,
                          right: 0,
                          top: 32 + 28 + hour * (compactView ? 32 : 48),
                          height: 0,
                          borderTop: `1px solid ${mode === "dark" ? "#333" : "#ccc"}`,
                          zIndex: 1,
                          pointerEvents: "none",
                          opacity: hour % 3 === 0 ? 0.8 : 0.4, // Emphasize every 3rd hour
                        }}
                      />
                    )
                  )}

                  {/* Enhanced calendar blocks */}
                  {weekDays.map((day, dayIdx) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    return spanningEntries[dateStr].map((entry, entryIdx) => {
                      let [startH, startM] = entry.start ? entry.start.split(":").map(Number) : [9, 0];
                      let [endH, endM] = entry.end ? entry.end.split(":").map(Number) : [startH + 1, 0];

                      const hourHeight = compactView ? 32 : 48;
                      const startOffset = startH * hourHeight + (startM / 60) * hourHeight;
                      const endOffset = endH * hourHeight + (endM / 60) * hourHeight;
                      const blockTop = 60 + startOffset;
                      const blockHeight = Math.max(compactView ? 20 : 28, endOffset - startOffset);

                      const projectColor = showProjectColors 
                        ? projectColors[entry.project_id] || "#fb923c"
                        : "#fb923c";

                      return (
                        <motion.div
                          key={`${entry.id}-${entryIdx}`}
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: entryIdx * 0.1 }}
                          whileHover={{ scale: 1.02, zIndex: 5 }}
                          style={{
                            position: "absolute",
                            left: `calc(80px + ${dayIdx} * (100% - 80px) / 7 + 8px)`, 
                            width: "calc((100% - 80px) / 7 - 14px)",
                            top: `${blockTop}px`,
                            height: `${blockHeight}px`,
                            zIndex: 3,
                          }}
                        >
                          <Tooltip
                            title={
                              <Box>
                                <Typography fontWeight={700} sx={{ mb: 0.5 }}>
                                  {entry.description}
                                </Typography>
                                <Typography color="warning.main" fontWeight={700} sx={{ mb: 0.5 }}>
                                  {projectMap[entry.project_id] || "No Project"}
                                </Typography>
                                <Typography variant="caption" sx={{ display: "block" }}>
                                  {entry.start
                                    ? format(
                                        setHours(
                                          setMinutes(new Date(), Number(entry.start.split(":")[1])),
                                          Number(entry.start.split(":")[0])
                                        ),
                                        "h:mm a"
                                      )
                                    : ""}
                                  {" - "}
                                  {entry.end
                                    ? format(
                                        setHours(
                                          setMinutes(new Date(), Number(entry.end.split(":")[1])),
                                          Number(entry.end.split(":")[0])
                                        ),
                                        "h:mm a"
                                      )
                                    : ""}
                                </Typography>
                                <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                                  Duration: {(() => {
                                    const sec = sumDurationStr(entry.duration);
                                    const h = String(Math.floor(sec / 3600)).padStart(2, "0");
                                    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
                                    const s = String(sec % 60).padStart(2, "0");
                                    return `${h}:${m}:${s}`;
                                  })()}
                                </Typography>
                              </Box>
                            }
                            arrow
                            placement="top"
                          >
                            <Box
                              onClick={() => handleBlockClick(entry)}
                              sx={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                top: 0,
                                bottom: 0,
                                px: 0.5,
                                py: 0.5,
                                bgcolor: `${projectColor}20`,
                                color: mode === "dark" ? "#fff" : "#18181b",
                                fontSize: compactView ? 11 : 13,
                                fontWeight: 600,
                                whiteSpace: "normal",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                boxShadow: mode === "dark"
                                  ? "0 3px 12px 0 rgba(0,0,0,0.25)"
                                  : "0 3px 12px 0 rgba(0,0,0,0.08)",
                                border: "2px solid",
                                borderColor: projectColor,
                                cursor: "pointer",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                borderRadius: 2,
                                transition: "all 0.3s",
                                "&:hover": {
                                  bgcolor: `${projectColor}30`,
                                  transform: "translateY(-1px)",
                                  boxShadow: mode === "dark"
                                    ? "0 4px 16px 0 rgba(0,0,0,0.35)"
                                    : "0 4px 16px 0 rgba(0,0,0,0.15)",
                                },
                              }}
                            >
                              <Box>
                                <Typography 
                                  variant="subtitle2" 
                                  fontWeight={700} 
                                  sx={{ 
                                    color: "inherit",
                                    fontSize: compactView ? "0.7rem" : "0.8rem",
                                    lineHeight: 1.2,
                                  }}
                                >
                                  {entry.description}
                                </Typography>
                                {!compactView && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: projectColor,
                                      fontWeight: 700,
                                      display: "block",
                                      mt: 0.5,
                                      wordBreak: "break-word",
                                      fontSize: "0.7rem",
                                    }}
                                  >
                                    {projectMap[entry.project_id] || "No Project"}
                                  </Typography>
                                )}
                              </Box>
                              {!compactView && (
                                <Box sx={{ mt: 1, textAlign: "right" }}>
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      color: "inherit", 
                                      fontWeight: 700,
                                      fontSize: "0.7rem",
                                    }}
                                  >
                                    {(() => {
                                      const sec = sumDurationStr(entry.duration);
                                      const h = String(Math.floor(sec / 3600)).padStart(2, "0");
                                      const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
                                      const s = String(sec % 60).padStart(2, "0");
                                      return `${h}:${m}:${s}`;
                                    })()}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </Tooltip>
                        </motion.div>
                      );
                    });
                  })}
                </Box>
              </Box>
            </GlassCard>
          </motion.div>
        </Box>

        {/* Enhanced Filter Menu */}
        <Menu
          anchorEl={filterMenuAnchor}
          open={Boolean(filterMenuAnchor)}
          onClose={() => setFilterMenuAnchor(null)}
          PaperProps={{
            sx: {
              borderRadius: 2,
              bgcolor: "background.paper",
              boxShadow: mode === "dark"
                ? "0 4px 24px 0 rgba(0,0,0,0.24)"
                : "0 4px 24px 0 rgba(251,146,60,0.06)",
              minWidth: 200,
            }
          }}
        >
          <MenuItem onClick={clearFilters}>
            <Typography fontWeight={600}>All Projects</Typography>
          </MenuItem>
          <Divider />
          {projects.map((project) => (
            <MenuItem 
              key={project.id} 
              onClick={() => handleProjectFilter(project.id)}
              selected={selectedProject === project.id}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {showProjectColors && (
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      bgcolor: projectColors[project.id] || "#fb923c",
                    }}
                  />
                )}
                <Typography>{project.name}</Typography>
              </Box>
            </MenuItem>
          ))}
        </Menu>

        {/* Enhanced Settings Dialog */}
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
            Calendar Settings
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={compactView}
                    onChange={(e) => setCompactView(e.target.checked)}
                    color="warning"
                  />
                }
                label="Compact View"
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
                    checked={showWeekends}
                    onChange={(e) => setShowWeekends(e.target.checked)}
                    color="warning"
                  />
                }
                label="Show Weekends"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    color="warning"
                  />
                }
                label="Auto Refresh (30s)"
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

        {/* Original dialog (enhanced) */}
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              bgcolor: "background.paper",
              boxShadow: mode === "dark"
                ? "0 4px 24px 0 rgba(0,0,0,0.24)"
                : "0 4px 24px 0 rgba(251,146,60,0.06)",
              p: 2,
              transition: "background 0.3s",
            },
          }}
        >
          <DialogTitle
            sx={{
              fontWeight: 700,
              fontSize: 20,
              color: "text.primary",
              pb: 1,
              borderBottom: "1px solid",
              borderColor: "divider",
              bgcolor: "transparent",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FaClock color="#fb923c" />
              Entry Details - {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </Box>
          </DialogTitle>
          <DialogContent
            dividers
            sx={{
              bgcolor: "background.paper",
              transition: "background 0.3s",
            }}
          >
            {dialogEntries.length === 0 ? (
              <Typography color="text.secondary">No entries for this time slot.</Typography>
            ) : (
              dialogEntries.map((entry) => (
                <Card
                  key={entry.id}
                  sx={{
                    mb: 2,
                    bgcolor: "background.default",
                    boxShadow: mode === "dark"
                      ? "0 2px 8px 0 rgba(0,0,0,0.18)"
                      : "0 2px 8px 0 rgba(251,146,60,0.06)",
                    border: 1,
                    borderColor: "divider",
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} color="text.primary" sx={{ mb: 1 }}>
                      {entry.description}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <FaProjectDiagram color="#fb923c" size={14} />
                      <Typography variant="body2" color="warning.main" fontWeight={600}>
                        {projectMap[entry.project_id] || "No Project"}
                      </Typography>
                    </Box>
                    {entry.start && entry.end && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        <strong>Time:</strong> {`${format(setHours(setMinutes(new Date(), Number(entry.start.split(":")[1])), Number(entry.start.split(":")[0])), "h:mm a")} - ${format(setHours(setMinutes(new Date(), Number(entry.end.split(":")[1])), Number(entry.end.split(":")[0])), "h:mm a")}`}
                      </Typography>
                    )}
                    {entry.duration && (
                      <Typography variant="body2" color="text.secondary">
                        <strong>Duration:</strong> {formatDurationWithSeconds(sumDurationStr(entry.duration))}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
            <Button
              onClick={() => setDialogOpen(false)}
              color="warning"
              variant="contained"
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                bgcolor: "warning.main",
                color: "#fff",
                "&:hover": {
                  bgcolor: "warning.dark",
                },
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Floating Action Button for Quick Actions */}
        <Zoom in={true}>
          <Fab
            color="warning"
            sx={{
              position: "fixed",
              bottom: 24,
              right: 24,
              zIndex: 1000,
            }}
            onClick={() => navigate("/timetracker")}
          >
            <FaPlus />
          </Fab>
        </Zoom>
      </Box>
    </ThemeProvider>
  );
}

function formatDurationWithSeconds(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  let out = [];
  if (h) out.push(`${h}h`);
  if (m) out.push(`${m}m`);
  if (s || (!h && !m)) out.push(`${s}s`);
  return out.join(" ") || "0s";
}