import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabaseClient";
import {
  Typography, Box, Button, Snackbar, Alert,
  Grid, Avatar, CircularProgress, ToggleButton, ToggleButtonGroup, Paper
} from "@mui/material";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { motion } from "framer-motion";
import { FaUsers, FaChartBar, FaClock, FaProjectDiagram, FaListAlt } from "react-icons/fa";
import { MdTrendingUp, MdBusiness } from "react-icons/md";
import { useNavigate } from "react-router-dom";
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

export default function AnalyticsDashboard() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [projects, setProjects] = useState([]);
  const [allEntries, setAllEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [statsPeriod, setStatsPeriod] = useState("weekly");

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

  // Calculate filtered stats based on period
  const filteredStatsData = useMemo(() => {
    const now = new Date();
    let startDate;

    switch (statsPeriod) {
      case "weekly":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0);
    }

    // Filter entries by period
    const periodEntries = allEntries.filter(entry => 
      new Date(entry.created_at) >= startDate
    );

    // Calculate total hours for the period
    const totalSeconds = periodEntries.reduce((sum, entry) => {
      return sum + parseDurationTextToSeconds(entry.duration);
    }, 0);

    // Get active users in this period
    const activeUserIds = new Set(periodEntries.map(entry => entry.user_id));

    // Get new users in this period
    const newUsers = profiles.filter(profile => 
      profile.created_at && new Date(profile.created_at) >= startDate
    );

    return {
      totalUsers: profiles.length,
      activeUsers: activeUserIds.size,
      totalWorkspaces: workspaces.length,
      totalProjects: projects.length,
      totalHours: Math.round(totalSeconds / 3600),
      newUsersThisPeriod: newUsers.length,
      totalEntries: periodEntries.length,
      period: statsPeriod
    };
  }, [allEntries, profiles, workspaces, projects, statsPeriod]);

  // Enhanced stats cards data with period filtering
  const statsCards = [
    {
      title: "Total Users",
      value: filteredStatsData.totalUsers,
      icon: <FaUsers size={20} />,
      color: "primary",
      change: `+${filteredStatsData.newUsersThisPeriod} this ${statsPeriod.slice(0, -2)}`
    },
    {
      title: "Active Users",
      value: filteredStatsData.activeUsers,
      icon: <MdTrendingUp size={20} />,
      color: "success",
      change: `Last ${statsPeriod.slice(0, -2)}`
    },
    {
      title: "Total Hours",
      value: `${filteredStatsData.totalHours}h`,
      icon: <FaClock size={20} />,
      color: "warning",
      change: `This ${statsPeriod.slice(0, -2)}`
    },
    {
      title: "Workspaces",
      value: filteredStatsData.totalWorkspaces,
      icon: <MdBusiness size={20} />,
      color: "info",
      change: "Total available"
    },
    {
      title: "Projects",
      value: filteredStatsData.totalProjects,
      icon: <FaProjectDiagram size={20} />,
      color: "secondary",
      change: "Active projects"
    },
    {
      title: "Entries",
      value: filteredStatsData.totalEntries.toLocaleString(),
      icon: <FaListAlt size={20} />,
      color: "error",
      change: `This ${statsPeriod.slice(0, -2)}`
    }
  ];

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
            {/* Analytics Dashboard Card */}
            <motion.div variants={itemVariants}>
              <GlassCard
                title="Analytics Dashboard"
                icon={<FaChartBar size={16} />}
                sx={{ width: "100%" }}
                whileHover={{}}
              >
                <Box sx={{ p: 3 }}>
                  {/* Period Filter */}
                  <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        Time Period:
                      </Typography>
                      <ToggleButtonGroup
                        value={statsPeriod}
                        exclusive
                        onChange={(_, newPeriod) => newPeriod && setStatsPeriod(newPeriod)}
                        size="small"
                        sx={{
                          '& .MuiToggleButton-root': {
                            borderRadius: 2,
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            px: 2,
                            py: 0.5,
                            border: 1,
                            borderColor: 'divider',
                            '&.Mui-selected': {
                              bgcolor: 'primary.main',
                              color: 'primary.contrastText',
                              '&:hover': {
                                bgcolor: 'primary.dark',
                              }
                            }
                          }
                        }}
                      >
                        <ToggleButton value="weekly">
                          Weekly
                        </ToggleButton>
                        <ToggleButton value="monthly">
                          Monthly
                        </ToggleButton>
                        <ToggleButton value="yearly">
                          Yearly
                        </ToggleButton>
                      </ToggleButtonGroup>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleRefresh}
                        disabled={refreshing}
                        sx={{ borderRadius: 2, fontWeight: 600 }} 
                      >
                        {refreshing ? <CircularProgress size={16} /> : "Refresh"}
                      </Button>
                    </Box>
                  </Box>

                  {/* Stats Grid */}
                  <Grid container spacing={2}>
                    {statsCards.map((card, index) => (
                      <Grid item xs={12} sm={6} md={4} lg={2} key={card.title}>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          transition={{ type: "spring", stiffness: 300 }}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <Paper
                            sx={{
                              p: 2.5,
                              borderRadius: 3,
                              height: "100%",
                              minHeight: 140,
                              background: `linear-gradient(135deg, ${theme.palette[card.color].main}15 0%, ${theme.palette[card.color].light}10 100%)`,
                              border: 1,
                              borderColor: `${card.color}.light`,
                              position: "relative",
                              overflow: "hidden",
                              "&::before": {
                                content: '""',
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                height: 4,
                                background: `linear-gradient(90deg, ${theme.palette[card.color].main} 0%, ${theme.palette[card.color].light} 100%)`,
                              }
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 2 }}>
                              <Avatar
                                sx={{
                                  bgcolor: `${card.color}.main`,
                                  width: 44,
                                  height: 44,
                                  boxShadow: `0 4px 12px ${theme.palette[card.color].main}30`,
                                }}
                              >
                                {card.icon}
                              </Avatar>
                              <Box sx={{ flexGrow: 1 }}>
                                <Typography 
                                  variant="h4" 
                                  sx={{ 
                                    fontWeight: 800, 
                                    color: `${card.color}.main`, 
                                    lineHeight: 1,
                                    fontSize: { xs: "1.75rem", sm: "2rem" }
                                  }}
                                >
                                  {card.value}
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontWeight: 700, 
                                    color: "text.primary",
                                    fontSize: { xs: "0.875rem", sm: "0.9rem" }
                                  }}
                                >
                                  {card.title}
                                </Typography>
                              </Box>
                            </Box>
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: "background.default",
                                border: 1,
                                borderColor: "divider",
                              }}
                            >
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: "text.secondary", 
                                  fontWeight: 600,
                                  fontSize: "0.75rem",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5
                                }}
                              >
                                {card.change}
                              </Typography>
                            </Box>
                          </Paper>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </GlassCard>
            </motion.div>
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
      </Box>
    </ThemeProvider>
  );
}