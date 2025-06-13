import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabaseClient";
import {
  Card, CardContent, Typography, Box, Button, TextField, Table, TableHead, TableRow, TableCell, TableBody,
  Select, MenuItem, Paper, Snackbar, Alert, Stack, Divider, Dialog, DialogTitle, DialogContent, IconButton, Chip, Tooltip, TableContainer
} from "@mui/material";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { motion } from "framer-motion";
import { FaUserShield } from "react-icons/fa";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";
import { MdEdit, MdDelete, MdSave, MdCancel } from "react-icons/md";
import Pagination from "@mui/material/Pagination";

// Helper to parse durations like "4h", "1m 41s", "2h 3m 10s", etc
function parseDurationTextToSeconds(duration) {
  if (!duration || typeof duration !== "string") return 0;
  let total = 0;
  const regex = /(\d+)\s*h|\s*(\d+)\s*m|\s*(\d+)\s*s/gi;
  let match;
  // Support for "4h", "1m 41s", "2h 3m 10s", etc.
  // We'll use a global regex to match all occurrences
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

  // Search and sort states
  const [searchEmail, setSearchEmail] = useState("");
  const [sortField, setSortField] = useState(""); // "totalTime" or "created"
  const [sortOrder, setSortOrder] = useState("desc"); // "asc" or "desc"

  // Theme (match Projects page)
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

  // Fetch all profiles, workspaces, and projects
  useEffect(() => {
    async function fetchData() {
      // Add created_at to select for sorting
      const { data: profilesData } = await supabase.from("profiles").select("id, full_name, email, workspace_id, role, created_at");
      const { data: workspacesData } = await supabase.from("workspaces").select("id, name");
      const { data: projectsData } = await supabase.from("projects").select("id, name");
      setProfiles(profilesData || []);
      setWorkspaces(workspacesData || []);
      setProjects(projectsData || []);
    }
    fetchData();
  }, []);

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

  // Assign workspace to user (already updates on dropdown change)
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

  // Helper to get project name by id
  const getProjectName = (id) => projects.find((p) => p.id === id)?.name || id;

  // Animation variants
  const tileVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  // Close dialog handler
  const handleCloseDialog = () => {
    setEntriesDialogOpen(false);
    setSelectedUserEntries([]);
    setSelectedUserName("");
  };

  // Add state for all entries and user total times
  const [allEntries, setAllEntries] = useState([]);
  const [userTimes, setUserTimes] = useState({});

  // Fetch all entries for all users
  useEffect(() => {
    async function fetchEntries() {
      const { data: entriesData } = await supabase.from("entries").select("user_id, duration");
      setAllEntries(entriesData || []);
    }
    fetchEntries();
  }, []);

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
        (profile.email || "").toLowerCase().includes(searchEmail.trim().toLowerCase())
      );
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
  }, [profiles, searchEmail, sortField, sortOrder, userTimes]);

  // Pagination state
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  // Paginated profiles
  const paginatedProfiles = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredProfiles.slice(start, start + rowsPerPage);
  }, [filteredProfiles, page]);

  // Reset to first page if filter changes and current page is out of range
  useEffect(() => {
    setPage(1);
  }, [searchEmail, sortField, sortOrder]);

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
          {/* Header Tile */}
          <motion.div variants={tileVariants} initial="hidden" animate="visible">
            <Card
              elevation={6}
              sx={{
                borderRadius: 5,
                bgcolor: "background.paper",
                width: "100%", 
                maxWidth: "100%",
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
                }}
              >
                <FaUserShield size={32} color="#fb923c" />
                <Typography
                  variant="h4"
                  fontWeight={700}
                  color="text.primary"
                  sx={{ textAlign: "center" }}
                >
                  Admin
                </Typography>
              </CardContent>
            </Card>
          </motion.div>

          {/* Workspace Tile */}
          <motion.div variants={tileVariants} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
            <Card
              elevation={4}
              sx={{
                borderRadius: 5,
                bgcolor: "background.paper",
                width: "100%", 
                maxWidth: "100%",
              }}
            >
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Workspace
                </Typography>
                <Stack direction="row" spacing={2} mb={2}>
                  <TextField
                    label="Workspace Name"
                    value={newWorkspace}
                    onChange={e => setNewWorkspace(e.target.value)}
                    size="small"
                    variant="outlined"
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleCreateWorkspace}
                    disabled={!newWorkspace.trim()}
                  >
                    Create
                  </Button>
                </Stack>
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, boxShadow: "none" }}>
                  <Table size="small" aria-label="workspace table">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "background.default" }}>
                        <TableCell sx={{ fontWeight: 700, width: "65%" }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: "35%" }} align="right">
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {workspaces.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} align="center" sx={{ color: "text.disabled" }}>
                            No workspaces found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        workspaces.map((ws) => (
                          <TableRow key={ws.id} hover>
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
                                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                  {ws.name}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              {editingWorkspace?.id === ws.id ? (
                                <>
                                  <Button
                                    size="small"
                                    color="primary"
                                    onClick={handleSaveWorkspace}
                                    disabled={!editWorkspaceName.trim()}
                                    sx={{ mr: 1, minWidth: 36 }}
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
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="small"
                                    color="primary"
                                    onClick={() => handleEditWorkspace(ws)}
                                    sx={{ mr: 1, minWidth: 36 }}
                                    variant="outlined"
                                  >
                                    <MdEdit />
                                  </Button>
                                  <Button
                                    size="small"
                                    color="error"
                                    onClick={() => handleDeleteWorkspace(ws)}
                                    sx={{ minWidth: 36 }}
                                    variant="outlined"
                                  >
                                    <MdDelete />
                                  </Button>
                                </>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Profiles Table Tile */}
          <motion.div variants={tileVariants} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
            <Card
              elevation={4}
              sx={{
                borderRadius: 5,
                bgcolor: "background.paper",
                width: "100%",
                maxWidth: "100%",
              }}
            >
              <CardContent>
                <Typography
                  variant="h6"
                  fontWeight={600}
                  mb={2}
                  color="text.primary"
                  sx={{ fontSize: "1.25rem" }}
                >
                  User Profiles
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {/* Search and Filter Controls */}
                <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
                  <TextField
                    label="Search by Email"
                    value={searchEmail}
                    onChange={e => setSearchEmail(e.target.value)}
                    size="small"
                    variant="outlined"
                  />
                  <Select
                    value={sortField}
                    onChange={e => setSortField(e.target.value)}
                    size="small"
                    displayEmpty
                    sx={{ minWidth: 160 }}
                  >
                    <MenuItem value="">Sort By...</MenuItem>
                    <MenuItem value="totalTime">Total Time</MenuItem>
                    <MenuItem value="created">Created Date</MenuItem>
                  </Select>
                  {sortField && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                    >
                      {sortOrder === "asc" ? "Ascending" : "Descending"}
                    </Button>
                  )}
                  {sortField && (
                    <Button
                      variant="text"
                      size="small"
                      color="inherit"
                      onClick={() => { setSortField(""); setSortOrder("desc"); }}
                    >
                      Clear Sort
                    </Button>
                  )}
                </Box>

                <Table size="small" aria-label="user profiles table">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "background.default" }}>
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
                        <TableCell colSpan={6} align="center" sx={{ color: "text.disabled" }}>
                          No profiles found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedProfiles.map((profile) => (
                        <TableRow key={profile.id} hover>
                          <TableCell align="center">
                            <Button
                              variant="text"
                              onClick={() => handleShowEntries(profile)}
                              sx={{ textTransform: "none", fontWeight: 500, color: "primary.main" }}
                            >
                              {profile.full_name || profile.id}
                            </Button>
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
                              sx={{ minWidth: 120, bgcolor: "background.default" }}
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
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {/* Pagination controls */}
                <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                  <Pagination
                    count={Math.ceil(filteredProfiles.length / rowsPerPage)}
                    page={page}
                    onChange={(_, value) => setPage(value)}
                    color="primary"
                  />
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Box>
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

        {/* User Entries Dialog */}
        <Dialog
          open={entriesDialogOpen}
          onClose={() => setEntriesDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 4,
              maxHeight: "80vh",
              bgcolor: "background.paper",
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 700, fontSize: 22, display: "flex", alignItems: "center" }}>
            Entries for {selectedUserName}
            <IconButton
              aria-label="close"
              onClick={() => setEntriesDialogOpen(false)}
              sx={{ position: "absolute", right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers sx={{ p: 0 }}>
            {selectedUserEntries.length === 0 ? (
              <Box sx={{ p: 3 }}>
                <Typography>No entries found.</Typography>
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
                      <TableCell sx={{ fontWeight: 700, bgcolor: "background.default", maxWidth: 180 }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 700, bgcolor: "background.default" }}>Project</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedUserEntries.map((entry) => (
                      <TableRow key={entry.id} hover>
                        <TableCell>{entry.date}</TableCell>
                        <TableCell>{entry.start}</TableCell>
                        <TableCell>{entry.end}</TableCell>
                        <TableCell>{entry.duration}</TableCell>
                        <TableCell sx={{ maxWidth: 180, p: 0.5 }}>
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
                                maxWidth: 180,
                              }}
                            >
                              {entry.description}
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
                      </TableRow>
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