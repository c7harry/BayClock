import { useState, useEffect, useMemo } from "react";
import {
  Card, CardContent, Typography, Box, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Tooltip, Divider, Snackbar, Alert
} from "@mui/material";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { motion } from "framer-motion";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RestoreIcon from "@mui/icons-material/Restore";
import SearchIcon from "@mui/icons-material/Search";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import MenuItem from "@mui/material/MenuItem";
import {FaFolderOpen} from "react-icons/fa";
import { GlassCard } from "../components/Theme";

export default function Projects() {
  const navigate = useNavigate();
  const [role, setRole] = useState(null);

  // Fetch user role
  useEffect(() => {
    async function fetchRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      setRole(profile?.role || null);
    }
    fetchRole();
  }, [navigate]);

  // Theme (match other pages)
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

  // Projects state (from Supabase)
  const [projects, setProjects] = useState([]);
  const [deletedProjects, setDeletedProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch projects from Supabase
  useEffect(() => {
    async function fetchProjects() {
      setLoading(true);
      const { data, error } = await supabase.from("projects").select("*");
      if (!error) setProjects(data || []);
      setLoading(false);
    }
    fetchProjects();
    window.addEventListener("projects-updated", fetchProjects);
    return () => window.removeEventListener("projects-updated", fetchProjects);
  }, []);

  // Dialog state for add/edit
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [form, setForm] = useState({ name: "", client: "", status: "Active", workspace_id: "" });

  // Snackbar for restore
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProjects, setFilteredProjects] = useState([]);

  // Workspaces state
  const [workspaces, setWorkspaces] = useState([]);

  // Fetch all workspaces for all users (not just admins)
  useEffect(() => {
    supabase.from("workspaces").select("*").then(({ data }) => {
      setWorkspaces(data || []);
    });
  }, []);

  // Open dialog for add/edit
  const handleOpenDialog = (project = null) => {
    setEditProject(project);
    setForm(
      project
        ? { name: project.name, client: project.client, status: project.status, workspace_id: project.workspace_id }
        : { name: "", client: "", status: "Active", workspace_id: "" }
    );
    setDialogOpen(true);
  };
  const handleCloseDialog = () => setDialogOpen(false);

  // Add or update project
  const handleSave = async () => {
    if (!form.name.trim()) return;

    let workspace_id = form.workspace_id;
    if (role !== "admin") {
      setSnackbar({ open: true, message: "Only admins can add projects.", severity: "error" });
      return;
    }
    if (!workspace_id) {
      setSnackbar({ open: true, message: "Please select a workspace.", severity: "error" });
      return;
    }

    let error;
    if (editProject) {
      ({ error } = await supabase
        .from("projects")
        .update({ ...form, workspace_id })
        .eq("id", editProject.id));
    } else {
      const { error: insertError } = await supabase.from("projects").insert([
        {
          ...form,
          workspace_id,
        },
      ]);
      error = insertError;
    }

    if (error) {
      setSnackbar({ open: true, message: error.message, severity: "error" });
      return;
    }

    setDialogOpen(false);
    window.dispatchEvent(new Event("projects-updated"));
  };

  // Delete project (soft delete: move to deletedProjects)
  const handleDelete = async (id) => {
    const projectToDelete = projects.find((p) => p.id === id);
    if (projectToDelete) {
      setDeletedProjects((prev) => [
        ...prev,
        { ...projectToDelete, deletedAt: new Date().toISOString() },
      ]);
      await supabase.from("projects").delete().eq("id", id);
      setSnackbar({ open: true, message: "Project deleted. You can restore it.", severity: "info" });
      window.dispatchEvent(new Event("projects-updated"));
    }
  };

  // Restore deleted project
  const handleRestore = async (deletedProject) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("workspace_id")
      .eq("id", user.id)
      .single();
    await supabase.from("projects").insert([
      {
        name: deletedProject.name,
        client: deletedProject.client,
        status: deletedProject.status,
        workspace_id: profile.workspace_id,
      },
    ]);
    setDeletedProjects((prev) => prev.filter((p) => p.id !== deletedProject.id));
    setSnackbar({ open: true, message: "Project restored!", severity: "success" });
    window.dispatchEvent(new Event("projects-updated"));
  };

  // Filter projects when searchTerm changes
  useEffect(() => {
    if (!searchTerm) {
      setFilteredProjects(projects);
    } else {
      setFilteredProjects(
        projects.filter(
          (p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.client && p.client.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      );
    }
  }, [searchTerm, projects]);

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
          {/* Projects Table Tile */}
          <GlassCard
            title="Projects"
            icon={<FaFolderOpen size={16} />}
            delay={0.1}
            sx={{
              width: "100%",
              maxWidth: "100%",
            }}
          >
            <Box sx={{ p: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                {role === "admin" ? (
                  <Box /> 
                ) : (
                  <TextField
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="small"
                    variant="outlined"
                    sx={{
                      bgcolor: "background.default",
                      borderRadius: 2,
                      minWidth: 180,
                      "& .MuiInputBase-input": { fontSize: "0.97rem", py: 0.7 },
                    }}
                    InputProps={{
                      startAdornment: (
                        <SearchIcon sx={{ color: theme.palette.mode === "dark" ? "#fff" : "#222", mr: 1 }} />
                      ),
                    }}
                  />
                )}
                
                {role === "admin" && (
                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={<AddIcon />}
                    sx={{ borderRadius: 2, fontWeight: 600 }}
                    onClick={() => handleOpenDialog()}
                  >
                    Add Project
                  </Button>
                )}
              </Box>
              <Divider sx={{ mb: 1, borderColor: 'black', borderBottomWidth: 1 }} />
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{
                  '& .MuiTableCell-root': {
                    borderBottom: '1px solid black'
                  }
                }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Client</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Workspace</TableCell>
                      {role === "admin" && (
                        <TableCell sx={{ fontWeight: 700 }} align="right">
                          Actions
                        </TableCell>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(role === "admin" ? projects : filteredProjects).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={role === "admin" ? 5 : 4} align="center" sx={{ color: "text.disabled" }}>
                          No projects yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (role === "admin" ? projects : filteredProjects).map((project) => (
                        <TableRow key={project.id}>
                          <TableCell>{project.name}</TableCell>
                          <TableCell>{project.client}</TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: "inline-block",
                                px: 1.2,
                                py: 0.2,
                                borderRadius: 2,
                                bgcolor:
                                  project.status === "Active"
                                    ? "success.light"
                                    : "grey.300",
                                color:
                                  project.status === "Active"
                                    ? "success.dark"
                                    : "grey.700",
                                fontWeight: 600,
                                fontSize: 13,
                              }}
                            >
                              {project.status}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {workspaces.find(ws => ws.id === project.workspace_id)?.name || "—"}
                          </TableCell>
                          {role === "admin" && (
                            <TableCell align="right">
                              <>
                                <Tooltip title="Edit" arrow>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenDialog(project)}
                                    sx={{ mr: 1 }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete" arrow>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDelete(project.id)}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          </GlassCard>

          {/* Deleted Projects Tile */}
          {deletedProjects.length > 0 && (
            <GlassCard
              title="Recently Deleted Projects"
              delay={0.2}
              sx={{
                width: "100%",
                maxWidth: "100%",
              }}
            >
              <Box sx={{ p: 2.5 }}>
                <Box sx={{ overflowX: "auto" }}>
                  <Table size="small" sx={{
                    '& .MuiTableCell-root': {
                      borderBottom: '1px solid black'
                    }
                  }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Client</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">
                          Restore
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {deletedProjects.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell>{project.name}</TableCell>
                          <TableCell>{project.client}</TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: "inline-block",
                                px: 1.2,
                                py: 0.2,
                                borderRadius: 2,
                                bgcolor:
                                  project.status === "Active"
                                    ? "success.light"
                                    : "grey.300",
                                color:
                                  project.status === "Active"
                                    ? "success.dark"
                                    : "grey.700",
                                fontWeight: 600,
                                fontSize: 13,
                              }}
                            >
                              {project.status}
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Restore" arrow>
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleRestore(project)}
                              >
                                <RestoreIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            </GlassCard>
          )}
        </Box>

        {/* Add/Edit Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          maxWidth="xs"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              p: 2,
              bgcolor: "background.paper",
              boxShadow: 6,
            },
          }}
        >
          <DialogTitle
            sx={{
              fontWeight: 700,
              fontSize: 22,
              color: "text.primary",
              pb: 1,
              borderBottom: "1px solid",
              borderColor: "divider",
              bgcolor: "transparent",
            }}
          >
            {editProject ? "Edit Project" : "Add Project"}
          </DialogTitle>
          <DialogContent
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              pt: 2,
              pb: 1,
              bgcolor: "transparent",
            }}
          >
            <TextField
              label="Project Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              fullWidth
              autoFocus
              required
              variant="outlined"
              inputProps={{ maxLength: 100, style: { minWidth: 0 } }}
              InputProps={{ style: { minWidth: 0 } }}
              sx={{ mt: 3 }}
            />
            <TextField
              label="Client"
              value={form.client}
              onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))}
              fullWidth
              variant="outlined"
            />
            <TextField
              select
              label="Status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              fullWidth
              variant="outlined"
              SelectProps={{ native: true }}
            >
              <option value="Active">Active</option>
              <option value="Archived">Archived</option>
            </TextField>
            {role === "admin" && (
              <TextField
                select
                label="Workspace"
                value={form.workspace_id || ""}
                onChange={e => setForm(f => ({ ...f, workspace_id: e.target.value }))}
                fullWidth
                required
                variant="outlined"
                sx={{ mt: 2 }}
              >
                <MenuItem value="">Select workspace</MenuItem>
                {workspaces.map(ws => (
                  <MenuItem key={ws.id} value={ws.id}>{ws.name}</MenuItem>
                ))}
              </TextField>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
            <Button onClick={handleCloseDialog} color="inherit" variant="outlined">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              color="warning"
              disabled={!form.name.trim()}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for feedback */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
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
      </Box>
    </ThemeProvider>
  );
}