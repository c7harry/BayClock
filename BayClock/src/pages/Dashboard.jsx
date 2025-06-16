import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { motion } from "framer-motion";
import { FaHome, FaClock, FaCalendar, FaChartBar, FaTrophy, FaEye } from "react-icons/fa";
import { Bar, Doughnut } from "react-chartjs-2";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import MilestonesAchievements from "../components/MilestonesAchievements";
import { 
  GlassCard, 
  ChartCard, 
  getTextColor, 
  getSecondaryTextColor, 
  getGridColor 
} from "../components/Theme";

ChartJS.register(BarElement, CategoryScale, LinearScale, ArcElement, ChartTooltip, Legend, ChartDataLabels);

// Animated stat card with glass morphism (smaller for overview card)
const StatCard = ({ title, value, icon, color, delay, isTime = false, compact = false, mode, ...props }) => (
  <Box sx={{ textAlign: "center", position: "relative", overflow: "hidden", p: compact ? 2 : 3 }}>
    {/* Animated background gradient */}
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      style={{
        position: "absolute",
        top: "-50%",
        left: "-50%",
        width: "200%",
        height: "200%",
        background: `conic-gradient(from 0deg, ${color}15, transparent, ${color}15)`,
        zIndex: -1,
      }}
    />
    
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: delay + 0.3, type: "spring", stiffness: 200 }}
    >
      {icon}
    </motion.div>
    
    <Typography variant={compact ? "subtitle2" : "subtitle1"} sx={{ mt: 1.5, fontWeight: 600, color, fontSize: compact ? "0.8rem" : "0.95rem" }}>
      {title}
    </Typography>
    
    <Typography variant={compact ? "h5" : "h4"} sx={{ mt: 0.5, fontWeight: 700, color, fontSize: compact ? "1.4rem" : "1.8rem" }}>
      {value}
    </Typography>
  </Box>
);

