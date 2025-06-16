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
  Card,
  CardContent,
  useTheme,
  CssBaseline,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { FaPlusCircle } from "react-icons/fa";
import { MdClose } from "react-icons/md";
import { format, startOfWeek, addDays } from "date-fns";
import { motion } from "framer-motion";
import { supabase } from "../supabaseClient";
import { FaListAlt } from "react-icons/fa";

const DAYS_IN_WEEK = 7;

function padHMS(hms) {
  // Pad to HH:MM:SS
  return hms
    .split(":")
    .map((v) => v.padStart(2, "0"))
    .join(":");
}

function sumHMS(times) {
  // times: array of "HH:MM:SS"
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

// Helper to format any input as HH:MM:SS
function formatToHMS(value) {
  if (!value) return "00:00:00";
  // Remove all non-digits and colons
  let cleaned = value.replace(/[^\d:]/g, "");
  // Split by colon or treat as plain numbers
  let parts = cleaned.split(":");
  if (parts.length === 1) {
    // If only numbers, pad left with zeros
    let num = parts[0].padStart(6, "0");
    parts = [num.slice(0, 2), num.slice(2, 4), num.slice(4, 6)];
  } else {
    // Pad each part
    parts = parts.map((p) => p.padStart(2, "0"));
    while (parts.length < 3) parts.push("00");
    parts = parts.slice(0, 3);
  }
  return parts.join(":");
}

// Helper to convert duration strings like "4m 39s", "3m", "35m 10s", "1h 2m 3s" to HH:MM:SS
function durationStrToHMS(str) {
  if (!str) return "00:00:00";
  let h = 0, m = 0, s = 0;
  const hourMatch = str.match(/(\d+)\s*h/);
  const minMatch = str.match(/(\d+)\s*m/);
  const secMatch = str.match(/(\d+)\s*s/);
  if (hourMatch) h = parseInt(hourMatch[1], 10);
  if (minMatch) m = parseInt(minMatch[1], 10);
  if (secMatch) s = parseInt(secMatch[1], 10);
  // If it's a plain number (e.g. "5"), treat as minutes
  if (!hourMatch && !minMatch && !secMatch && /^\d+$/.test(str)) {
    m = parseInt(str, 10);
  }
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
}

// Helper to sum durations in HH:MM:SS format
function sumDurationsHMS(durations) {
  let totalSeconds = 0;
  durations.forEach((str) => {
    // Accepts "1h 2m 3s", "3m", "35m 10s", etc.
    let h = 0, m = 0, s = 0;
    const hourMatch = str.match(/(\d+)\s*h/);
    const minMatch = str.match(/(\d+)\s*m/);
    const secMatch = str.match(/(\d+)\s*s/);
    if (hourMatch) h = parseInt(hourMatch[1], 10);
    if (minMatch) m = parseInt(minMatch[1], 10);
    if (secMatch) s = parseInt(secMatch[1], 10);
    // If it's a plain number (e.g. "5"), treat as minutes
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

// Utility to check if there are unsaved edits
function hasEdits(projectRows, editTimes) {
  return projectRows.some(row =>
    (editTimes[row.project.id] || []).some((t, i) => t !== row.times[i])
  );
}

export default function Timesheet() {
  // Theme (match other user pages)
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
        },
      }),
    [mode]
  );

  const [projects, setProjects] = useState([]);
  const [entries, setEntries] = useState([]);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [userId, setUserId] = useState(null);
  const [addingRows, setAddingRows] = useState([
    { project_id: "", times: Array(DAYS_IN_WEEK).fill("") },
  ]);
  // Editable times state for projectRows (for existing entries)
  const [editTimes, setEditTimes] = useState({}); // { [projectId]: [times] }
  const [isEditing, setIsEditing] = useState({}); // { [projectId]: [bool, ...] }

  // Fetch user, projects, and entries
  useEffect(() => {
    const fetchData = async () => {
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
    };
    fetchData();
  }, [weekStart]);

  // Group entries by project and day, summing durations
  const projectRows = useMemo(() => {
    const map = {};
    projects.forEach((p) => {
      map[p.id] = { project: p, times: Array(DAYS_IN_WEEK).fill("") };
    });
    // Group all entries by project and day
    for (const p of projects) {
      for (let i = 0; i < DAYS_IN_WEEK; i++) {
        const day = format(addDays(weekStart, i), "yyyy-MM-dd");
        const durations = entries
          .filter(e => e.project_id === p.id && e.date === day)
          .map(e => e.duration || "00:00:00");
        map[p.id].times[i] = durations.length > 0 ? sumDurationsHMS(durations) : "";
      }
    }
    return Object.values(map);
  }, [projects, entries, weekStart]);

  // Sync editTimes with projectRows when they change
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

  // Add new row
  const handleAddRow = () => {
    setAddingRows((rows) => [
      ...rows,
      { project_id: "", times: Array(DAYS_IN_WEEK).fill("") },
    ]);
  };

  // Remove row
  const handleRemoveRow = (idx) => {
    setAddingRows((rows) => rows.filter((_, i) => i !== idx));
  };

  // Handle project select in add row
  const handleSelectProject = (idx, value) => {
    setAddingRows((rows) =>
      rows.map((row, i) =>
        i === idx ? { ...row, project_id: value } : row
      )
    );
  };

  // Handle time input in add row
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

  // Handle edit for existing entry
  const handleEditTime = (projectId, dayIdx, value) => {
    setEditTimes(prev => ({
      ...prev,
      [projectId]: prev[projectId].map((t, i) => i === dayIdx ? formatToHMS(value) : t)
    }));
  };

  // Start editing a cell
  const handleStartEdit = (projectId, dayIdx) => {
    setIsEditing(prev => ({
      ...prev,
      [projectId]: prev[projectId].map((v, i) => i === dayIdx ? true : v)
    }));
  };

  // Stop editing a cell
  const handleStopEdit = (projectId, dayIdx) => {
    setIsEditing(prev => ({
      ...prev,
      [projectId]: prev[projectId].map((v, i) => i === dayIdx ? false : v)
    }));
  };

  // Remove handleSaveProjectRow and handleSaveEditTime
  // Add a single save handler for all edits
  const handleSaveAll = async () => {
    for (const projectId of Object.keys(editTimes)) {
      for (let dayIdx = 0; dayIdx < DAYS_IN_WEEK; dayIdx++) {
        const date = format(addDays(weekStart, dayIdx), "yyyy-MM-dd");
        const duration = editTimes[projectId][dayIdx];
        const entry = entries.find(
          e => e.project_id === projectId && e.date === date
        );
        if (entry) {
          // Only update if changed
          if (duration !== durationStrToHMS(entry.duration || "00:00:00")) {
            await supabase
              .from("entries")
              .update({ duration })
              .eq("id", entry.id);
          }
        } else if (duration && duration !== "00:00:00") {
          // Insert new entry if not empty
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
  };

  // Save new row
  const handleSaveRow = async (row) => {
    if (!row.project_id) return;
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
  };

  // Week navigation
  const handlePrevWeek = () => setWeekStart(addDays(weekStart, -7));
  const handleNextWeek = () => setWeekStart(addDays(weekStart, 7));

  // Table header days
  const days = Array.from({ length: DAYS_IN_WEEK }, (_, i) =>
    addDays(weekStart, i)
  );

  // Totals
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

  // Animation variants
  const tileVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
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
          maxWidth: "100vw", // Allow full viewport width
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
          {/* Timesheet Table Tile */}
          <motion.div variants={tileVariants} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
            <Card
              elevation={4}
              sx={{
                borderRadius: 5,
                bgcolor: "background.paper",
                width: "100%",
                maxWidth: "100%",
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
                  <FaListAlt size={16} /> Timesheet (View Only)
                </Typography>
              </Box>

              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 1, gap: 1.5 }}>
                  <Button
                    variant="outlined"
                    onClick={handlePrevWeek}
                    sx={{
                      borderRadius: 2,
                      fontWeight: 600,
                      color: "text.primary",
                      borderColor: "divider",
                      bgcolor: "background.paper",
                      transition: "background 0.3s",
                      minWidth: 32,
                      px: 1,
                      py: 0.5,
                      fontSize: "0.9rem",
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
                        minWidth: 110, // Smaller date field
                        "& .MuiInputBase-input": { fontSize: "0.95rem", py: 0.5 },
                      }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      This week
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
                      transition: "background 0.3s",
                      minWidth: 32,
                      px: 1,
                      py: 0.5,
                      fontSize: "0.9rem",
                    }}
                  >
                    &gt;
                  </Button>
                </Box>
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
                  }}
                >
                  <Table
                    sx={{
                      minWidth: 600,
                      // Remove all vertical borders
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
                              bgcolor: theme.palette.mode === "dark"
                                ? "#35363c"
                                : "#e5e7eb",
                              px: 0.5,
                            }}
                          >
                            {format(d, "EEE, MMM d")}
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
                          Total:
                        </TableCell>
                        {/* Top-right cell: match the rest of the header row */}
                        <TableCell
                          sx={{
                            bgcolor: theme.palette.mode === "dark"
                              ? "#35363c"
                              : "#e5e7eb",
                          }}
                        />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {projectRows.map((row, idx) => (
                        <TableRow
                          key={row.project.id}
                          sx={{
                            bgcolor: "background.paper",
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <span style={{ color: "#fb923c", fontSize: 14 }}>●</span>
                              <Typography fontSize="0.97rem">{row.project.name}</Typography>
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
                                  bgcolor: "background.paper",
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
                            <Typography
                              sx={{
                                fontWeight: 700,
                                fontSize: "0.95rem",
                                color: "text.primary",
                                bgcolor: "transparent",
                              }}
                            >
                              {projectTotals(row)}
                            </Typography>
                          </TableCell>
                          <TableCell
                            sx={{
                              bgcolor: "background.paper",
                              borderLeft: "none !important",
                            }}
                          >
                            {/* Remove delete button for view-only */}
                          </TableCell>
                        </TableRow>
                      ))}
                      {addingRows.map((row, idx) => (
                        <TableRow
                          key={`add-${idx}`}
                          sx={{
                            bgcolor: "background.paper",
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
                                  <em>Select ...</em>
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
                            <TextField
                              value={projectTotals(row)}
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
                                "& .MuiInputBase-input.Mui-disabled": {
                                  WebkitTextFillColor: theme.palette.text.primary,
                                },
                                m: 0,
                              }}
                            />
                          </TableCell>
                          <TableCell
                            sx={{
                              bgcolor: "background.paper",
                              borderLeft: "none !important",
                            }}
                          >
                            {/* Remove delete button for view-only */}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Total row with more noticeable grey background */}
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
                          Total:
                        </TableCell>
                        {dayTotals.map((t, i) => (
                          <TableCell
                            key={i}
                            align="center"
                            sx={{
                              px: 0.5,
                              bgcolor: theme.palette.mode === "dark"
                                ? "#35363c"
                                : "#e5e7eb",
                              borderTop: `2px solid ${theme.palette.mode === "dark" ? "#444" : "#d1d5db"}`,
                            }}
                          >
                            <Typography
                              sx={{
                                fontWeight: 600,
                                fontSize: "0.95rem",
                                color: "text.primary",
                                bgcolor: "transparent",
                              }}
                            >
                              {t}
                            </Typography>
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
                            // Remove vertical border
                            borderLeft: "none !important",
                          }}
                        >
                          <Typography
                            sx={{
                              fontWeight: 700,
                              fontSize: "0.95rem",
                              color: "text.primary",
                              bgcolor: "transparent",
                            }}
                          >
                            {grandTotal}
                          </Typography>
                        </TableCell>
                        {/* X delete button column with same background */}
                        <TableCell
                          sx={{
                            bgcolor: theme.palette.mode === "dark"
                              ? "#35363c"
                              : "#e5e7eb",
                            borderTop: `2px solid ${theme.palette.mode === "dark" ? "#444" : "#d1d5db"}`,
                            // Remove vertical border
                            borderLeft: "none !important",
                          }}
                        />
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ mt: 1.5, display: "flex", gap: 1.5 }}>
                  {/* Remove Save and Add Row buttons for view-only */}
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Box>
      </Box>
    </ThemeProvider>
  );
}