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
      const { data: profilesData } = await supabase.from("profiles").select("id, full_name, email, workspace_id, role");
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
          overflowX: "hidden", // Prevent horizontal scroll
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: "900px",
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

          {/* Create Workspace Tile */}
          <motion.div variants={tileVariants} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
            <Card elevation={4} sx={{ borderRadius: 5, bgcolor: "background.paper" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>
                  Create New Workspace
                </Typography>
                <Stack direction="row" spacing={2}>
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
              </CardContent>
            </Card>
          </motion.div>

          {/* Profiles Table Tile */}
          <motion.div variants={tileVariants} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
            <Card elevation={4} sx={{ borderRadius: 5, bgcolor: "background.paper" }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} color="text.secondary" sx={{ mb: 2 }}>
                  User Profiles
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Workspace</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Total Time</TableCell> {/* New column */}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {profiles.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ color: "text.disabled" }}>
                            No profiles found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        profiles.map((profile) => (
                          <TableRow key={profile.id}>
                            <TableCell>
                              <Button variant="text" onClick={() => handleShowEntries(profile)}>
                                {profile.full_name || profile.id}
                              </Button>
                            </TableCell>
                            <TableCell>{profile.email || ""}</TableCell>
                            <TableCell>{profile.role}</TableCell>
                            <TableCell>
                              <Select
                                value={profile.workspace_id || ""}
                                onChange={(e) => handleWorkspaceChange(profile.id, e.target.value)}
                                size="small"
                              >
                                <MenuItem value="">None</MenuItem>
                                {workspaces.map((ws) => (
                                  <MenuItem key={ws.id} value={ws.id}>
                                    {ws.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </TableCell>
                            <TableCell>
                              {userTimes[profile.id]
                                ? formatSecondsToHMS(userTimes[profile.id])
                                : "00:00:00"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
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