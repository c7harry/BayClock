import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabaseClient";
import {
  Typography, Box, Button, TextField, Table, TableHead, TableRow, TableCell, TableBody,
  Select, MenuItem, Paper, Snackbar, Alert, Stack, Dialog, DialogTitle, DialogContent, IconButton, Chip, Tooltip, TableContainer,
  Grid, Avatar, Switch, FormControlLabel, Tab, Tabs, Badge, CircularProgress } from "@mui/material";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { FaCog, FaUsers} from "react-icons/fa";
import { MdBusiness } from "react-icons/md";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";
import { MdEdit, MdDelete, MdSave, MdCancel } from "react-icons/md";
import Pagination from "@mui/material/Pagination";
import { GlassCard } from "../../components/Theme";

// Helper to parse durations like "4h", "1m 41s", "2h 3m 10s", etc
function parseDurationTextToSeconds(duration) {
  if (!duration || typeof duration !== "string") return 0;
  let total = 0;
  const hourMatch = duration.match(/(\d+)\s*h/);
  if (hourMatch) total += parseInt(hourMatch[1], 10) * 3600;
  const minMatch = duration.match(/(\d+)\s*m/);
  if (minMatch) total += parseInt(minMatch[1], 10) * 60;
  const secMatch = duration.match(/(\d+)\s*s/);
  if (secMatch) total += parseInt(secMatch[1], 10);
  return total;
}