export default function Dashboard() {
  const navigate = useNavigate();

  // Route protection
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate("/login");
    });
  }, [navigate]);

  // Dark/Light mode with Tailwind
  const [mode, setMode] = useState(
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );

  useEffect(() => {
    const getMode = () =>
      document.documentElement.classList.contains("dark") ? "dark" : "light";
    setMode(getMode());

    const observer = new MutationObserver(() => {
      setMode(getMode());
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
                  paper: "rgba(255, 255, 255, 0.1)",
                },
              }
            : {
                background: {
                  default: "#18181b",
                  paper: "rgba(35, 35, 42, 0.1)",
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

  // Get entries from Supabase
  const [entries, setEntries] = useState([]);
  useEffect(() => {
    async function fetchEntries() {
      const { data, error } = await supabase
        .from("entries")
        .select("*, project:projects(name)")
      if (!error && data) {
        // Map project name onto each entry for chart logic
        setEntries(
          data.map(e => ({
            ...e,
            project: e.project?.name || "Unknown Project"
          }))
        );
      }
    }
    fetchEntries();
    window.addEventListener("entries-updated", fetchEntries);
    return () => window.removeEventListener("entries-updated", fetchEntries);
  }, []);

  // Utility: parse "1h 30m 10s" to seconds
  function durationToSeconds(str) {
    if (!str) return 0;
    let total = 0;
    const regex = /(\d+)h|(\d+)m|(\d+)s/g;
    let match;
    while ((match = regex.exec(str))) {
      if (match[1]) total += parseInt(match[1]) * 3600;
      if (match[2]) total += parseInt(match[2]) * 60;
      if (match[3]) total += parseInt(match[3]);
    }
    return total;
  }

  // Utility: seconds to "1h 23m"
  function secondsToShortDuration(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return [
      h ? `${h}h` : "",
      m ? `${m}m` : "",
    ]
      .filter(Boolean)
      .join(" ") || "0m";
  }

  // Calculate hours today and this week (matches TimeTracker logic)
  const today = formatLocalDate(new Date());
  const weekStart = (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  })();

  const hoursToday = entries
    .filter((e) => e.date === today)
    .reduce((sum, e) => sum + durationToSeconds(e.duration), 0);

  const hoursThisWeek = entries
    .filter((e) => e.date >= weekStart)
    .reduce((sum, e) => sum + durationToSeconds(e.duration), 0);

  // Animation variants
  const tileVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  // --- Chart Data Preparation ---

  // Helper to get YYYY-MM-DD in local time
  function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Calculate last 7 days' date strings
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return formatLocalDate(d);
  });

  // Calculate hours in the last 7 days (including today)
  const hoursLast7Days = entries
    .filter((e) => last7Days.includes(e.date))
    .reduce((sum, e) => sum + durationToSeconds(e.duration), 0);

  // Bar Chart: Hours per Day (last 7 days)
  function parseLocalDateString(str) {
    // str is "YYYY-MM-DD"
    const [year, month, day] = str.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const barLabels = last7Days.map((d) =>
  parseLocalDateString(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  );
  const barData = last7Days.map((date) =>
    entries
      .filter((e) => e.date === date)
      .reduce((sum, e) => sum + durationToSeconds(e.duration) / 3600, 0)
  );

  // Pie/Bar chart colors (use same for both)
  const pieColors = [
    "#fb923c", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#f87171", "#facc15"
  ];

  // Get all unique projects from entries in the last 7 days
  const projects = Array.from(
    new Set(
      entries
        .filter(e => last7Days.includes(e.date))
        .map(e => e.project)
        .filter(Boolean)
    )
  );

  // Assign a color for each project
  const projectColors = projects.map((_, i) => pieColors[i % pieColors.length]);

  // Build datasets for stacked bar chart (each project is a dataset)
  const barDatasets = projects.map((project, i) => ({
    label: project,
    data: last7Days.map(date =>
      entries
        .filter(e => e.date === date && e.project === project)
        .reduce((sum, e) => sum + durationToSeconds(e.duration) / 3600, 0)
    ),
    backgroundColor: projectColors[i],
    stack: "stack1",
    borderRadius: 4,
  }));

  const barChartData = {
    labels: barLabels,
    datasets: barDatasets,
  };

  // Pie Chart: Hours by Project (all time)
  const projectTotals = {};
  entries.forEach((e) => {
    if (!e.project) return;
    projectTotals[e.project] = (projectTotals[e.project] || 0) + durationToSeconds(e.duration) / 3600;
  });
  const pieLabels = Object.keys(projectTotals);
  const pieData = Object.values(projectTotals);

  const pieChartData = {
    labels: pieLabels,
    datasets: [
      {
        data: pieData,
        backgroundColor: pieColors.slice(0, pieLabels.length),
        borderWidth: 1,
      },
    ],
  };

  // Group entries by date
  const grouped = entries.reduce((acc, entry) => {
    acc[entry.date] = acc[entry.date] || [];
    acc[entry.date].push(entry);
    return acc;
  }, {});

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [showTop10, setShowTop10] = useState(true);

  // Calculate most tracked activities (by project)
  const totalHoursAll = Object.values(projectTotals).reduce((a, b) => a + b, 0);
  const mostTracked = Object.entries(projectTotals)
    .map(([project, hours]) => ({
      project,
      hours,
      percent: totalHoursAll > 0 ? (hours / totalHoursAll) * 100 : 0,
    }))
    .sort((a, b) => b.hours - a.hours);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          py: { xs: 1.5, md: 2 },
          px: { xs: 1, sm: 2, md: 3 },
          width: "100%",
          boxSizing: "border-box",
          overflowX: "auto",
        }}
      >
        <Box
          key={windowWidth}
          sx={{
            width: "100%",
            maxWidth: "100%",
            mx: "auto",
            display: "flex",
            flexDirection: "column",
            gap: { xs: 1.5, md: 2 },
            boxSizing: "border-box",
          }}
        >
          {/* Combined Overview Card */}
          <GlassCard 
            title="Overview" 
            icon={<FaEye size={16} />} 
            delay={0.1}
          >
            <Box sx={{ p: 2 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { 
                    xs: "1fr", 
                    sm: "1fr 1fr", 
                    md: "1fr 1fr 2fr",
                    lg: "200px 200px 1fr"
                  },
                  gap: 2,
                  alignItems: "start",
                }}
              >
                {/* Hours Today */}
                <StatCard
                  title="Hours Today"
                  value={(() => {
                    const h = Math.floor(hoursToday / 3600);
                    const m = Math.floor((hoursToday % 3600) / 60);
                    const s = Math.floor(hoursToday % 60);
                    if (h > 0 || m > 0) {
                      return `${h ? h + "h " : ""}${m ? m + "m " : ""}${s}s`.trim();
                    }
                    return `${s}s`;
                  })()}
                  icon={<FaClock size={20} color="#fb923c" />}
                  color="#fb923c"
                  delay={0.2}
                  compact={true}
                  mode={mode}
                />

                {/* Hours Last 7 Days */}
                <StatCard
                  title="Last 7 Days"
                  value={(() => {
                    const h = Math.floor(hoursLast7Days / 3600);
                    const m = Math.floor((hoursLast7Days % 3600) / 60);
                    const s = Math.floor(hoursLast7Days % 60);
                    if (h > 0 || m > 0) {
                      return `${h ? h + "h " : ""}${m ? m + "m " : ""}${s ? s + "s" : ""}`.trim();
                    }
                    return `${s}s`;
                  })()}
                  icon={<FaCalendar size={20} color="#60a5fa" />}
                  color="#60a5fa"
                  delay={0.3}
                  compact={true}
                  mode={mode}
                />

                {/* Most Tracked Activities */}
                <Box sx={{ p: 1 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        fontWeight: 700, 
                        color: "#fb923c",
                        fontFamily: "Montserrat, 'Segoe UI', Arial, sans-serif",
                        fontSize: "0.9rem"
                      }}
                    >
                      <FaChartBar style={{ marginRight: 6, verticalAlign: "middle" }} />
                      Most Tracked Activities
                    </Typography>
                    <Box>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowTop10(true)}
                        style={{
                          marginRight: 6,
                          padding: "3px 6px",
                          borderRadius: 6,
                          border: "none",
                          background: showTop10 
                            ? "linear-gradient(45deg, #fb923c, #fbbf24)" 
                            : "rgba(128, 128, 128, 0.2)",
                          color: mode === 'dark' ? "#fff" : "#000",
                          fontWeight: 600,
                          cursor: "pointer",
                          backdropFilter: "blur(10px)",
                          fontSize: "0.7rem"
                        }}
                      >
                        Top 5
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowTop10(false)}
                        style={{
                          padding: "3px 6px",
                          borderRadius: 6,
                          border: "none",
                          background: !showTop10 
                            ? "linear-gradient(45deg, #fb923c, #fbbf24)" 
                            : "rgba(128, 128, 128, 0.2)",
                          color: mode === 'dark' ? "#fff" : "#000",
                          fontWeight: 600,
                          cursor: "pointer",
                          backdropFilter: "blur(10px)",
                          fontSize: "0.7rem"
                        }}
                      >
                        All
                      </motion.button>
                    </Box>
                  </Box>
                  <Box sx={{ 
                    maxHeight: "160px", 
                    overflowY: "auto",
                    overflowX: "hidden",
                    width: "100%"
                  }}>
                    {mostTracked
                      .slice(0, showTop10 ? 5 : mostTracked.length)
                      .map((item, idx) => {
                        const totalSeconds = Math.round(item.hours * 3600);
                        const h = Math.floor(totalSeconds / 3600);
                        const m = Math.floor((totalSeconds % 3600) / 60);
                        const s = totalSeconds % 60;
                        const pad = (n) => n.toString().padStart(2, "0");
                        return (
                          <motion.div
                            key={item.project}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            whileHover={{ x: 3, backgroundColor: "rgba(251, 146, 60, 0.1)" }}
                          >
                            <Box sx={{ 
                              display: "flex", 
                              alignItems: "center", 
                              mb: 0.6, 
                              p: 0.3, 
                              borderRadius: 1,
                              width: "100%",
                              minWidth: 0
                            }}>
                              <motion.div
                                whileHover={{ scale: 1.2, rotate: 360 }}
                                transition={{ duration: 0.3 }}
                              >
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    background: `linear-gradient(45deg, ${pieColors[idx % pieColors.length]}, ${pieColors[idx % pieColors.length]}80)`,
                                    mr: 0.8,
                                    boxShadow: `0 0 4px ${pieColors[idx % pieColors.length]}40`,
                                    flexShrink: 0
                                  }}
                                />
                              </motion.div>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 600, 
                                  mr: 0.8, 
                                  color: getTextColor(mode), 
                                  fontSize: "0.7rem", 
                                  flex: 1,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  minWidth: 0
                                }}
                              >
                                {item.project}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  mr: 0.8, 
                                  color: getSecondaryTextColor(mode), 
                                  fontSize: "0.65rem",
                                  flexShrink: 0,
                                  whiteSpace: "nowrap"
                                }}
                              >
                                {`${pad(h)}:${pad(m)}:${pad(s)}`}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: "#fb923c", 
                                  fontWeight: 600, 
                                  fontSize: "0.65rem",
                                  flexShrink: 0,
                                  whiteSpace: "nowrap"
                                }}
                              >
                                ({item.percent.toFixed(1)}%)
                              </Typography>
                            </Box>
                          </motion.div>
                        );
                      })}
                    {mostTracked.length === 0 && (
                      <Typography variant="body2" sx={{ color: getSecondaryTextColor(mode), fontSize: "0.75rem" }}>
                        No activities tracked yet.
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>
          </GlassCard>

          {/* Charts */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
              gap: 2,
              width: "100%",
            }}
          >
            {/* Bar Chart */}
            <ChartCard 
              title="Hours Worked (Last 7 Days)" 
              icon={<FaChartBar size={16} />} 
              delay={0.4}
            >
              <Box sx={{ height: 250 }}>
                <Bar
                  data={barChartData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { 
                        display: false,
                        labels: {
                          color: getTextColor(mode)
                        }
                      },
                      tooltip: {
                        enabled: true,
                        mode: "index",
                        intersect: false,
                        backgroundColor: mode === 'dark' ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.9)",
                        titleColor: "#fb923c",
                        bodyColor: getTextColor(mode),
                        borderColor: "#fb923c",
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                          title: function(context) {
                            const idx = context[0].dataIndex;
                            const dateStr = last7Days[idx];
                            const date = parseLocalDateString(dateStr);
                            const values = context[0].chart.data.datasets.map(ds => ds.data[idx]);
                            const total = values.reduce((a, b) => a + b, 0);
                            const totalSeconds = Math.round(total * 3600);
                            const h = Math.floor(totalSeconds / 3600);
                            const m = Math.floor((totalSeconds % 3600) / 60);
                            const s = totalSeconds % 60;
                            const pad = (n) => n.toString().padStart(2, "0");
                            return `${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} — Total: ${pad(h)}:${pad(m)}:${pad(s)}`;
                          },
                          label: function(context) {
                            const value = context.raw || 0;
                            if (!value) return null;
                            const totalSeconds = Math.round(value * 3600);
                            const h = Math.floor(totalSeconds / 3600);
                            const m = Math.floor((totalSeconds % 3600) / 60);
                            const s = totalSeconds % 60;
                            const pad = (n) => n.toString().padStart(2, "0");
                            const idx = context.dataIndex;
                            const values = context.chart.data.datasets.map(ds => ds.data[idx]);
                            const total = values.reduce((a, b) => a + b, 0);
                            const percent = total > 0 ? (value / total) * 100 : 0;
                            return `${context.dataset.label}: ${pad(h)}:${pad(m)}:${pad(s)} (${percent.toFixed(1)}%)`;
                          },
                        }
                      },
                      datalabels: {
                        anchor: "end",
                        align: "top",
                        color: "#fb923c",
                        font: { weight: "bold", size: 10 },
                        formatter: (value, context) => {
                          const idx = context.dataIndex;
                          const datasets = context.chart.data.datasets;
                          let lastDatasetWithValue = -1;
                          for (let i = datasets.length - 1; i >= 0; i--) {
                            if (datasets[i].data[idx] > 0) {
                              lastDatasetWithValue = i;
                              break;
                            }
                          }
                          if (context.datasetIndex !== lastDatasetWithValue) return "";
                          const values = datasets.map(ds => ds.data[idx]);
                          const total = values.reduce((a, b) => a + b, 0);
                          if (!total) return "";
                          const totalSeconds = Math.round(total * 3600);
                          const h = Math.floor(totalSeconds / 3600);
                          const m = Math.floor((totalSeconds % 3600) / 60);
                          const s = totalSeconds % 60;
                          const pad = (n) => n.toString().padStart(2, "0");
                          return `${pad(h)}:${pad(m)}:${pad(s)}`;
                        },
                        display: true,
                      },
                    },
                    layout: {
                      padding: {
                        top: 24,
                        right: 8,
                      },
                    },
                    scales: {
                      x: { 
                        stacked: true,
                        ticks: {
                          color: getTextColor(mode),
                          font: { size: 10 }
                        },
                        grid: {
                          color: getGridColor(mode)
                        }
                      },
                      y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: { 
                          stepSize: 1,
                          color: getTextColor(mode),
                          font: { size: 10 }
                        },
                        title: { 
                          display: true, 
                          text: "Hours",
                          color: getTextColor(mode),
                          font: { size: 11 }
                        },
                        grid: {
                          color: getGridColor(mode)
                        }
                      },
                    },
                    maintainAspectRatio: false,
                  }}
                  plugins={[ChartDataLabels]}
                />
              </Box>
            </ChartCard>

            {/* Doughnut Chart */}
            <ChartCard 
              title="Hours by Project (Last 7 Days)" 
              icon={<FaChartBar size={16} />} 
              delay={0.5}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: { xs: "100%", md: 150 },
                    height: 150,
                    position: "relative",
                  }}
                >
                  <Doughnut
                    data={pieChartData}
                    options={{
                      responsive: true,
                      cutout: "70%",
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          enabled: true,
                          backgroundColor: mode === 'dark' ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.9)",
                          titleColor: "#fb923c",
                          bodyColor: getTextColor(mode),
                          borderColor: "#fb923c",
                          borderWidth: 1,
                          cornerRadius: 8,
                          callbacks: {
                            label: function(context) {
                              const value = context.raw || 0;
                              const total = context.dataset.data.reduce((a, b) => a + b, 0);
                              const percent = total > 0 ? (value / total) * 100 : 0;
                              const totalSeconds = Math.round(value * 3600);
                              const h = Math.floor(totalSeconds / 3600);
                              const m = Math.floor((totalSeconds % 3600) / 60);
                              const s = totalSeconds % 60;
                              const pad = (n) => n.toString().padStart(2, "0");
                              return [
                                `${context.label}`,
                                `${pad(h)}:${pad(m)}:${pad(s)}`,
                                `(${percent.toFixed(1)}%)`
                              ];
                            }
                          }
                        },
                        datalabels: { display: false },
                      },
                      maintainAspectRatio: false,
                    }}
                    plugins={[
                      {
                        id: "centerText",
                        afterDraw: (chart) => {
                          const { ctx, chartArea } = chart;
                          if (!chartArea) return;
                          ctx.save();
                          ctx.font = "bold 1rem Arial";
                          ctx.fillStyle = "#fb923c";
                          ctx.textAlign = "center";
                          ctx.textBaseline = "middle";
                          const totalSeconds = Math.round(hoursLast7Days);
                          const h = Math.floor(totalSeconds / 3600);
                          const m = Math.floor((totalSeconds % 3600) / 60);
                          const s = totalSeconds % 60;
                          const pad = (n) => n.toString().padStart(2, "0");
                          ctx.fillText(
                            `${pad(h)}:${pad(m)}:${pad(s)}`,
                            (chartArea.left + chartArea.right) / 2,
                            (chartArea.top + chartArea.bottom) / 2
                          );
                          ctx.restore();
                        },
                      },
                    ]}
                  />
                </Box>
                
                {/* Legend */}
                <Box sx={{ flex: 1, minWidth: 150 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, color: getSecondaryTextColor(mode), fontSize: "0.85rem" }}>
                    Project Breakdown
                  </Typography>
                  {projects.map((project, idx) => {
                    const hours = projectTotals[project] || 0;
                    const percent = pieData.reduce((a, b) => a + b, 0) > 0
                      ? (hours / pieData.reduce((a, b) => a + b, 0)) * 100
                      : 0;
                    const totalSeconds = Math.round(hours * 3600);
                    const h = Math.floor(totalSeconds / 3600);
                    const m = Math.floor((totalSeconds % 3600) / 60);
                    const s = totalSeconds % 60;
                    const pad = (n) => n.toString().padStart(2, "0");
                    return (
                      <motion.div
                        key={project}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        whileHover={{ x: 3 }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", mb: 0.8, p: 0.5, borderRadius: 1 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              background: `linear-gradient(45deg, ${pieColors[idx % pieColors.length]}, ${pieColors[idx % pieColors.length]}80)`,
                              mr: 1,
                              boxShadow: `0 0 6px ${pieColors[idx % pieColors.length]}40`,
                            }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 600, mr: 1, color: getTextColor(mode), fontSize: "0.75rem" }}>
                            {project}
                          </Typography>
                          <Typography variant="body2" sx={{ mr: 1, color: getSecondaryTextColor(mode), fontSize: "0.7rem" }}>
                            {`${pad(h)}:${pad(m)}:${pad(s)}`}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "#fb923c", fontWeight: 600, fontSize: "0.7rem" }}>
                            ({percent.toFixed(1)}%)
                          </Typography>
                        </Box>
                      </motion.div>
                    );
                  })}
                </Box>
              </Box>
            </ChartCard>
          </Box>

          {/* Achievements */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <MilestonesAchievements entries={entries} />
          </motion.div>
        </Box>
      </Box>
    </ThemeProvider>
  );
}