import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card, CardContent, Typography, Box, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Tooltip, Divider, Snackbar, Alert, MenuItem, Chip
} from "@mui/material";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { motion } from "framer-motion";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RestoreIcon from "@mui/icons-material/Restore";
import SearchIcon from "@mui/icons-material/Search";
import { FaFolderOpen } from "react-icons/fa";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { GlassCard } from "../components/Theme";

// Constants
const PROJECT_STATUSES = [
  { value: "Active", label: "Active", color: "success" },
  { value: "Archived", label: "Archived", color: "default" }
];

const INITIAL_FORM_STATE = {
  name: "",
  client: "",
  status: "Active",
  workspace_id: ""
};

const SNACKBAR_MESSAGES = {
  ADMIN_ONLY: "Only admins can add projects.",
  SELECT_WORKSPACE: "Please select a workspace.",
  PROJECT_DELETED: "Project deleted. You can restore it.",
  PROJECT_RESTORED: "Project restored!"
};

export default function Projects() {
  const navigate = useNavigate();
  
  // Core state
  const [role, setRole] = useState(null);
  const [projects, setProjects] = useState([]);
  const [deletedProjects, setDeletedProjects] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [searchTerm, setSearchTerm] = useState("");
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: "", 
    severity: "success" 
  });

  // Theme management
  const [mode, setMode] = useState(
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );

  const theme = useMemo(
    () => createTheme({
      palette: {
        mode,
        ...(mode === "light"
          ? {
              background: { default: "#f3f4f6", paper: "#fff" },
            }
          : {
              background: { default: "#18181b", paper: "#23232a" },
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

  // Filtered projects based on search
  const filteredProjects = useMemo(() => {
    if (!searchTerm) return projects;
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(lowerSearchTerm) ||
        (project.client && project.client.toLowerCase().includes(lowerSearchTerm))
    );
  }, [searchTerm, projects]);

  // Display projects based on role
  const displayProjects = role === "admin" ? projects : filteredProjects;

  // Utility functions
  const showSnackbar = useCallback((message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const hideSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  const refreshProjects = useCallback(() => {
    window.dispatchEvent(new Event("projects-updated"));
  }, []);

  const getWorkspaceName = useCallback((workspaceId) => {
    return workspaces.find(ws => ws.id === workspaceId)?.name || "—";
  }, [workspaces]);

  // Status chip component
  const StatusChip = ({ status }) => {
    const statusConfig = PROJECT_STATUSES.find(s => s.value === status) || PROJECT_STATUSES[1];
    return (
      <Chip
        label={status}
        size="small"
        color={statusConfig.color}
        variant="filled"
        sx={{
          fontWeight: 600,
          fontSize: 12,
          minWidth: 80,
        }}
      />
    );
  };

  // Theme observer effect
  useEffect(() => {
    const getMode = () =>
      document.documentElement.classList.contains("dark") ? "dark" : "light";
    
    setMode(getMode());
    
    const observer = new MutationObserver(() => setMode(getMode()));
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ["class"] 
    });
    
    return () => observer.disconnect();
  }, []);

  // Authentication and role fetching
  useEffect(() => {
    async function fetchUserRole() {
      try {
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
      } catch (error) {
        console.error("Error fetching user role:", error);
        navigate("/login");
      }
    }
    
    fetchUserRole();
  }, [navigate]);

  // Data fetching effects
  useEffect(() => {
    async function fetchProjects() {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("projects").select("*");
        if (!error) {
          setProjects(data || []);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
    window.addEventListener("projects-updated", fetchProjects);
    return () => window.removeEventListener("projects-updated", fetchProjects);
  }, []);

  useEffect(() => {
    async function fetchWorkspaces() {
      try {
        const { data } = await supabase.from("workspaces").select("*");
        setWorkspaces(data || []);
      } catch (error) {
        console.error("Error fetching workspaces:", error);
      }
    }
    
    fetchWorkspaces();
  }, []);

  // Dialog handlers
  const handleOpenDialog = useCallback((project = null) => {
    setEditProject(project);
    setForm(
      project
        ? {
            name: project.name,
            client: project.client,
            status: project.status,
            workspace_id: project.workspace_id
          }
        : INITIAL_FORM_STATE
    );
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setEditProject(null);
    setForm(INITIAL_FORM_STATE);
  }, []);

  // Form handlers
  const handleFormChange = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) return;

    if (role !== "admin") {
      showSnackbar(SNACKBAR_MESSAGES.ADMIN_ONLY, "error");
      return;
    }

    if (!form.workspace_id) {
      showSnackbar(SNACKBAR_MESSAGES.SELECT_WORKSPACE, "error");
      return;
    }

    try {
      let error;
      const projectData = { ...form, workspace_id: form.workspace_id };

      if (editProject) {
        ({ error } = await supabase
          .from("projects")
          .update(projectData)
          .eq("id", editProject.id));
      } else {
        ({ error } = await supabase
          .from("projects")
          .insert([projectData]));
      }

      if (error) {
        showSnackbar(error.message, "error");
        return;
      }

      handleCloseDialog();
      refreshProjects();
    } catch (error) {
      showSnackbar("An unexpected error occurred", "error");
    }
  }, [form, role, editProject, showSnackbar, handleCloseDialog, refreshProjects]);

  // Project actions
  const handleDelete = useCallback(async (id) => {
    try {
      const projectToDelete = projects.find(p => p.id === id);
      if (!projectToDelete) return;

      setDeletedProjects(prev => [
        ...prev,
        { ...projectToDelete, deletedAt: new Date().toISOString() }
      ]);

      await supabase.from("projects").delete().eq("id", id);
      showSnackbar(SNACKBAR_MESSAGES.PROJECT_DELETED, "info");
      refreshProjects();
    } catch (error) {
      showSnackbar("Error deleting project", "error");
    }
  }, [projects, showSnackbar, refreshProjects]);

  const handleRestore = useCallback(async (deletedProject) => {
    try {
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

      setDeletedProjects(prev => prev.filter(p => p.id !== deletedProject.id));
      showSnackbar(SNACKBAR_MESSAGES.PROJECT_RESTORED);
      refreshProjects();
    } catch (error) {
      showSnackbar("Error restoring project", "error");
    }
  }, [showSnackbar, refreshProjects]);

  // Table row component
  const ProjectTableRow = ({ project, isAdmin }) => (
    <TableRow key={project.id} hover>
      <TableCell sx={{ fontWeight: 500 }}>{project.name}</TableCell>
      <TableCell>{project.client || "—"}</TableCell>
      <TableCell>
        <StatusChip status={project.status} />
      </TableCell>
      <TableCell>{getWorkspaceName(project.workspace_id)}</TableCell>
      {isAdmin && (
        <TableCell align="right">
          <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
            <Tooltip title="Edit" arrow>
              <IconButton
                size="small"
                onClick={() => handleOpenDialog(project)}
                color="primary"
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete" arrow>
              <IconButton
                size="small"
                onClick={() => handleDelete(project.id)}
                color="error"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </TableCell>
      )}
    </TableRow>
  );

  // Deleted project row component
  const DeletedProjectRow = ({ project }) => (
    <TableRow key={project.id} hover sx={{ opacity: 0.7 }}>
      <TableCell sx={{ fontWeight: 500 }}>{project.name}</TableCell>
      <TableCell>{project.client || "—"}</TableCell>
      <TableCell>
        <StatusChip status={project.status} />
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
  );

  // Main projects table
  const ProjectsTable = () => (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small" sx={{
        '& .MuiTableCell-root': {
          borderBottom: '1px solid',
          borderColor: 'divider'
        }
      }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Name</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Client</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Workspace</TableCell>
            {role === "admin" && (
              <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }} align="right">
                Actions
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {displayProjects.length === 0 ? (
            <TableRow>
              <TableCell 
                colSpan={role === "admin" ? 5 : 4} 
                align="center" 
                sx={{ 
                  color: "text.disabled",
                  py: 4,
                  fontStyle: 'italic'
                }}
              >
                {loading ? "Loading projects..." : "No projects found."}
              </TableCell>
            </TableRow>
          ) : (
            displayProjects.map((project) => (
              <ProjectTableRow 
                key={project.id} 
                project={project} 
                isAdmin={role === "admin"} 
              />
            ))
          )}
        </TableBody>
      </Table>
    </Box>
  );

  // Deleted projects table
  const DeletedProjectsTable = () => (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small" sx={{
        '& .MuiTableCell-root': {
          borderBottom: '1px solid',
          borderColor: 'divider'
        }
      }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Name</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Client</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.9rem' }} align="right">
              Restore
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {deletedProjects.map((project) => (
            <DeletedProjectRow key={project.id} project={project} />
          ))}
        </TableBody>
      </Table>
    </Box>
  );

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
          {/* Main Projects Table */}
          <GlassCard
            title="Projects"
            icon={<FaFolderOpen size={16} />}
            delay={0.1}
            sx={{ width: "100%", maxWidth: "100%" }}
          >
            <Box sx={{ p: 2.5 }}>
              {/* Header with search and add button */}
              <Box sx={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                mb: 2,
                gap: 2,
                flexWrap: { xs: 'wrap', sm: 'nowrap' }
              }}>
                {role !== "admin" && (
                  <TextField
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="small"
                    variant="outlined"
                    sx={{
                      bgcolor: "background.default",
                      borderRadius: 2,
                      minWidth: 200,
                      flexGrow: { xs: 1, sm: 0 },
                      "& .MuiInputBase-input": { fontSize: "0.97rem", py: 0.7 },
                    }}
                    InputProps={{
                      startAdornment: (
                        <SearchIcon 
                          sx={{ 
                            color: theme.palette.mode === "dark" ? "#fff" : "#222", 
                            mr: 1 
                          }} 
                        />
                      ),
                    }}
                  />
                )}
                
                {role === "admin" && (
                  <Box sx={{ ml: 'auto' }}>
                    <Button
                      variant="contained"
                      color="warning"
                      startIcon={<AddIcon />}
                      sx={{ 
                        borderRadius: 2, 
                        fontWeight: 600,
                        px: 3
                      }}
                      onClick={() => handleOpenDialog()}
                    >
                      Add Project
                    </Button>
                  </Box>
                )}
              </Box>

              <Divider sx={{ mb: 2, borderColor: 'divider' }} />
              <ProjectsTable />
            </Box>
          </GlassCard>

          {/* Deleted Projects Table */}
          {deletedProjects.length > 0 && (
            <GlassCard
              title={`Recently Deleted Projects (${deletedProjects.length})`}
              delay={0.2}
              sx={{ width: "100%", maxWidth: "100%" }}
            >
              <Box sx={{ p: 2.5 }}>
                <DeletedProjectsTable />
              </Box>
            </GlassCard>
          )}
        </Box>

        {/* Add/Edit Project Dialog */}
        <Dialog
          open={dialogOpen}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              p: 1,
              bgcolor: "background.paper",
              boxShadow: theme.shadows[10],
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
            }}
          >
            {editProject ? "Edit Project" : "Add New Project"}
          </DialogTitle>
          
          <DialogContent sx={{ pt: 3, pb: 2 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <TextField
                label="Project Name"
                value={form.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                fullWidth
                autoFocus
                required
                variant="outlined"
                inputProps={{ maxLength: 100 }}
                error={!form.name.trim() && form.name !== ""}
                helperText={!form.name.trim() && form.name !== "" ? "Project name is required" : ""}
              />
              
              <TextField
                label="Client"
                value={form.client}
                onChange={(e) => handleFormChange("client", e.target.value)}
                fullWidth
                variant="outlined"
                inputProps={{ maxLength: 100 }}
              />
              
              <TextField
                select
                label="Status"
                value={form.status}
                onChange={(e) => handleFormChange("status", e.target.value)}
                fullWidth
                variant="outlined"
              >
                {PROJECT_STATUSES.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </TextField>
              
              {role === "admin" && (
                <TextField
                  select
                  label="Workspace"
                  value={form.workspace_id || ""}
                  onChange={(e) => handleFormChange("workspace_id", e.target.value)}
                  fullWidth
                  required
                  variant="outlined"
                  error={!form.workspace_id}
                  helperText={!form.workspace_id ? "Please select a workspace" : ""}
                >
                  <MenuItem value="">
                    <em>Select workspace</em>
                  </MenuItem>
                  {workspaces.map((workspace) => (
                    <MenuItem key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Box>
          </DialogContent>
          
          <DialogActions sx={{ px: 3, pb: 2, pt: 1, gap: 1 }}>
            <Button 
              onClick={handleCloseDialog} 
              color="inherit" 
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              color="warning"
              disabled={!form.name.trim() || (role === "admin" && !form.workspace_id)}
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              {editProject ? "Update" : "Create"} Project
            </Button>
          </DialogActions>
        </Dialog>

        {/* Feedback Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={hideSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={hideSnackbar}
            severity={snackbar.severity}
            variant="filled"
            sx={{ 
              width: "100%",
              borderRadius: 2,
              fontWeight: 500
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}