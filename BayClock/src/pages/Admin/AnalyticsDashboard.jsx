import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../supabaseClient";
import {
  Typography, Box, Button, Snackbar, Alert,
  Grid, Avatar, CircularProgress, ToggleButton, ToggleButtonGroup, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Card, CardContent, CardHeader, Divider, LinearProgress,
  List, ListItem, ListItemText, ListItemAvatar, Badge
} from "@mui/material";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { motion } from "framer-motion";
import { FaUsers, FaChartBar, FaClock, FaProjectDiagram, FaListAlt, FaCalendarAlt, FaTrophy } from "react-icons/fa";
import { MdTrendingUp, MdBusiness, MdAccessTime, MdPersonAdd, MdWork, MdAnalytics } from "react-icons/md";
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

// Helper to format seconds to readable duration
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
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

  // NEW: Calculate advanced analytics
  const advancedAnalytics = useMemo(() => {
    // User activity analysis
    const userActivity = profiles.map(profile => {
      const userEntries = allEntries.filter(entry => entry.user_id === profile.id);
      const totalSeconds = userEntries.reduce((sum, entry) => 
        sum + parseDurationTextToSeconds(entry.duration), 0);
      const workspace = workspaces.find(w => w.id === profile.workspace_id);
      
      return {
        id: profile.id,
        name: profile.full_name || 'Unknown User',
        email: profile.email,
        workspace: workspace?.name || 'No Workspace',
        totalHours: totalSeconds / 3600,
        entryCount: userEntries.length,
        avgSessionMinutes: userEntries.length > 0 ? (totalSeconds / userEntries.length) / 60 : 0,
        lastActivity: userEntries.length > 0 ? 
          Math.max(...userEntries.map(e => new Date(e.created_at).getTime())) : 0
      };
    }).sort((a, b) => b.totalHours - a.totalHours);

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentEntries = allEntries.filter(entry => 
      new Date(entry.created_at) >= sevenDaysAgo
    );

    // Daily activity trend
    const dailyActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayEntries = recentEntries.filter(entry => {
        const entryDate = new Date(entry.created_at);
        return entryDate.toDateString() === date.toDateString();
      });
      
      const daySeconds = dayEntries.reduce((sum, entry) => 
        sum + parseDurationTextToSeconds(entry.duration), 0);
      
      dailyActivity.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        hours: daySeconds / 3600,
        entries: dayEntries.length,
        users: new Set(dayEntries.map(e => e.user_id)).size
      });
    }

    // Workspace distribution
    const workspaceStats = workspaces.map(workspace => {
      const workspaceUsers = profiles.filter(p => p.workspace_id === workspace.id);
      const workspaceEntries = allEntries.filter(entry => 
        workspaceUsers.some(user => user.id === entry.user_id)
      );
      const totalSeconds = workspaceEntries.reduce((sum, entry) => 
        sum + parseDurationTextToSeconds(entry.duration), 0);
      
      return {
        name: workspace.name,
        userCount: workspaceUsers.length,
        totalHours: totalSeconds / 3600,
        avgHoursPerUser: workspaceUsers.length > 0 ? (totalSeconds / 3600) / workspaceUsers.length : 0
      };
    }).sort((a, b) => b.totalHours - a.totalHours);

    return {
      topUsers: userActivity.slice(0, 10),
      dailyActivity,
      workspaceStats,
      avgDailyUsers: dailyActivity.reduce((sum, day) => sum + day.users, 0) / dailyActivity.length,
      peakDay: dailyActivity.reduce((peak, day) => day.hours > peak.hours ? day : peak, dailyActivity[0] || { hours: 0 })
    };
  }, [allEntries, profiles, workspaces]);

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

            {/* NEW: Activity Trends */}
            <motion.div variants={itemVariants}>
              <GlassCard
                title="Activity Trends (Last 7 Days)"
                icon={<MdAnalytics size={16} />}
                sx={{ width: "100%" }}
              >
                <Box sx={{ p: 3 }}>
                  <Grid container spacing={3}>
                    {advancedAnalytics.dailyActivity.map((day, index) => (
                      <Grid item xs={12} sm={6} md key={day.date}>
                        <Card sx={{ 
                          borderRadius: 3, 
                          border: 1, 
                          borderColor: 'divider',
                          background: day.hours > 0 ? 'linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(251, 146, 60, 0.05) 100%)' : 'background.paper'
                        }}>
                          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                              <FaCalendarAlt size={14} color={theme.palette.primary.main} />
                              <Typography variant="body2" fontWeight={600}>
                                {day.date}
                              </Typography>
                            </Box>
                            <Typography variant="h5" fontWeight={800} color="primary.main" sx={{ mb: 1 }}>
                              {day.hours.toFixed(1)}h
                            </Typography>
                            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                              <Chip 
                                label={`${day.entries} entries`} 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                              />
                              <Chip 
                                label={`${day.users} users`} 
                                size="small" 
                                color="secondary" 
                                variant="outlined"
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                  
                  {/* Activity Insights */}
                  <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <MdTrendingUp color={theme.palette.success.main} />
                          <Typography variant="body2" fontWeight={600}>
                            Peak Day: {advancedAnalytics.peakDay?.date} ({advancedAnalytics.peakDay?.hours.toFixed(1)}h)
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <FaUsers color={theme.palette.info.main} />
                          <Typography variant="body2" fontWeight={600}>
                            Avg Daily Users: {advancedAnalytics.avgDailyUsers.toFixed(1)}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Box>
              </GlassCard>
            </motion.div>

            {/* NEW: Top Performers & Workspace Analytics */}
            <Grid container spacing={3}>
              {/* Top Users */}
              <Grid item xs={12} lg={6}>
                <motion.div variants={itemVariants}>
                  <GlassCard
                    title="Top Performers"
                    icon={<FaTrophy size={16} />}
                    sx={{ height: "100%" }}
                  >
                    <Box sx={{ p: 3 }}>
                      <List sx={{ p: 0 }}>
                        {advancedAnalytics.topUsers.slice(0, 8).map((user, index) => (
                          <ListItem 
                            key={user.id} 
                            sx={{ 
                              px: 0, 
                              py: 1.5,
                              borderBottom: index < 7 ? 1 : 0,
                              borderColor: 'divider'
                            }}
                          >
                            <ListItemAvatar>
                              <Badge
                                badgeContent={index + 1}
                                color={index < 3 ? "primary" : "default"}
                                sx={{
                                  '& .MuiBadge-badge': {
                                    fontSize: '0.75rem',
                                    fontWeight: 800
                                  }
                                }}
                              >
                                <Avatar 
                                  sx={{ 
                                    bgcolor: index < 3 ? 'primary.main' : 'grey.400',
                                    width: 40,
                                    height: 40
                                  }}
                                >
                                  {user.name.charAt(0).toUpperCase()}
                                </Avatar>
                              </Badge>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <Typography variant="body1" fontWeight={600}>
                                    {user.name}
                                  </Typography>
                                  <Typography variant="h6" fontWeight={800} color="primary.main">
                                    {user.totalHours.toFixed(1)}h
                                  </Typography>
                                </Box>
                              }
                              secondary={
                                <Box sx={{ mt: 0.5 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    {user.workspace} • {user.entryCount} entries • Avg: {user.avgSessionMinutes.toFixed(0)}min/session
                                  </Typography>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={Math.min((user.totalHours / Math.max(...advancedAnalytics.topUsers.map(u => u.totalHours))) * 100, 100)}
                                    sx={{ 
                                      mt: 1, 
                                      height: 6, 
                                      borderRadius: 3,
                                      bgcolor: 'action.hover',
                                      '& .MuiLinearProgress-bar': {
                                        borderRadius: 3
                                      }
                                    }}
                                  />
                                </Box>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  </GlassCard>
                </motion.div>
              </Grid>

              {/* Workspace Analytics */}
              <Grid item xs={12} lg={6}>
                <motion.div variants={itemVariants}>
                  <GlassCard
                    title="Workspace Performance"
                    icon={<MdWork size={16} />}
                    sx={{ height: "100%" }}
                  >
                    <Box sx={{ p: 3 }}>
                      {advancedAnalytics.workspaceStats.length > 0 ? (
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 600 }}>Workspace</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600 }}>Users</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600 }}>Total Hours</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600 }}>Avg/User</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {advancedAnalytics.workspaceStats.map((workspace, index) => (
                                <TableRow 
                                  key={workspace.name}
                                  sx={{ 
                                    '&:hover': { bgcolor: 'action.hover' },
                                    bgcolor: index % 2 === 0 ? 'action.selected' : 'transparent'
                                  }}
                                >
                                  <TableCell>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: 'primary.main' }}>
                                        {workspace.name.charAt(0)}
                                      </Avatar>
                                      <Typography variant="body2" fontWeight={600}>
                                        {workspace.name}
                                      </Typography>
                                    </Box>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Chip 
                                      label={workspace.userCount} 
                                      size="small" 
                                      color="primary" 
                                      variant="outlined"
                                    />
                                  </TableCell>
                                  <TableCell align="center">
                                    <Typography variant="body2" fontWeight={600} color="warning.main">
                                      {workspace.totalHours.toFixed(1)}h
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Typography variant="body2" color="text.secondary">
                                      {workspace.avgHoursPerUser.toFixed(1)}h
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Box sx={{ textAlign: "center", py: 4 }}>
                          <MdBusiness size={48} color={theme.palette.text.disabled} />
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                            No workspace data available
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </GlassCard>
                </motion.div>
              </Grid>
            </Grid>

            {/* NEW: Quick Insights */}
            <motion.div variants={itemVariants}>
              <GlassCard
                title="Quick Insights"
                icon={<MdAnalytics size={16} />}
                sx={{ width: "100%" }}
              >
                <Box sx={{ p: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                          <MdAccessTime />
                          <Typography variant="body2" fontWeight={600}>
                            Most Active User
                          </Typography>
                        </Box>
                        <Typography variant="h6" fontWeight={800}>
                          {advancedAnalytics.topUsers[0]?.name || 'N/A'}
                        </Typography>
                        <Typography variant="caption">
                          {advancedAnalytics.topUsers[0]?.totalHours.toFixed(1)}h total
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                          <MdPersonAdd />
                          <Typography variant="body2" fontWeight={600}>
                            Growth Rate
                          </Typography>
                        </Box>
                        <Typography variant="h6" fontWeight={800}>
                          {filteredStatsData.newUsersThisPeriod > 0 ? '+' : ''}{filteredStatsData.newUsersThisPeriod}
                        </Typography>
                        <Typography variant="caption">
                          New users this {statsPeriod.slice(0, -2)}
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                          <FaClock />
                          <Typography variant="body2" fontWeight={600}>
                            Avg Session
                          </Typography>
                        </Box>
                        <Typography variant="h6" fontWeight={800}>
                          {advancedAnalytics.topUsers.length > 0 ? 
                            Math.round(advancedAnalytics.topUsers.reduce((sum, user) => sum + user.avgSessionMinutes, 0) / advancedAnalytics.topUsers.length) 
                            : 0}min
                        </Typography>
                        <Typography variant="caption">
                          Average per session
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                      <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'secondary.light', color: 'secondary.contrastText' }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                          <MdBusiness />
                          <Typography variant="body2" fontWeight={600}>
                            Top Workspace
                          </Typography>
                        </Box>
                        <Typography variant="h6" fontWeight={800}>
                          {advancedAnalytics.workspaceStats[0]?.name || 'N/A'}
                        </Typography>
                        <Typography variant="caption">
                          {advancedAnalytics.workspaceStats[0]?.totalHours.toFixed(1) || '0'}h total
                        </Typography>
                      </Paper>
                    </Grid>
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