// Helper to format seconds as HH:MM:SS
function formatSecondsToHMS(totalSeconds) {
  totalSeconds = Math.round(totalSeconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    seconds.toString().padStart(2, "0"),
  ].join(":");
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [newWorkspace, setNewWorkspace] = useState("");
  const [entriesDialogOpen, setEntriesDialogOpen] = useState(false);
  const [selectedUserEntries, setSelectedUserEntries] = useState([]);
  const [selectedUserName, setSelectedUserName] = useState("");
  const [projects, setProjects] = useState([]);
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [editWorkspaceName, setEditWorkspaceName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // New states for enhanced features
  const [currentTab, setCurrentTab] = useState(0);
  const [compactView, setCompactView] = useState(false);
  const [showInactiveUsers, setShowInactiveUsers] = useState(true);

  // Search and sort states
  const [searchEmail, setSearchEmail] = useState("");
  const [sortField, setSortField] = useState(""); 
  const [sortOrder, setSortOrder] = useState("desc");

  // State for all entries and user total times
  const [allEntries, setAllEntries] = useState([]);
  const [userTimes, setUserTimes] = useState({});

  // Theme
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
                  light: "#ffc896",
                  dark: "#e67e22",
                },
              }
            : {
                background: {
                  default: "#18181b",
                  paper: "#23232a",
                },
                primary: {
                  main: "#fb923c",
                  light: "#ffc896",
                  dark: "#e67e22",
                },
              }),
          warning: {
            main: "#fb923c",
            light: "#ffe6d3",
            dark: "#b45309",
          },
        },
        components: {
          MuiTab: {
            styleOverrides: {
              root: {
                fontWeight: 600,
                fontSize: '0.95rem',
              },
            },
          },
        },
      }),
    [mode]
  );

  // Route protection: only allow admins
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return navigate("/login");
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      if (!profile || profile.role !== "admin") {
        setSnackbar({ open: true, message: "Access denied.", severity: "error" });
        setTimeout(() => navigate("/dashboard"), 1500);
      }
    });
  }, [navigate]);

  // Fetch all data
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [profilesRes, workspacesRes, projectsRes, entriesRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, workspace_id, role, created_at"),
        supabase.from("workspaces").select("id, name"),
        supabase.from("projects").select("id, name"),
        supabase.from("entries").select("user_id, duration, date, created_at")
      ]);

      setProfiles(profilesRes.data || []);
      setWorkspaces(workspacesRes.data || []);
      setProjects(projectsRes.data || []);
      setAllEntries(entriesRes.data || []);
    } catch (error) {
      setSnackbar({ open: true, message: "Error fetching data", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    setSnackbar({ open: true, message: "Data refreshed!", severity: "success" });
  };

  // Create a new workspace
  const handleCreateWorkspace = async () => {
    if (!newWorkspace.trim()) return;
    const { data, error } = await supabase
      .from("workspaces")
      .insert([{ name: newWorkspace.trim() }])
      .select()
      .single();
    if (error) {
      setSnackbar({ open: true, message: error.message, severity: "error" });
    } else {
      setWorkspaces((prev) => [...prev, data]);
      setSnackbar({ open: true, message: "Workspace created!", severity: "success" });
      setNewWorkspace("");
    }
  };

  // Edit workspace handlers
  const handleEditWorkspace = (ws) => {
    setEditingWorkspace(ws);
    setEditWorkspaceName(ws.name);
  };
  const handleCancelEditWorkspace = () => {
    setEditingWorkspace(null);
    setEditWorkspaceName("");
  };
  const handleSaveWorkspace = async () => {
    if (!editWorkspaceName.trim()) return;
    const { error } = await supabase
      .from("workspaces")
      .update({ name: editWorkspaceName.trim() })
      .eq("id", editingWorkspace.id);
    if (error) {
      setSnackbar({ open: true, message: error.message, severity: "error" });
    } else {
      setWorkspaces((prev) =>
        prev.map((ws) =>
          ws.id === editingWorkspace.id ? { ...ws, name: editWorkspaceName.trim() } : ws
        )
      );
      setSnackbar({ open: true, message: "Workspace updated!", severity: "success" });
      handleCancelEditWorkspace();
    }
  };

  // Delete workspace handler
  const handleDeleteWorkspace = async (ws) => {
    if (!window.confirm(`Delete workspace "${ws.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("workspaces").delete().eq("id", ws.id);
    if (error) {
      setSnackbar({ open: true, message: error.message, severity: "error" });
    } else {
      setWorkspaces((prev) => prev.filter((w) => w.id !== ws.id));
      setSnackbar({ open: true, message: "Workspace deleted.", severity: "success" });
    }
  };

  // Assign workspace to user
  const handleWorkspaceChange = async (userId, workspaceId) => {
    const value = workspaceId === "" ? null : workspaceId;
    const { error } = await supabase
      .from("profiles")
      .update({ workspace_id: value })
      .eq("id", userId);
    if (error) {
      setSnackbar({ open: true, message: error.message, severity: "error" });
    } else {
      setProfiles((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, workspace_id: value } : p))
      );
      setSnackbar({ open: true, message: "Workspace updated!", severity: "success" });
    }
  };

  // Show user entries in dialog
  const handleShowEntries = async (profile) => {
    const { data, error } = await supabase
      .from("entries")
      .select("*")
      .eq("user_id", profile.id)
      .order("date", { ascending: false })
      .order("start", { ascending: false });
    if (!error) {
      setSelectedUserEntries(data || []);
      setSelectedUserName(profile.full_name || profile.email || profile.id);
      setEntriesDialogOpen(true);
    }
  };

  // Export data functionality
  const handleExportData = () => {
    const csvData = profiles.map(profile => ({
      Name: profile.full_name || "",
      Email: profile.email || "",
      Role: profile.role || "",
      Workspace: workspaces.find(w => w.id === profile.workspace_id)?.name || "None",
      TotalTime: userTimes[profile.id] ? formatSecondsToHMS(userTimes[profile.id]) : "00:00:00",
      Created: profile.created_at ? new Date(profile.created_at).toLocaleDateString() : ""
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(","),
      ...csvData.map(row => Object.values(row).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin_panel_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    setSnackbar({ open: true, message: "Data exported successfully!", severity: "success" });
  };

  // Helper to get project name by id
  const getProjectName = (id) => projects.find((p) => p.id === id)?.name || id;

  // Helper to get workspace name by id
  const getWorkspaceName = (id) => workspaces.find((w) => w.id === id)?.name || "None";

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Close dialog handler
  const handleCloseDialog = () => {
    setEntriesDialogOpen(false);
    setSelectedUserEntries([]);
    setSelectedUserName("");
  };

  // Calculate total time per user in seconds
  useEffect(() => {
    const grouped = {};
    allEntries.forEach(entry => {
      const seconds = parseDurationTextToSeconds(entry.duration);
      grouped[entry.user_id] = (grouped[entry.user_id] || 0) + seconds;
    });
    setUserTimes(grouped);
  }, [allEntries]);

  // Filter and sort profiles
  const filteredProfiles = useMemo(() => {
    let filtered = profiles;
    
    if (searchEmail.trim()) {
      filtered = filtered.filter((profile) =>
        (profile.email || "").toLowerCase().includes(searchEmail.trim().toLowerCase()) ||
        (profile.full_name || "").toLowerCase().includes(searchEmail.trim().toLowerCase())
      );
    }
    
    if (!showInactiveUsers) {
      const activeUserIds = new Set(allEntries.map(entry => entry.user_id));
      filtered = filtered.filter(profile => activeUserIds.has(profile.id));
    }
    
    if (sortField === "totalTime") {
      filtered = [...filtered].sort((a, b) => {
        const aTime = userTimes[a.id] || 0;
        const bTime = userTimes[b.id] || 0;
        return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
      });
    } else if (sortField === "created") {
      filtered = [...filtered].sort((a, b) => {
        const aDate = new Date(a.created_at || 0);
        const bDate = new Date(b.created_at || 0);
        return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
      });
    }
    return filtered;
  }, [profiles, searchEmail, sortField, sortOrder, userTimes, showInactiveUsers, allEntries]);

  // Pagination state
  const [page, setPage] = useState(1);
  const rowsPerPage = compactView ? 15 : 10;

  // Paginated profiles
  const paginatedProfiles = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredProfiles.slice(start, start + rowsPerPage);
  }, [filteredProfiles, page, rowsPerPage]);

  // Reset to first page if filter changes
  useEffect(() => {
    setPage(1);
  }, [searchEmail, sortField, sortOrder, compactView]);

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: theme.palette.background.default,
          }}
        >
          <CircularProgress size={60} color="primary" />
        </Box>
      </ThemeProvider>
    );
  }

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
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
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
            {/* Tabs Navigation */}
            <motion.div variants={itemVariants}>
              <Paper 
                sx={{ 
                  borderRadius: 3, 
                  overflow: "hidden",
                  background: mode === "dark"
                    ? "rgba(35, 35, 42, 0.7)" 
                    : "rgba(255, 255, 255, 0.7)",
                  backdropFilter: "blur(20px)",
                  border: mode === "dark"
                    ? "1px solid rgba(255, 255, 255, 0.1)" 
                    : "1px solid rgba(0, 0, 0, 0.1)",
                  boxShadow: mode === "dark"
                    ? "0 8px 20px rgba(0, 0, 0, 0.2)"
                    : "0 8px 20px rgba(0, 0, 0, 0.08)",
                }}
              >
                <Tabs
                  value={currentTab}
                  onChange={(_, newValue) => setCurrentTab(newValue)}
                  sx={{
                    bgcolor: "transparent",
                    "& .MuiTab-root": {
                      minHeight: 64,
                      fontWeight: 600,
                      fontSize: '1rem',
                      color: mode === "dark" ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        color: "#fb923c",
                        backgroundColor: mode === "dark" 
                          ? "rgba(251, 146, 60, 0.1)" 
                          : "rgba(251, 146, 60, 0.05)",
                      },
                      "&.Mui-selected": {
                        color: "#fb923c",
                        fontWeight: 700,
                        backgroundColor: mode === "dark" 
                          ? "rgba(251, 146, 60, 0.15)" 
                          : "rgba(251, 146, 60, 0.1)",
                      }
                    },
                    "& .MuiTabs-indicator": {
                      backgroundColor: "#fb923c",
                      height: 3,
                      borderRadius: "2px 2px 0 0",
                      background: "linear-gradient(135deg, #fb923c 0%, #0F2D52 100%)",
                    },
                    "& .MuiTabs-flexContainer": {
                      borderBottom: mode === "dark" 
                        ? "1px solid rgba(255, 255, 255, 0.1)" 
                        : "1px solid rgba(0, 0, 0, 0.1)",
                    }
                  }}
                  variant="fullWidth"
                  TabIndicatorProps={{
                    sx: {
                      background: "linear-gradient(135deg, #fb923c 0%, #0F2D52 100%)",
                    }
                  }}
                >
                  <Tab
                    icon={<FaUsers size={18} />}
                    label="User Management"
                    iconPosition="start"
                    sx={{
                      textTransform: "none",
                      "& .MuiTab-iconWrapper": {
                        transition: "transform 0.3s ease",
                      },
                      "&:hover .MuiTab-iconWrapper": {
                        transform: "scale(1.1)",
                      }
                    }}
                  />
                  <Tab
                    icon={<MdBusiness size={18} />}
                    label="Workspace Management"
                    iconPosition="start"
                    sx={{
                      textTransform: "none",
                      "& .MuiTab-iconWrapper": {
                        transition: "transform 0.3s ease",
                      },
                      "&:hover .MuiTab-iconWrapper": {
                        transform: "scale(1.1)",
                      }
                    }}
                  />
                </Tabs>
              </Paper>
            </motion.div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {currentTab === 0 && (
                <motion.div
                  key="users"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassCard
                    title="User Management"
                    icon={<FaUsers size={16} />}
                    sx={{ width: "100%", maxWidth: "100%" }}
                    whileHover={{}}
                  >
                    <Box sx={{ p: 2.5 }}>
                      {/* Enhanced Filters */}
                      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: "background.default" }}>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} sm={6} md={3}>
                            <TextField
                              label="Search Users"
                              value={searchEmail}
                              onChange={e => setSearchEmail(e.target.value)}
                              size="small"
                              fullWidth
                              InputProps={{
                                startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />,
                              }}
                              sx={{ bgcolor: "background.paper", borderRadius: 1 }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6} md={2}>
                            <Select
                              value={sortField}
                              onChange={e => setSortField(e.target.value)}
                              size="small"
                              fullWidth
                              displayEmpty
                              sx={{ bgcolor: "background.paper", borderRadius: 1 }}
                            >
                              <MenuItem value="">Sort By...</MenuItem>
                              <MenuItem value="totalTime">Total Time</MenuItem>
                              <MenuItem value="created">Created Date</MenuItem>
                            </Select>
                          </Grid>
                          <Grid item xs={12} sm={6} md={2}>
                            {sortField && (
                              <Button
                                variant="outlined"
                                size="small"
                                fullWidth
                                onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                                sx={{ borderRadius: 1 }}
                              >
                                {sortOrder === "asc" ? "↑ Ascending" : "↓ Descending"}
                              </Button>
                            )}
                          </Grid>
                          <Grid item xs={12} sm={6} md={5}>
                            <Stack direction="row" spacing={2} alignItems="center">
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={showInactiveUsers}
                                    onChange={(e) => setShowInactiveUsers(e.target.checked)}
                                    color="primary"
                                  />
                                }
                                label="Show Inactive"
                              />
                              <FormControlLabel
                                control={
                                  <Switch
                                    checked={compactView}
                                    onChange={(e) => setCompactView(e.target.checked)}
                                    color="primary"
                                  />
                                }
                                label="Compact View"
                              />
                              {sortField && (
                                <Button
                                  variant="text"
                                  size="small"
                                  onClick={() => { setSortField(""); setSortOrder("desc"); }}
                                  sx={{ borderRadius: 1 }}
                                >
                                  Clear
                                </Button>
                              )}
                            </Stack>
                          </Grid>
                        </Grid>
                      </Paper>

                      <TableContainer 
                        sx={{ 
                          borderRadius: 2,
                          bgcolor: "background.default",
                          border: 1,
                          borderColor: "divider",
                        }}
                      >
                        <Table 
                          size={compactView ? "small" : "medium"}
                          aria-label="user profiles table"
                          sx={{
                            '& .MuiTableCell-root': {
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                            }
                          }}
                        >
                          <TableHead>
                            <TableRow sx={{ bgcolor: "background.paper" }}>
                              <TableCell sx={{ fontWeight: 700, width: "18%", textAlign: "center" }}>User</TableCell>
                              <TableCell sx={{ fontWeight: 700, width: "24%", textAlign: "center" }}>Email</TableCell>
                              <TableCell sx={{ fontWeight: 700, width: "10%", textAlign: "center" }}>Role</TableCell>
                              <TableCell sx={{ fontWeight: 700, width: "18%", textAlign: "center" }}>Workspace</TableCell>
                              <TableCell sx={{ fontWeight: 700, width: "14%", textAlign: "center" }}>Total Time</TableCell>
                              <TableCell sx={{ fontWeight: 700, width: "16%", textAlign: "center" }}>Created</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {paginatedProfiles.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ color: "text.disabled", py: 4 }}>
                                  No profiles found.
                                </TableCell>
                              </TableRow>
                            ) : (
                              paginatedProfiles.map((profile, index) => (
                                <motion.tr
                                  key={profile.id}
                                  component={TableRow}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  style={{ cursor: "pointer" }}
                                  whileHover={{ backgroundColor: theme.palette.action.hover }}
                                >
                                  <TableCell align="center">
                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                                      <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: 14 }}>
                                        {(profile.full_name || profile.email || "U")[0].toUpperCase()}
                                      </Avatar>
                                      <Tooltip title="View user's entries" arrow>
                                        <Button
                                          variant="text"
                                          onClick={() => handleShowEntries(profile)}
                                          sx={{ textTransform: "none", fontWeight: 500, color: "primary.main" }}
                                        >
                                          {profile.full_name || profile.email || profile.id}
                                        </Button>
                                      </Tooltip>
                                    </Box>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Typography variant="body2">{profile.email || ""}</Typography>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Chip
                                      label={profile.role}
                                      color={profile.role === "admin" ? "warning" : "default"}
                                      size="small"
                                      sx={{
                                        fontWeight: 600,
                                        bgcolor: profile.role === "admin"
                                          ? "warning.light"
                                          : (mode === "dark" ? "grey.800" : "grey.200"),
                                        color: profile.role === "admin"
                                          ? "warning.dark"
                                          : (mode === "dark" ? "#fff" : "text.primary"),
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell align="center">
                                    <Select
                                      value={profile.workspace_id || ""}
                                      onChange={(e) => handleWorkspaceChange(profile.id, e.target.value)}
                                      size="small"
                                      sx={{ 
                                        minWidth: 120, 
                                        bgcolor: "background.default",
                                        borderRadius: 1,
                                      }}
                                    >
                                      <MenuItem value="">None</MenuItem>
                                      {workspaces.map((ws) => (
                                        <MenuItem key={ws.id} value={ws.id}>
                                          {ws.name}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {userTimes[profile.id]
                                        ? formatSecondsToHMS(userTimes[profile.id])
                                        : "00:00:00"}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Typography variant="body2" sx={{ fontWeight: 400 }}>
                                      {profile.created_at
                                        ? new Date(profile.created_at).toLocaleDateString()
                                        : "—"}
                                    </Typography>
                                  </TableCell>
                                </motion.tr>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      
                      {/* Enhanced Pagination */}
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Showing {Math.min(filteredProfiles.length, (page - 1) * rowsPerPage + 1)}-{Math.min(filteredProfiles.length, page * rowsPerPage)} of {filteredProfiles.length} users
                        </Typography>
                        <Pagination
                          count={Math.ceil(filteredProfiles.length / rowsPerPage)}
                          page={page}
                          onChange={(_, value) => setPage(value)}
                          color="primary"
                          size={compactView ? "small" : "medium"}
                        />
                      </Box>
                    </Box>
                  </GlassCard>
                </motion.div>
              )}

              {currentTab === 1 && (
                <motion.div
                  key="workspaces"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassCard
                    title="Workspace Management"
                    icon={<FaCog size={16} />}
                    sx={{ width: "100%", maxWidth: "100%" }}
                    whileHover={{}}
                  >
                    <Box sx={{ p: 2.5 }}>
                      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: "background.default" }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <TextField
                            label="Workspace Name"
                            value={newWorkspace}
                            onChange={e => setNewWorkspace(e.target.value)}
                            size="small"
                            variant="outlined"
                            sx={{
                              bgcolor: "background.paper",
                              borderRadius: 1,
                              flexGrow: 1,
                            }}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && newWorkspace.trim()) {
                                handleCreateWorkspace();
                              }
                            }}
                          />
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={handleCreateWorkspace}
                            disabled={!newWorkspace.trim()}
                            sx={{
                              borderRadius: 2,
                              fontWeight: 600,
                              px: 3,
                              py: 1,
                            }}
                          >
                            Create Workspace
                          </Button>
                        </Stack>
                      </Paper>

                      <TableContainer 
                        component={Paper} 
                        variant="outlined" 
                        sx={{ 
                          borderRadius: 2, 
                          boxShadow: "none",
                          bgcolor: "background.default",
                          border: 1,
                          borderColor: "divider",
                        }}
                      >
                        <Table 
                          size="small" 
                          aria-label="workspace table"
                          sx={{
                            '& .MuiTableCell-root': {
                              borderBottom: '1px solid',
                              borderColor: 'divider',
                            }
                          }}
                        >
                          <TableHead>
                            <TableRow sx={{ bgcolor: "background.paper" }}>
                              <TableCell sx={{ fontWeight: 700, width: "15%" }}>Icon</TableCell>
                              <TableCell sx={{ fontWeight: 700, width: "50%" }}>Name</TableCell>
                              <TableCell sx={{ fontWeight: 700, width: "20%" }}>Users</TableCell>
                              <TableCell sx={{ fontWeight: 700, width: "15%" }} align="right">
                                Actions
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {workspaces.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ color: "text.disabled", py: 4 }}>
                                  No workspaces found.
                                </TableCell>
                              </TableRow>
                            ) : (
                              workspaces.map((ws, index) => {
                                const userCount = profiles.filter(p => p.workspace_id === ws.id).length;
                                return (
                                  <motion.tr
                                    key={ws.id}
                                    component={TableRow}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    whileHover={{ backgroundColor: theme.palette.action.hover }}
                                  >
                                    <TableCell>
                                      <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36 }}>
                                        <MdBusiness size={20} />
                                      </Avatar>
                                    </TableCell>
                                    <TableCell>
                                      {editingWorkspace?.id === ws.id ? (
                                        <TextField
                                          value={editWorkspaceName}
                                          onChange={e => setEditWorkspaceName(e.target.value)}
                                          size="small"
                                          variant="standard"
                                          autoFocus
                                          fullWidth
                                          sx={{ minWidth: 120 }}
                                        />
                                      ) : (
                                        <Box>
                                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                            {ws.name}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            Workspace ID: {ws.id.slice(0, 8)}...
                                          </Typography>
                                        </Box>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Badge badgeContent={userCount} color="primary">
                                        <Chip
                                          label={`${userCount} users`}
                                          size="small"
                                          color={userCount > 0 ? "primary" : "default"}
                                          variant="outlined"
                                        />
                                      </Badge>
                                    </TableCell>
                                    <TableCell align="right">
                                      {editingWorkspace?.id === ws.id ? (
                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                          <Button
                                            size="small"
                                            color="primary"
                                            onClick={handleSaveWorkspace}
                                            disabled={!editWorkspaceName.trim()}
                                            sx={{ minWidth: 36 }}
                                            variant="contained"
                                          >
                                            <MdSave />
                                          </Button>
                                          <Button
                                            size="small"
                                            color="inherit"
                                            onClick={handleCancelEditWorkspace}
                                            sx={{ minWidth: 36 }}
                                            variant="outlined"
                                          >
                                            <MdCancel />
                                          </Button>
                                        </Stack>
                                      ) : (
                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                          <Button
                                            size="small"
                                            color="primary"
                                            onClick={() => handleEditWorkspace(ws)}
                                            sx={{ minWidth: 36 }}
                                            variant="outlined"
                                          >
                                            <MdEdit />
                                          </Button>
                                          {ws.id === "9ef07a06-d8cf-458a-80c0-a68eeafd62b2" ? (
                                            <Tooltip title="Can't delete Main workspace">
                                              <span>
                                                <Button
                                                  size="small"
                                                  color="error"
                                                  sx={{ minWidth: 36 }}
                                                  variant="outlined"
                                                  disabled
                                                >
                                                  <MdDelete />
                                                </Button>
                                              </span>
                                            </Tooltip>
                                          ) : (
                                            <Button
                                              size="small"
                                              color="error"
                                              onClick={() => handleDeleteWorkspace(ws)}
                                              sx={{ minWidth: 36 }}
                                              variant="outlined"
                                            >
                                              <MdDelete />
                                            </Button>
                                          )}
                                        </Stack>
                                      )}
                                    </TableCell>
                                  </motion.tr>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
        </motion.div>
        
        {/* Snackbar for feedback */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* Enhanced User Entries Dialog */}
        <Dialog
          open={entriesDialogOpen}
          onClose={handleCloseDialog}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 4,
              maxHeight: "85vh",
              bgcolor: "background.paper",
            },
          }}
        >
          <DialogTitle
            sx={{
              fontWeight: 700,
              fontSize: 22,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              background: `linear-gradient(135deg, ${theme.palette.primary.main}20 0%, ${theme.palette.primary.light}10 100%)`,
            }}
          >
            <Box sx={{ width: "100%", display: "flex", alignItems: "center" }}>
              <Avatar sx={{ bgcolor: "primary.main", mr: 2, width: 40, height: 40 }}>
                <FaUsers size={20} />
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Entries for {selectedUserName}
                </Typography>
                {selectedUserEntries.length > 0 && (
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {selectedUserEntries.length} entries • User ID: {selectedUserEntries[0].user_id.slice(0, 8)}...
                  </Typography>
                )}
              </Box>
              <IconButton
                aria-label="close"
                onClick={handleCloseDialog}
                sx={{ color: "text.secondary" }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 0 }}>
            {selectedUserEntries.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="h6" color="text.secondary">
                  No entries found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This user hasn't created any time entries yet.
                </Typography>
              </Box>
            ) : (
              <TableContainer sx={{ maxHeight: "60vh", minWidth: 400 }}>
                <Table stickyHeader size="small" aria-label="user entries table">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, bgcolor: "background.default" }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: "background.default" }}>Start</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: "background.default" }}>End</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: "background.default" }}>Duration</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: "background.default", maxWidth: 200 }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: "background.default" }}>Project</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedUserEntries.map((entry, index) => (
                      <motion.tr
                        key={entry.id}
                        component={TableRow}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        whileHover={{ backgroundColor: theme.palette.action.hover }}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {new Date(entry.date).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell>{entry.start}</TableCell>
                        <TableCell>{entry.end}</TableCell>
                        <TableCell>
                          <Chip
                            label={entry.duration}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200, p: 0.5 }}>
                          <Tooltip title={entry.description || "No description"} arrow>
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
                              {entry.description || "No description"}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getProjectName(entry.project_id)}
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
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}