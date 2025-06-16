import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, Chip, Tooltip, Paper, Pagination, TextField, MenuItem, InputLabel, FormControl, Select,
  CssBaseline} from "@mui/material";
import { FaListAlt } from "react-icons/fa";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { motion } from "framer-motion";
import { GlassCard } from "../components/Theme";

export default function AllEntries() {
  const [entries, setEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [page, setPage] = useState(1);
  const entriesPerPage = 20;

  // Filter state
  const [filterProject, setFilterProject] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [searchEmail, setSearchEmail] = useState("");

  // Detect system or document theme
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
        },
      }),
    [mode]
  );

  useEffect(() => {
    async function fetchEntries() {
      // Fetch entries
      const { data: entries, error } = await supabase
        .from("entries")
        .select("*")
        .order("date", { ascending: false })
        .order("start", { ascending: false });
      if (error) {
        console.error("Supabase error:", error.message);
        setEntries([]);
        return;
      }

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email");
      if (profilesError) {
        console.error("Supabase error:", profilesError.message);
        setEntries(entries || []);
        return;
      }

      // Fetch all projects
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("id, name");
      if (projectsError) {
        console.error("Supabase error:", projectsError.message);
        setEntries(entries || []);
        return;
      }
      setProjects(projects || []);

      // Map profiles and projects
      const profileMap = Object.fromEntries(
        (profiles || []).map((p) => [p.id, p])
      );
      const projectMap = Object.fromEntries(
        (projects || []).map((p) => [p.id, p.name])
      );

      // Attach profile and project name to entries
      const entriesWithDetails = (entries || []).map((entry) => ({
        ...entry,
        profile: profileMap[entry.user_id] || {},
        projectName: projectMap[entry.project_id] || entry.project_id,
      }));

      setEntries(entriesWithDetails);
    }
    fetchEntries();
  }, []);

  // Filtering logic
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesProject =
        !filterProject || entry.project_id === filterProject;
      const matchesDate =
        !filterDate || entry.date === filterDate;
      const matchesEmail =
        !searchEmail ||
        (entry.profile?.email || "")
          .toLowerCase()
          .includes(searchEmail.toLowerCase());
      return matchesProject && matchesDate && matchesEmail;
    });
  }, [entries, filterProject, filterDate, searchEmail]);

  // Pagination logic
  const pageCount = Math.ceil(filteredEntries.length / entriesPerPage);
  const pagedEntries = filteredEntries.slice(
    (page - 1) * entriesPerPage,
    page * entriesPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filterProject, filterDate, searchEmail]);

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
          }}
        >
          {/* All User Entries Table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0 }}>
            <GlassCard
              title="All User Entries"
              icon={<FaListAlt size={16} />}
              delay={0}
              sx={{ width: "100%", maxWidth: "100%" }}
              whileHover={{}} // Disable hover effect
            >
              <Box sx={{ p: 2.5 }}>
                {/* Filters */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: { xs: "flex-start", sm: "center" },
                    flexDirection: { xs: "column", sm: "row" },
                    gap: 2,
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 2,
                      alignItems: "center",
                      width: "100%",
                      justifyContent: { xs: "flex-start", sm: "flex-end" },
                    }}
                  >
                    <TextField
                      label="Search by Email"
                      size="small"
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      sx={{ 
                        minWidth: 220,
                        bgcolor: "background.default",
                        borderRadius: 2,
                        '& .MuiInputBase-input::-webkit-calendar-picker-indicator': {
                          filter: mode === "light" ? "invert(1)" : "none",
                          cursor: "pointer",
                          opacity: 0.8,
                          "&:hover": {
                            opacity: 1,
                          },
                        },
                      }}
                    />
                    <FormControl sx={{ minWidth: 180 }}>
                      <InputLabel id="filter-project-label">Project</InputLabel>
                      <Select
                        labelId="filter-project-label"
                        value={filterProject}
                        label="Project"
                        onChange={(e) => setFilterProject(e.target.value)}
                        size="small"
                        sx={{
                          bgcolor: "background.default",
                          borderRadius: 2,
                        }}
                      >
                        <MenuItem value="">All Projects</MenuItem>
                        {projects.map((proj) => (
                          <MenuItem key={proj.id} value={proj.id}>
                            {proj.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      label="Date"
                      type="date"
                      size="small"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ 
                        minWidth: 150,
                        bgcolor: "background.default",
                        borderRadius: 2,
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
                </Box>

                <TableContainer
                  component={Paper}
                  sx={{
                    maxHeight: "70vh",
                    borderRadius: 2,
                    bgcolor: "background.default",
                    boxShadow: mode === "dark"
                      ? "0 2px 8px 0 rgba(0,0,0,0.18)"
                      : "0 2px 8px 0 rgba(251,146,60,0.10)",
                    overflowX: "auto",
                    overflowY: "auto",
                    minWidth: 900,
                    border: 1,
                    borderColor: "divider",
                  }}
                >
                  <Table
                    stickyHeader
                    size="small"
                    aria-label="entries table"
                    sx={{
                      mx: "auto",
                      tableLayout: "auto",
                      minWidth: 900,
                      '& .MuiTableCell-root': {
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper", textAlign: "center" }}>User</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper", textAlign: "center" }}>Email</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper", textAlign: "center" }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper", textAlign: "center" }}>Start</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper", textAlign: "center" }}>End</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper", textAlign: "center" }}>Duration</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper", maxWidth: 200, textAlign: "center" }}>Description</TableCell>
                        <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper", textAlign: "center" }}>Project</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pagedEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} align="center" sx={{ color: "text.disabled", py: 4 }}>
                            No entries found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        pagedEntries.map((entry, idx) => (
                          <TableRow
                            key={entry.id}
                            hover
                            sx={{
                              bgcolor: idx % 2 === 0 ? "background.paper" : "background.default",
                              transition: "background 0.2s",
                              "&:hover": {
                                bgcolor: "action.hover",
                              },
                            }}
                          >
                            <TableCell align="center">{entry.profile?.full_name || entry.user_id}</TableCell>
                            <TableCell align="center" sx={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              <Tooltip title={entry.profile?.email || ""} arrow>
                                <span>{entry.profile?.email || ""}</span>
                              </Tooltip>
                            </TableCell>
                            <TableCell align="center">
                              {entry.date
                                ? (() => {
                                    const [year, month, day] = entry.date.split("-");
                                    return `${month}/${day}/${year}`;
                                  })()
                                : ""}
                            </TableCell>
                            <TableCell align="center">
                              {entry.start
                                ? (() => {
                                    const [h, m, s] = entry.start.split(":").map(Number);
                                    const date = new Date();
                                    date.setHours(h, m, s || 0, 0);
                                    return date.toLocaleTimeString("en-US", {
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true,
                                    });
                                  })()
                                : ""}
                            </TableCell>
                            <TableCell align="center">
                              {entry.end
                                ? (() => {
                                    const [h, m, s] = entry.end.split(":").map(Number);
                                    const date = new Date();
                                    date.setHours(h, m, s || 0, 0);
                                    return date.toLocaleTimeString("en-US", {
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true,
                                    });
                                  })()
                                : ""}
                            </TableCell>
                            <TableCell align="center">{entry.duration}</TableCell>
                            <TableCell align="center" sx={{ maxWidth: 200, p: 0.5 }}>
                              <Tooltip title={entry.description || ""} arrow>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "normal",
                                    maxWidth: 200,
                                  }}
                                >
                                  {entry.description}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={entry.projectName}
                                color="warning"
                                size="small"
                                sx={{
                                  bgcolor: "warning.light",
                                  color: "warning.dark",
                                  fontWeight: 600,
                                  fontSize: 13,
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <Pagination
                    count={pageCount}
                    page={page}
                    onChange={(_, value) => setPage(value)}
                    color="warning"
                    shape="rounded"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              </Box>
            </GlassCard>
          </motion.div>
        </Box>
      </Box>
    </ThemeProvider>
  );
}