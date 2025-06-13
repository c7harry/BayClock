import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, Card, CardContent,
  TableContainer, Chip, Tooltip, Paper, Pagination, TextField, MenuItem, InputLabel, FormControl, Select} from "@mui/material";
import { FaListAlt } from "react-icons/fa";
import { createTheme, ThemeProvider } from "@mui/material/styles";

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
    const observer = new MutationObserver(() => {
      setMode(document.documentElement.classList.contains("dark") ? "dark" : "light");
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
      <Box
        sx={{
          p: { xs: 1, md: 5 },
          width: "100%",
          maxWidth: "1550px",
          mx: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        {/* Title Card */}
        <Card
          elevation={6}
          sx={{
            borderRadius: 5,
            bgcolor: "background.paper",
            mb: 3,
            width: "100%",
            maxWidth: "100%",
            color: "text.primary",
          }}
        >
          <CardContent
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              py: 3,
              bgcolor: "background.paper",
              transition: "background-color 0.3s",
              color: "text.primary",
            }}
          >
            <FaListAlt size={32} color={theme.palette.warning.main} />
            <Typography
              variant="h4"
              fontWeight={700}
              color="text.primary"
              sx={{ textAlign: "center" }}
            >
              All User Entries
            </Typography>
          </CardContent>
        </Card>
        {/* Entries Table Card */}
        <Card
          elevation={4}
          sx={{
            borderRadius: 5,
            bgcolor: "background.paper",
            width: "100%",
            maxWidth: "100%",
            color: "text.primary",
          }}
        >
          <CardContent sx={{ p: 0, bgcolor: "background.paper", color: "text.primary" }}>
            {/* All Entries Title and Filters in the same row */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: { xs: "flex-start", sm: "center" },
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
                mb: 2,
                px: 2,
                pt: 2,
              }}
            >
              <Typography
                variant="h6"
                fontWeight={600}
                mb={1}
                color="text.primary"
                sx={{ fontSize: "1.25rem", minWidth: 120 }}
              >
                All Entries
              </Typography>
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
                  sx={{ minWidth: 220 }}
                />
                <FormControl sx={{ minWidth: 180 }}>
                  <InputLabel id="filter-project-label">Project</InputLabel>
                  <Select
                    labelId="filter-project-label"
                    value={filterProject}
                    label="Project"
                    onChange={(e) => setFilterProject(e.target.value)}
                    size="small"
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
                  sx={{ minWidth: 150 }}
                />
              </Box>
            </Box>
            <TableContainer
              component={Paper}
              sx={{
                maxHeight: "70vh",
                borderRadius: 3,
                boxShadow: "none",
                overflowX: "auto",
                overflowY: "auto",
                bgcolor: "background.paper",
                color: "text.primary",
                minWidth: 900,
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
                  bgcolor: "background.paper",
                  color: "text.primary",
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, bgcolor: "background.default", textAlign: "center", color: "text.primary" }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: "background.default", textAlign: "center", color: "text.primary" }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: "background.default", textAlign: "center", color: "text.primary" }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: "background.default", textAlign: "center", color: "text.primary" }}>Start</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: "background.default", textAlign: "center", color: "text.primary" }}>End</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: "background.default", textAlign: "center", color: "text.primary" }}>Duration</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: "background.default", maxWidth: 200, textAlign: "center", color: "text.primary" }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 700, bgcolor: "background.default", textAlign: "center", color: "text.primary" }}>Project</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedEntries.map((entry, idx) => (
                    <TableRow
                      key={entry.id}
                      hover
                      sx={{
                        bgcolor: idx % 2 === 0 ? "background.paper" : (mode === "dark" ? "#23232a" : "grey.50"),
                        transition: "background 0.2s",
                        color: "text.primary",
                      }}
                    >
                      <TableCell align="center" sx={{ color: "text.primary" }}>{entry.profile?.full_name || entry.user_id}</TableCell>
                      <TableCell align="center" sx={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "text.primary" }}>
                        <Tooltip title={entry.profile?.email || ""} arrow>
                          <span>{entry.profile?.email || ""}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center" sx={{ color: "text.primary" }}>
                        {entry.date
                          ? (() => {
                              const [year, month, day] = entry.date.split("-");
                              return `${month}/${day}/${year}`;
                            })()
                          : ""}
                      </TableCell>
                      <TableCell align="center" sx={{ color: "text.primary" }}>
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
                      <TableCell align="center" sx={{ color: "text.primary" }}>
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
                      <TableCell align="center" sx={{ color: "text.primary" }}>{entry.duration}</TableCell>
                      <TableCell align="center" sx={{ maxWidth: 200, p: 0.5, color: "text.primary" }}>
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
                              color: "text.primary",
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
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <Pagination
                count={pageCount}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                shape="rounded"
                showFirstButton
                showLastButton
              />
            </Box>
          </CardContent>
        </Card>
      </Box>
    </ThemeProvider>
  );
}