import React, { useMemo, useState, useEffect } from "react";
import {
  ThemeProvider,
  CssBaseline,
  Box,
  Typography,
  Card,
  CardContent,
  useTheme,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { format, startOfWeek, addDays, isToday, setHours, setMinutes } from "date-fns";
import { motion } from "framer-motion";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import Tooltip from "@mui/material/Tooltip";
import { createTheme } from "@mui/material/styles";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { FaCalendar } from "react-icons/fa";

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
        },
      }),
    [mode]
  );

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entries, setEntries] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogEntries, setDialogEntries] = useState([]);
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const [projects, setProjects] = useState([]);
  const [projectMap, setProjectMap] = useState({});

  // Load entries from Supabase
  useEffect(() => {
    async function fetchEntries() {
      const { data, error } = await supabase.from("entries").select("*");
      if (!error) setEntries(data || []);
    }
    fetchEntries();
    window.addEventListener("entries-updated", fetchEntries);
    return () => window.removeEventListener("entries-updated", fetchEntries);
  }, []);

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

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const hours = useMemo(() => getDayHours(), []);

  // Group entries by date for dialog
  const entriesByDate = useMemo(() => {
    const map = {};
    entries.forEach((entry) => {
      map[entry.date] = map[entry.date] || [];
      map[entry.date].push(entry);
    });
    return map;
  }, [entries]);

  // Group entries for spanning display
  const spanningEntries = useMemo(() => getSpanningEntries(entries, weekDays), [entries, weekDays]);

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
            gap: { xs: 2, md: 4 },
            px: { xs: 0.5, sm: 2, md: 4 },
            boxSizing: "border-box",
            alignItems: "center",
          }}
        >
          <motion.div style={{ width: "100%" }}>
            <Card
              elevation={6}
              sx={{
                borderRadius: 5,
                bgcolor: "background.paper",
                width: "100%", // Full width
                maxWidth: "100%",
                boxShadow: mode === "dark"
                  ? "0 4px 24px 0 rgba(0,0,0,0.24)"
                  : "0 4px 24px 0 rgba(251,146,60,0.06)",
                transition: "background 0.3s",
                color: mode === "light" ? "#18181b" : "inherit",
                overflow: 'hidden'
              }}
            >
              {/* Compact Header Section */}
              <Box sx={{ 
                bgcolor: 'warning.main', 
                color: 'white', 
                py: 1, 
                px: 2,
                background: 'linear-gradient(135deg, #0F2D52 0%, #fb923c 100%)'
              }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FaCalendar size={16} /> Calendar
                </Typography>
              </Box>

              <CardContent
                sx={{
                  color: mode === "light" ? "#18181b" : "inherit",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
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
                      transition: "background 0.3s",
                    }}
                  >
                    Prev
                  </Button>
                  <Typography variant="h5" fontWeight={700} color="text.primary">
                    Week of {format(weekStart, "MMMM d, yyyy")}
                  </Typography>
                  <Box>
                    <Button
                      onClick={handleToday}
                      variant="outlined"
                      size="small"
                      sx={{
                        mr: 1,
                        borderRadius: 2,
                        fontWeight: 600,
                        color: "text.primary",
                        borderColor: "divider",
                        bgcolor: "background.paper",
                        transition: "background 0.3s",
                      }}
                    >
                      Today
                    </Button>
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
                        transition: "background 0.3s",
                      }}
                    >
                      Next
                    </Button>
                  </Box>
                </Box>
                {/* Weekly calendar grid */}
                <Box
                  sx={{
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns: "80px repeat(7, 1fr)",
                    gridTemplateRows: "32px 28px repeat(24, 48px)",
                    gap: 0,
                    borderRadius: 2,
                    overflow: "auto",
                    bgcolor: "background.default",
                    minHeight: "1200px",
                    transition: "background 0.3s",
                  }}
                >
                  {/* Dotted line overlay */}
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
                      backgroundSize: `calc((100% - 80px) / 7) 48px`,
                      backgroundPosition: `80px 40px`,
                      backgroundRepeat: "repeat",
                      opacity: 1,
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
                  {/* Top-left total cell (matches y column) */}
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
                  {/* Weekday headers */}
                  {weekDays.map((day, idx) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    const total = getDayTotal(entriesByDate[dateStr] || []);
                    return (
                      <React.Fragment key={idx}>
                        {/* Weekday header (row 1) */}
                        <Box
                          sx={{
                            gridColumn: `${idx + 2} / ${idx + 3}`,
                            gridRow: "1/2",
                            bgcolor: "background.paper",
                            textAlign: "center",
                            py: 0.5,
                            fontWeight: 700,
                            color: isToday(day) ? "warning.main" : "text.primary",
                            zIndex: 2,
                            borderTopLeftRadius: idx === 0 ? 8 : 0,
                            borderTopRightRadius: idx === 6 ? 8 : 0,
                            borderBottom: "1px solid",
                            borderColor: "divider",
                            transition: "background 0.3s",
                          }}
                        >
                          <Typography variant="subtitle2" fontWeight={700}>
                            {format(day, "EEE, MMMM d")}
                          </Typography>
                        </Box>
                        {/* Total time row (row 2) */}
                        <Box
                          sx={{
                            gridColumn: `${idx + 2} / ${idx + 3}`,
                            gridRow: "2/3",
                            bgcolor: "background.paper",
                            textAlign: "center",
                            fontWeight: 600,
                            color: "success.main",
                            fontSize: 14,
                            zIndex: 2,
                            pt: 0.5,
                            pb: 0.5,
                            borderBottom: "1px solid",
                            borderColor: "divider",
                            transition: "background 0.3s",
                          }}
                        >
                          {total}
                        </Box>
                        {/* Divider below total time */}
                        <Box
                          sx={{
                            gridColumn: `${idx + 2} / ${idx + 3}`,
                            gridRow: "3/4",
                            height: "1px",
                            borderBottom: "1px solid",
                            borderColor: "divider",
                            zIndex: 2,
                            p: 0,
                            m: 0,
                          }}
                        />
                      </React.Fragment>
                    );
                  })}
                  {/* Hour labels */}
                  {hours.map((hour) => (
                    <Box
                      key={hour}
                      sx={{
                        gridColumn: "1/2",
                        gridRow: `${hour + 3} / ${hour + 4}`, // start at row 3
                        bgcolor: "background.paper",
                        borderRight: "1px solid",
                        borderColor: "divider",
                        textAlign: "right",
                        pr: "10px",
                        pl: "1px",
                        fontSize: 12,
                        color: "text.secondary",
                        fontWeight: 500,
                        zIndex: 2,
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "flex-end",
                        minHeight: "48px",
                        lineHeight: 1,
                        overflow: "visible",
                        minWidth: "40px",
                        transition: "background 0.3s",
                      }}
                    >
                      {formatHour(hour)}
                    </Box>
                  ))}
                  {/* Horizontal grid lines for each hour (top of each hour row) */}
                  {hours.map((hour) =>
                    hour === 0 ? null : (
                      <Box
                        key={hour}
                        sx={{
                          position: "absolute",
                          left: 80,
                          right: 0,
                          top: 32 + 28 + hour * 48, // 32px header + 28px total row
                          height: 0,
                          borderTop: `1px solid ${mode === "dark" ? "#333" : "#ccc"}`,
                          zIndex: 1,
                          pointerEvents: "none",
                        }}
                      />
                    )
                  )}
                  {/* Calendar blocks: render each entry as a single block spanning its hours */}
                  {weekDays.map((day, dayIdx) => {
                    const dateStr = format(day, "yyyy-MM-dd");
                    return spanningEntries[dateStr].map((entry) => {
                      // Parse start and end hour/minute
                      let [startH, startM] = entry.start ? entry.start.split(":").map(Number) : [9, 0];
                      let [endH, endM] = entry.end ? entry.end.split(":").map(Number) : [startH + 1, 0];

                      // Calculate top and height in px (each hour = 48px, each minute = 0.8px)
                      const hourHeight = 48;
                      const startOffset = startH * hourHeight + (startM / 60) * hourHeight;
                      const endOffset = endH * hourHeight + (endM / 60) * hourHeight;
                      const blockTop = 50 + startOffset; // 50px header offset
                      const blockHeight = Math.max(28, endOffset - startOffset);

                      return (
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
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
                                <Typography fontWeight={700}>{entry.description}</Typography>
                                <Typography color="warning.main" fontWeight={700}>
                                  {projectMap[entry.project_id] || "No Project"}
                                </Typography>
                                <Typography variant="caption">
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
                              </Box>
                            }
                            arrow
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
                                bgcolor: "warning.light",
                                color: mode === "dark" ? "warning.dark" : "#18181b",
                                fontSize: 14,
                                fontWeight: 600,
                                whiteSpace: "normal",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                boxShadow: mode === "dark"
                                  ? "0 2px 8px 0 rgba(0,0,0,0.18)"
                                  : "0 2px 8px 0 rgba(251,146,60,0.10)",
                                border: "2px solid",
                                borderColor: "warning.main",
                                cursor: "pointer",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                borderRadius: 2,
                                transition: "background 0.3s, color 0.3s",
                              }}
                            >
                              <Box>
                                <Typography variant="subtitle2" fontWeight={700} sx={{ color: "inherit" }}>
                                  {entry.description}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: "warning.main",
                                    fontWeight: 700,
                                    display: "block",
                                    mt: 0.5,
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {projectMap[entry.project_id] || <span style={{ color: "#aaa" }}>No Project</span>}
                                </Typography>
                              </Box>
                              <Box sx={{ mt: 1, textAlign: "right" }}>
                                <Typography variant="caption" sx={{ color: "inherit", fontWeight: 700 }}>
                                  {(() => {
                                    const sec = sumDurationStr(entry.duration);
                                    const h = String(Math.floor(sec / 3600)).padStart(2, "0");
                                    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
                                    const s = String(sec % 60).padStart(2, "0");
                                    return `${h}:${m}:${s}`;
                                  })()}
                                </Typography>
                              </Box>
                            </Box>
                          </Tooltip>
                        </motion.div>
                      );
                    });
                  })}
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Box>
        {/* Dialog for entries in a block */}
        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          maxWidth="xs"
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
            Entries for {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </DialogTitle>
          <DialogContent
            dividers
            sx={{
              bgcolor: "background.paper",
              transition: "background 0.3s",
            }}
          >
            {dialogEntries.length === 0 ? (
              <Typography color="text.secondary">No entries for this hour.</Typography>
            ) : (
              dialogEntries.map((entry) => (
                <Box
                  key={entry.id}
                  sx={{
                    mb: 2,
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: "background.default",
                    boxShadow: mode === "dark"
                      ? "0 1px 4px 0 rgba(0,0,0,0.18)"
                      : "0 1px 4px 0 rgba(251,146,60,0.06)",
                  }}
                >
                  <Typography variant="body1" fontWeight={600} color="text.primary">
                    {entry.description}
                  </Typography>
                  <Typography variant="body2" color="warning.main" fontWeight={600}>
                    {projectMap[entry.project_id] || "No Project"}
                  </Typography>
                  {/* Time range on its own row */}
                  {entry.start && entry.end && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {`${format(setHours(setMinutes(new Date(), Number(entry.start.split(":")[1])), Number(entry.start.split(":")[0])), "h:mm a")} - ${format(setHours(setMinutes(new Date(), Number(entry.end.split(":")[1])), Number(entry.end.split(":")[0])), "h:mm a")}`}
                    </Typography>
                  )}
                  {/* Duration on its own row */}
                  {entry.duration && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {formatDurationWithSeconds(sumDurationStr(entry.duration))}
                    </Typography>
                  )}
                </Box>
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