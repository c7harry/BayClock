import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { motion } from "framer-motion";
import { FaHome } from "react-icons/fa";
import { Bar, Pie, Doughnut } from "react-chartjs-2";
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

ChartJS.register(BarElement, CategoryScale, LinearScale, ArcElement, ChartTooltip, Legend, ChartDataLabels);

export default function Dashboard() {
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

  // Get entries from localStorage (same as TimeTracker)
  const [entries, setEntries] = useState([]);
  useEffect(() => {
    const saved = localStorage.getItem("entries");
    setEntries(saved ? JSON.parse(saved) : []);
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
  const today = new Date().toISOString().slice(0, 10);
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

  // Bar Chart: Hours per Day (last 7 days)
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return formatLocalDate(d); // Use local date string
  });
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
    borderRadius: 8,
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
          bgcolor: "background.default",
          py: { xs: 2, md: 4 },
          px: { xs: 0, sm: 1, md: 2 },
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
            gap: { xs: 2, md: 3 },
            px: { xs: 0.5, sm: 2, md: 4 },
            boxSizing: "border-box",
          }}
        >
          {/* Header */}
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
                <FaHome size={32} color="#fb923c" />
                <Typography
                  variant="h4"
                  fontWeight={700}
                  color="text.primary"
                  sx={{ textAlign: "center" }}
                >
                  Dashboard
                </Typography>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats and Most Tracked Activities */}
          <motion.div variants={tileVariants} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
            <Box
              sx={{
                display: "flex",
                gap: 3,
                flexDirection: { xs: "column", md: "row" },
                width: "100%",
                overflowX: "auto", // <-- Add this line
              }}
            >
              {/* Hours Today */}
              <Card elevation={4} sx={{ flex: 1, borderRadius: 5, bgcolor: "background.paper", minWidth: { xs: 220, md: 0 }, maxWidth: "100%" }}>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="subtitle2" color="text.secondary" mb={1}>
                    Hours Today
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="warning.main">
                    {secondsToShortDuration(hoursToday)}
                  </Typography>
                </CardContent>
              </Card>
              {/* Hours This Week */}
              <Card elevation={4} sx={{ flex: 1, borderRadius: 5, bgcolor: "background.paper", minWidth: 220 }}>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="subtitle2" color="text.secondary" mb={1}>
                    Hours This Week
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="warning.main">
                    {secondsToShortDuration(hoursThisWeek)}
                  </Typography>
                </CardContent>
              </Card>
              {/* Most Tracked Activities */}
              <Card elevation={4} sx={{ flex: 2, borderRadius: 5, bgcolor: "background.paper", minWidth: 320 }}>
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Typography variant="h6" fontWeight={700} color="text.secondary">
                      Most Tracked Activities
                    </Typography>
                    <Box>
                      <button
                        onClick={() => setShowTop10(true)}
                        style={{
                          marginRight: 8,
                          padding: "4px 12px",
                          borderRadius: 6,
                          border: "none",
                          background: showTop10 ? "#fb923c" : "#e5e7eb",
                          color: showTop10 ? "#fff" : "#18181b",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        Top 10
                      </button>
                      <button
                        onClick={() => setShowTop10(false)}
                        style={{
                          padding: "4px 12px",
                          borderRadius: 6,
                          border: "none",
                          background: !showTop10 ? "#fb923c" : "#e5e7eb",
                          color: !showTop10 ? "#fff" : "#18181b",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        All
                      </button>
                    </Box>
                  </Box>
                  <Box>
                    {mostTracked
                      .slice(0, showTop10 ? 10 : mostTracked.length)
                      .map((item, idx) => {
                        const totalSeconds = Math.round(item.hours * 3600);
                        const h = Math.floor(totalSeconds / 3600);
                        const m = Math.floor((totalSeconds % 3600) / 60);
                        const s = totalSeconds % 60;
                        const pad = (n) => n.toString().padStart(2, "0");
                        return (
                          <Box key={item.project} sx={{ display: "flex", alignItems: "center", mb: 1.2 }}>
                            <Box
                              sx={{
                                width: 14,
                                height: 14,
                                borderRadius: "50%",
                                bgcolor: pieColors[idx % pieColors.length],
                                mr: 1.2,
                                border: "1.5px solid #e5e7eb",
                              }}
                            />
                            <Typography variant="body2" sx={{ fontWeight: 600, mr: 1 }}>
                              {item.project}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                              {`${pad(h)}:${pad(m)}:${pad(s)}`}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              ({item.percent.toFixed(1)}%)
                            </Typography>
                          </Box>
                        );
                      })}
                    {mostTracked.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No activities tracked yet.
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </motion.div>

          {/* Charts */}
          <motion.div variants={tileVariants} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                gap: 4,
                justifyContent: "center",
                alignItems: "stretch",
                width: "100%",
                flexWrap: { xs: "nowrap", md: "wrap" }, 
                overflowX: { xs: "auto", md: "visible" },
              }}
            >
              <Card
                elevation={4}
                sx={{
                  flex: 1,
                  borderRadius: 5,
                  bgcolor: "background.paper",
                  minWidth: 0,
                  minWidth: { xs: 320, md: 400 }, 
                  maxWidth: { xs: "100%", md: "50%" }, 
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <CardContent>
                  <Typography variant="h6" fontWeight={700} color="text.secondary" mb={2} sx={{ textAlign: "center" }}>
                    Hours Worked (Last 7 Days)
                  </Typography>
                  <Box sx={{ height: 260 }}>
                    <Bar
                      data={barChartData}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            enabled: true,
                            mode: "index",
                            intersect: false,
                            callbacks: {
                              title: function(context) {
                                const idx = context[0].dataIndex;
                                const dateStr = last7Days[idx];
                                const date = parseLocalDateString(dateStr);
                                // Calculate total for this day
                                const values = context[0].chart.data.datasets.map(ds => ds.data[idx]);
                                const total = values.reduce((a, b) => a + b, 0);
                                const totalSeconds = Math.round(total * 3600);
                                const h = Math.floor(totalSeconds / 3600);
                                const m = Math.floor((totalSeconds % 3600) / 60);
                                const s = totalSeconds % 60;
                                const pad = (n) => n.toString().padStart(2, "0");
                                // Show date and total on the same row
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
                              afterBody: function() {
                                return [];
                              }
                            }
                          },
                          datalabels: {
                            anchor: "end",
                            align: "top",
                            color: "#fb923c",
                            font: { weight: "bold", size: 14 },
                            formatter: (value, context) => {
                              // Only show the total for the day at the top of the bar (once per bar)
                              const idx = context.dataIndex;
                              const datasets = context.chart.data.datasets;
                              // Find the last dataset index with a value for this bar
                              let lastDatasetWithValue = -1;
                              for (let i = datasets.length - 1; i >= 0; i--) {
                                if (datasets[i].data[idx] > 0) {
                                  lastDatasetWithValue = i;
                                  break;
                                }
                              }
                              // Only show label on the top segment
                              if (context.datasetIndex !== lastDatasetWithValue) return "";
                              // Sum all project values for this day
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
                            clamp: true,
                            clip: false,
                            offset: 8,
                          },
                        },
                        layout: {
                          padding: {
                            top: 32,
                          },
                        },
                        scales: {
                          x: { stacked: true },
                          y: {
                            stacked: true,
                            beginAtZero: true,
                            ticks: { stepSize: 1 },
                            title: { display: true, text: "Hours" },
                          },
                        },
                        maintainAspectRatio: false,
                      }}
                      plugins={[ChartDataLabels]}
                    />
                  </Box>
                </CardContent>
              </Card>
              <Card
                elevation={4}
                sx={{
                  flex: 1,
                  borderRadius: 5,
                  bgcolor: "background.paper",
                  minWidth: 0,
                  minWidth: { xs: 320, md: 400 },
                  maxWidth: { xs: "100%", md: "50%" },
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  alignItems: "stretch",
                }}
              >
                <CardContent sx={{ flex: 2, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <Typography variant="h6" fontWeight={700} color="text.secondary" mb={2} sx={{ textAlign: "center" }}>
                    Hours by Project
                  </Typography>
                  <Box sx={{ height: 260, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Doughnut
                      data={pieChartData}
                      options={{
                        responsive: true,
                        cutout: "70%",
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            enabled: true,
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
                          centerText: {
                            display: true,
                            text: (() => {
                              const totalSeconds = Math.round(hoursThisWeek);
                              const h = Math.floor(totalSeconds / 3600);
                              const m = Math.floor((totalSeconds % 3600) / 60);
                              const s = totalSeconds % 60;
                              const pad = (n) => n.toString().padStart(2, "0");
                              return `${pad(h)}:${pad(m)}:${pad(s)}`;
                            })(),
                          },
                        },
                        maintainAspectRatio: false,
                      }}
                      plugins={[
                        {
                          id: "centerText",
                          afterDraw: (chart) => {
                            const { ctx, chartArea } = chart;
                            if (!chartArea) return;
                            const centerConfig = chart.options.plugins.centerText;
                            if (centerConfig && centerConfig.display) {
                              ctx.save();
                              ctx.font = "bold 1.6rem Arial";
                              ctx.fillStyle = "#fb923c";
                              ctx.textAlign = "center";
                              ctx.textBaseline = "middle";
                              ctx.fillText(
                                centerConfig.text,
                                (chartArea.left + chartArea.right) / 2,
                                (chartArea.top + chartArea.bottom) / 2
                              );
                              ctx.restore();
                            }
                          },
                        },
                      ]}
                    />
                  </Box>
                </CardContent>
                {/* Custom Legend */}
                <Box
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: { xs: "center", md: "flex-start" },
                    pl: { xs: 0, md: 2 },
                    pr: 2,
                    minWidth: 180,
                    maxWidth: { xs: "100%", md: 220 }, 
                    mt: { xs: 2, md: 0 },
                    overflowX: "auto",
                  }}
                >
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textAlign: { xs: "center", md: "left" } }}>
                    Project Breakdown
                  </Typography>
                  {projects.map((project, idx) => {
                    // Use the same color and total as in the pie chart
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
                      <Box key={project} sx={{ display: "flex", alignItems: "center", mb: 1.5, flexWrap: "wrap" }}>
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            bgcolor: pieColors[idx % pieColors.length],
                            mr: 1.2,
                            border: "1.5px solid #e5e7eb",
                          }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 600, mr: 1 }}>
                          {project}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                          {`${pad(h)}:${pad(m)}:${pad(s)}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ({percent.toFixed(1)}%)
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Card>
            </Box>
          </motion.div>
        </Box>
      </Box>
    </ThemeProvider>
  );
}