import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  TableContainer, Chip, Tooltip, Paper, Pagination, TextField, MenuItem, 
  InputLabel, FormControl, Select, CssBaseline, Button, Grid, IconButton, Switch, FormControlLabel, Alert, Badge,
  TableSortLabel, Collapse, Fab, Dialog, DialogTitle, DialogContent,
  DialogActions, List, ListItem, ListItemText, ListItemIcon
} from "@mui/material";
import { 
  FaListAlt, FaDownload, FaFilter, FaClock,
  FaCalendarAlt, FaEye, FaChartBar, FaSearch, FaTimes, FaFileAlt
} from "react-icons/fa";
import { MdRefresh, MdViewColumn } from "react-icons/md";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { GlassCard } from "../components/Theme";

export default function AllEntries() {
  const [entries, setEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [filterProject, setFilterProject] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterDateRange, setFilterDateRange] = useState({ start: "", end: "" });
  const [searchEmail, setSearchEmail] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Enhanced filter states
  const [quickFilter, setQuickFilter] = useState("all");
  const [minDuration, setMinDuration] = useState("");
  const [maxDuration, setMaxDuration] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");

  // View states
  const [compactView, setCompactView] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState({
    user: true,
    email: true,
    date: true,
    start: true,
    end: true,
    duration: true,
    description: true,
    project: true
  });

  // Dialog states
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Theme detection
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
                primary: {
                  main: "#fb923c",
                },
              }
            : {
                background: {
                  default: "#18181b",
                  paper: "#23232a",
                },
                primary: {
                  main: "#fb923c",
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

  // Helper functions
  const parseDurationToSeconds = (duration) => {
    if (!duration) return 0;
    const parts = duration.toString().split(' ');
    let seconds = 0;
    for (const part of parts) {
      if (part.includes('h')) {
        seconds += parseInt(part) * 3600;
      } else if (part.includes('m')) {
        seconds += parseInt(part) * 60;
      } else if (part.includes('s')) {
        seconds += parseInt(part);
      }
    }
    return seconds;
  };

  const formatDuration = (totalSeconds) => {
    if (isNaN(totalSeconds) || totalSeconds <= 0) return "0s";
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Fetch data
  useEffect(() => {
    async function fetchEntries() {
      setLoading(true);
      try {
        // Fetch entries
        const { data: entriesData, error } = await supabase
          .from("entries")
          .select("*")
          .order("date", { ascending: false })
          .order("start", { ascending: false });
        
        if (error) throw error;

        // Fetch profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email");
        
        if (profilesError) throw profilesError;

        // Fetch projects
        const { data: projectsData, error: projectsError } = await supabase
          .from("projects")
          .select("id, name");
        
        if (projectsError) throw projectsError;

        // Set data safely
        setProfiles(profilesData || []);
        setProjects(projectsData || []);

        // Create maps
        const profileMap = Object.fromEntries(
          (profilesData || []).map((p) => [p.id, p])
        );
        const projectMap = Object.fromEntries(
          (projectsData || []).map((p) => [p.id, p.name])
        );

        // Attach profile and project info
        const entriesWithDetails = (entriesData || []).map((entry) => ({
          ...entry,
          profile: profileMap[entry.user_id] || {},
          projectName: projectMap[entry.project_id] || entry.project_id || "Unknown",
        }));

        setEntries(entriesWithDetails);
      } catch (error) {
        console.error("Error fetching data:", error);
        setEntries([]);
        setProfiles([]);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    }
    fetchEntries();
  }, []);

  // Quick filter helper
  const getQuickFilterDate = (filter) => {
    const today = new Date();
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    switch (filter) {
      case "today":
        return { start: formatDate(today), end: formatDate(today) };
      case "week":
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return { start: formatDate(weekStart), end: formatDate(today) };
      case "month":
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: formatDate(monthStart), end: formatDate(today) };
      default:
        return { start: "", end: "" };
    }
  };

  // Filtered entries
  const filteredEntries = useMemo(() => {
    let filtered = entries.filter((entry) => {
      const matchesProject = !filterProject || entry.project_id === filterProject;
      const matchesUser = !filterUser || entry.user_id === filterUser;
      const matchesEmail = !searchEmail || 
        (entry.profile?.email || "").toLowerCase().includes(searchEmail.toLowerCase());
      
      // Date filtering
      let matchesDate = true;
      if (quickFilter !== "all") {
        const quickDates = getQuickFilterDate(quickFilter);
        matchesDate = entry.date >= quickDates.start && entry.date <= quickDates.end;
      } else if (filterDate) {
        matchesDate = entry.date === filterDate;
      } else if (filterDateRange.start || filterDateRange.end) {
        if (filterDateRange.start && filterDateRange.end) {
          matchesDate = entry.date >= filterDateRange.start && entry.date <= filterDateRange.end;
        } else if (filterDateRange.start) {
          matchesDate = entry.date >= filterDateRange.start;
        } else if (filterDateRange.end) {
          matchesDate = entry.date <= filterDateRange.end;
        }
      }

      // Duration filtering
      const entrySeconds = parseDurationToSeconds(entry.duration);
      const matchesMinDuration = !minDuration || entrySeconds >= parseInt(minDuration) * 60;
      const matchesMaxDuration = !maxDuration || entrySeconds <= parseInt(maxDuration) * 60;

      return matchesProject && matchesUser && matchesEmail && matchesDate && 
             matchesMinDuration && matchesMaxDuration;
    });

    // Sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case "user":
          aVal = a.profile?.full_name || "";
          bVal = b.profile?.full_name || "";
          break;
        case "project":
          aVal = a.projectName || "";
          bVal = b.projectName || "";
          break;
        case "duration":
          aVal = parseDurationToSeconds(a.duration);
          bVal = parseDurationToSeconds(b.duration);
          break;
        case "date":
        default:
          aVal = a.date + " " + (a.start || "");
          bVal = b.date + " " + (b.start || "");
          break;
      }

      if (typeof aVal === "string") {
        return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else {
        return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }
    });

    return filtered;
  }, [entries, filterProject, filterUser, filterDate, filterDateRange, searchEmail, 
      quickFilter, minDuration, maxDuration, sortBy, sortOrder]);

  // Pagination
  const pageCount = Math.ceil(filteredEntries.length / rowsPerPage);
  const pagedEntries = filteredEntries.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filterProject, filterUser, filterDate, filterDateRange, searchEmail, 
      quickFilter, minDuration, maxDuration, sortBy, sortOrder, rowsPerPage]);

  // Export functionality
  const handleExport = () => {
    if (filteredEntries.length === 0) return;
    
    const csvData = filteredEntries.map(entry => ({
      User: entry.profile?.full_name || entry.user_id || "",
      Email: entry.profile?.email || "",
      Date: entry.date || "",
      Start: entry.start || "",
      End: entry.end || "",
      Duration: entry.duration || "",
      Description: entry.description || "",
      Project: entry.projectName || ""
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `entries_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Re-run the fetch logic
      const { data: entriesData } = await supabase
        .from("entries")
        .select("*")
        .order("date", { ascending: false });
      
      if (entriesData) {
        const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
        const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));
        
        const entriesWithDetails = entriesData.map((entry) => ({
          ...entry,
          profile: profileMap[entry.user_id] || {},
          projectName: projectMap[entry.project_id] || entry.project_id || "Unknown",
        }));
        
        setEntries(entriesWithDetails);
      }
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setFilterProject("");
    setFilterUser("");
    setFilterDate("");
    setFilterDateRange({ start: "", end: "" });
    setSearchEmail("");
    setQuickFilter("all");
    setMinDuration("");
    setMaxDuration("");
    setSortBy("date");
    setSortOrder("desc");
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          py: { xs: 2, md: 4 },
          px: { xs: 1, sm: 2, md: 3 },
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box"
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: "1600px",
            mx: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 3
          }}
        >
          {/* Main Table */}
          <GlassCard
            title="All User Entries"
            icon={<FaListAlt size={16} />}
            sx={{ 
              display: "flex",
              flexDirection: "column"
            }}
          >
            <Box sx={{ p: 2.5, flex: 1, display: "flex", flexDirection: "column" }}>
              {/* Header Controls */}
              <Box sx={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                mb: 2,
                flexWrap: "wrap",
                gap: 1
              }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  {/* Quick Filter Chips */}
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                    {["all", "today", "week", "month"].map((filter) => (
                      <Chip
                        key={filter}
                        label={filter.charAt(0).toUpperCase() + filter.slice(1)}
                        onClick={() => setQuickFilter(filter)}
                        color={quickFilter === filter ? "warning" : "default"}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    ))}
                  </Box>
                  
                  <Badge badgeContent={Object.values({
                    filterProject, filterUser, filterDate, searchEmail,
                    ...filterDateRange, minDuration, maxDuration
                  }).filter(v => v).length} color="warning">
                    <Button
                      startIcon={<FaFilter />}
                      onClick={() => setShowFilters(!showFilters)}
                      size="small"
                      variant="contained"
                      color="warning"
                      sx={{
                        minWidth: 100,
                        fontWeight: 600,
                        boxShadow: 2
                      }}
                    >
                      Filters
                    </Button>
                  </Badge>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Button
                    startIcon={<MdRefresh className={refreshing ? "spinning" : ""} />}
                    onClick={handleRefresh}
                    disabled={refreshing}
                    size="small"
                    variant="contained"
                    color="warning"
                    sx={{
                      minWidth: 90,
                      fontWeight: 600,
                      boxShadow: 2
                    }}
                  >
                    Refresh
                  </Button>
                  
                  <Button
                    startIcon={<FaDownload />}
                    onClick={handleExport}
                    size="small"
                    variant="contained"
                    color="warning"
                    disabled={filteredEntries.length === 0}
                    sx={{
                      minWidth: 90,
                      fontWeight: 600,
                      boxShadow: 2,
                      '&.Mui-disabled': {
                        opacity: 0.6
                      }
                    }}
                  >
                    Export
                  </Button>

                  <Button
                    startIcon={<MdViewColumn />}
                    onClick={() => setColumnMenuOpen(true)}
                    size="small"
                    variant="contained"
                    color="warning"
                    sx={{
                      minWidth: 100,
                      fontWeight: 600,
                      boxShadow: 2
                    }}
                  >
                    Columns
                  </Button>
                </Box>
              </Box>

              {/* Filters */}
              <Collapse in={showFilters}>
                <Paper sx={{ p: 2, mb: 2, bgcolor: "background.default", borderRadius: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        label="Search by Email"
                        size="small"
                        fullWidth
                        value={searchEmail}
                        onChange={(e) => setSearchEmail(e.target.value)}
                        InputProps={{
                          startAdornment: <FaSearch style={{ marginRight: 8, opacity: 0.6 }} />
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>User</InputLabel>
                        <Select
                          value={filterUser}
                          label="User"
                          onChange={(e) => setFilterUser(e.target.value)}
                        >
                          <MenuItem value="">All Users</MenuItem>
                          {profiles.map((profile) => (
                            <MenuItem key={profile.id} value={profile.id}>
                              {profile.full_name || profile.email}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Project</InputLabel>
                        <Select
                          value={filterProject}
                          label="Project"
                          onChange={(e) => setFilterProject(e.target.value)}
                        >
                          <MenuItem value="">All Projects</MenuItem>
                          {projects.map((proj) => (
                            <MenuItem key={proj.id} value={proj.id}>
                              {proj.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        label="Specific Date"
                        type="date"
                        size="small"
                        fullWidth
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        label="Start Date"
                        type="date"
                        size="small"
                        fullWidth
                        value={filterDateRange.start}
                        onChange={(e) => setFilterDateRange(prev => ({ ...prev, start: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        label="End Date"
                        type="date"
                        size="small"
                        fullWidth
                        value={filterDateRange.end}
                        onChange={(e) => setFilterDateRange(prev => ({ ...prev, end: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        label="Min Duration (minutes)"
                        type="number"
                        size="small"
                        fullWidth
                        value={minDuration}
                        onChange={(e) => setMinDuration(e.target.value)}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        label="Max Duration (minutes)"
                        type="number"
                        size="small"
                        fullWidth
                        value={maxDuration}
                        onChange={(e) => setMaxDuration(e.target.value)}
                      />
                    </Grid>
                  </Grid>

                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
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
                    
                    <Button
                      startIcon={<FaTimes />}
                      onClick={clearFilters}
                      size="small"
                      color="warning"
                    >
                      Clear All
                    </Button>
                  </Box>
                </Paper>
              </Collapse>

              {/* Results Summary */}
              <Alert 
                severity="info" 
                sx={{ mb: 2, borderRadius: 2 }}
                icon={<FaChartBar />}
              >
                Showing {filteredEntries.length} of {entries.length} entries
                {filteredEntries.length !== entries.length && " (filtered)"}
              </Alert>

              {/* Table */}
              <TableContainer
                component={Paper}
                sx={{
                  borderRadius: 2,
                  border: 1,
                  borderColor: "divider",
                }}
              >
                <Table
                  size={compactView ? "small" : "medium"}
                  sx={{ minWidth: 900 }}
                >
                  <TableHead>
                    <TableRow>
                      {selectedColumns.user && (
                        <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper" }}>
                          <TableSortLabel
                            active={sortBy === "user"}
                            direction={sortBy === "user" ? sortOrder : "asc"}
                            onClick={() => {
                              setSortBy("user");
                              setSortOrder(sortBy === "user" && sortOrder === "asc" ? "desc" : "asc");
                            }}
                          >
                            User
                          </TableSortLabel>
                        </TableCell>
                      )}
                      {selectedColumns.email && (
                        <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper" }}>
                          Email
                        </TableCell>
                      )}
                      {selectedColumns.date && (
                        <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper" }}>
                          <TableSortLabel
                            active={sortBy === "date"}
                            direction={sortBy === "date" ? sortOrder : "asc"}
                            onClick={() => {
                              setSortBy("date");
                              setSortOrder(sortBy === "date" && sortOrder === "asc" ? "desc" : "asc");
                            }}
                          >
                            Date
                          </TableSortLabel>
                        </TableCell>
                      )}
                      {selectedColumns.start && (
                        <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper" }}>
                          Start
                        </TableCell>
                      )}
                      {selectedColumns.end && (
                        <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper" }}>
                          End
                        </TableCell>
                      )}
                      {selectedColumns.duration && (
                        <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper" }}>
                          <TableSortLabel
                            active={sortBy === "duration"}
                            direction={sortBy === "duration" ? sortOrder : "asc"}
                            onClick={() => {
                              setSortBy("duration");
                              setSortOrder(sortBy === "duration" && sortOrder === "asc" ? "desc" : "asc");
                            }}
                          >
                            Duration
                          </TableSortLabel>
                        </TableCell>
                      )}
                      {selectedColumns.description && (
                        <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper", maxWidth: 200 }}>
                          Description
                        </TableCell>
                      )}
                      {selectedColumns.project && (
                        <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper" }}>
                          <TableSortLabel
                            active={sortBy === "project"}
                            direction={sortBy === "project" ? sortOrder : "asc"}
                            onClick={() => {
                              setSortBy("project");
                              setSortOrder(sortBy === "project" && sortOrder === "asc" ? "desc" : "asc");
                            }}
                          >
                            Project
                          </TableSortLabel>
                        </TableCell>
                      )}
                      <TableCell sx={{ fontWeight: 700, bgcolor: "background.paper", width: 80 }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={Object.values(selectedColumns).filter(Boolean).length + 1} align="center" sx={{ py: 4 }}>
                          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                            <FaFileAlt size={32} style={{ opacity: 0.5 }} />
                            <Typography>No entries found.</Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedEntries.map((entry, idx) => (
                        <TableRow key={entry.id}>
                          {selectedColumns.user && (
                            <TableCell>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                {entry.profile?.full_name || entry.user_id}
                              </Box>
                            </TableCell>
                          )}
                          {selectedColumns.email && (
                            <TableCell sx={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>
                              <Tooltip title={entry.profile?.email || ""} arrow>
                                <span>{entry.profile?.email || ""}</span>
                              </Tooltip>
                            </TableCell>
                          )}
                          {selectedColumns.date && (
                            <TableCell>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <FaCalendarAlt size={12} style={{ opacity: 0.6 }} />
                                {entry.date ? new Date(entry.date).toLocaleDateString() : ""}
                              </Box>
                            </TableCell>
                          )}
                          {selectedColumns.start && (
                            <TableCell>
                              {entry.start ? new Date(`2000-01-01T${entry.start}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}
                            </TableCell>
                          )}
                          {selectedColumns.end && (
                            <TableCell>
                              {entry.end ? new Date(`2000-01-01T${entry.end}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}
                            </TableCell>
                          )}
                          {selectedColumns.duration && (
                            <TableCell>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <FaClock size={12} style={{ opacity: 0.6 }} />
                                <Chip
                                  label={entry.duration}
                                  size="small"
                                  color="info"
                                  variant="outlined"
                                />
                              </Box>
                            </TableCell>
                          )}
                          {selectedColumns.description && (
                            <TableCell sx={{ maxWidth: 200 }}>
                              <Tooltip title={entry.description || ""} arrow>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {entry.description || "No description"}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                          )}
                          {selectedColumns.project && (
                            <TableCell>
                              <Chip
                                label={entry.projectName}
                                color="warning"
                                size="small"
                                sx={{ fontWeight: 600 }}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedEntry(entry);
                                setDetailsDialogOpen(true);
                              }}
                              color="warning"
                            >
                              <FaEye />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              <Box sx={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                py: 2,
                flexWrap: "wrap",
                gap: 2
              }}>
                <Typography variant="body2" color="text.secondary">
                  Showing {((page - 1) * rowsPerPage) + 1}-{Math.min(page * rowsPerPage, filteredEntries.length)} of {filteredEntries.length} entries
                </Typography>
                
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <FormControl size="small">
                    <Select
                      value={rowsPerPage}
                      onChange={(e) => setRowsPerPage(e.target.value)}
                      variant="outlined"
                    >
                      <MenuItem value={10}>10 per page</MenuItem>
                      <MenuItem value={20}>20 per page</MenuItem>
                      <MenuItem value={50}>50 per page</MenuItem>
                      <MenuItem value={100}>100 per page</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <Pagination
                    count={pageCount}
                    page={page}
                    onChange={(_, value) => setPage(value)}
                    color="warning"
                    shape="rounded"
                    showFirstButton
                    showLastButton
                    size={compactView ? "small" : "medium"}
                  />
                </Box>
              </Box>
            </Box>
          </GlassCard>
        </Box>

        {/* Column Selection Dialog */}
        <Dialog open={columnMenuOpen} onClose={() => setColumnMenuOpen(false)}>
          <DialogTitle>Select Columns</DialogTitle>
          <DialogContent>
            <List>
              {Object.keys(selectedColumns).map((column) => (
                <ListItem key={column}>
                  <ListItemIcon>
                    <Switch
                      checked={selectedColumns[column]}
                      onChange={(e) => setSelectedColumns(prev => ({
                        ...prev,
                        [column]: e.target.checked
                      }))}
                      color="warning"
                    />
                  </ListItemIcon>
                  <ListItemText primary={column.charAt(0).toUpperCase() + column.slice(1)} />
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setColumnMenuOpen(false)}>Done</Button>
          </DialogActions>
        </Dialog>

        {/* Entry Details Dialog */}
        <Dialog 
          open={detailsDialogOpen} 
          onClose={() => setDetailsDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Entry Details</DialogTitle>
          <DialogContent>
            {selectedEntry && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">User</Typography>
                  <Typography variant="body1">{selectedEntry.profile?.full_name || selectedEntry.user_id}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                  <Typography variant="body1">{selectedEntry.profile?.email || "N/A"}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Project</Typography>
                  <Typography variant="body1">{selectedEntry.projectName}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Duration</Typography>
                  <Typography variant="body1">{selectedEntry.duration}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Date</Typography>
                  <Typography variant="body1">{selectedEntry.date}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Time Range</Typography>
                  <Typography variant="body1">{selectedEntry.start} - {selectedEntry.end}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                  <Typography variant="body1">{selectedEntry.description || "No description provided"}</Typography>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Floating Export Button */}
        <Fab
          color="warning"
          sx={{ position: "fixed", bottom: 16, right: 16 }}
          onClick={handleExport}
          disabled={filteredEntries.length === 0}
        >
          <FaDownload />
        </Fab>
      </Box>
      
      <style jsx>{`
        .spinning {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </ThemeProvider>
  );
}