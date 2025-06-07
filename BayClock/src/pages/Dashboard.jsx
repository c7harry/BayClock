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

  // Bar Chart: Hours per Day (last 7 days)
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  const barLabels = last7Days.map((d) =>
    new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  );
  const barData = last7Days.map((date) =>
    entries
      .filter((e) => e.date === date)
      .reduce((sum, e) => sum + durationToSeconds(e.duration) / 3600, 0)
  );

  const barChartData = {
    labels: barLabels,
    datasets: [
      {
        label: "Hours Worked",
        data: barData,
        backgroundColor: "#fb923c",
        borderRadius: 8,
      },
    ],
  };

  // Pie Chart: Hours by Project (all time)
  const projectTotals = {};
  entries.forEach((e) => {
    if (!e.project) return;
    projectTotals[e.project] = (projectTotals[e.project] || 0) + durationToSeconds(e.duration) / 3600;
  });
  const pieLabels = Object.keys(projectTotals);
  const pieData = Object.values(projectTotals);

  const pieColors = [
    "#fb923c", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#f87171", "#facc15"
  ];

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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "80vh",
          bgcolor: "background.default",
          py: 6,
          px: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          transition: "background-color 0.3s",
          width: "100vw",
          overflowX: "auto",
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: { xs: 700, md: 1500 },
            display: "flex",
            flexDirection: "column",
            gap: 2,
            ml: 7,
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

          {/* Stats */}
          <motion.div variants={tileVariants} initial="hidden" animate="visible" transition={{ delay: 0.1 }}>
            <Box sx={{ display: "flex", gap: 3, flexDirection: { xs: "column", sm: "row" } }}>
              <Card elevation={4} sx={{ flex: 1, borderRadius: 5, bgcolor: "background.paper" }}>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="subtitle2" color="text.secondary" mb={1}>
                    Hours Today
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="warning.main">
                    {secondsToShortDuration(hoursToday)}
                  </Typography>
                </CardContent>
              </Card>
              <Card elevation={4} sx={{ flex: 1, borderRadius: 5, bgcolor: "background.paper" }}>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="subtitle2" color="text.secondary" mb={1}>
                    Hours This Week
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="warning.main">
                    {secondsToShortDuration(hoursThisWeek)}
                  </Typography>
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
                          tooltip: { enabled: true },
                          datalabels: {
                            anchor: "end",
                            align: "end",
                            color: "#fb923c",
                            font: { weight: "bold", size: 14 },
                            formatter: (value) => {
                              const totalSeconds = Math.round(value * 3600);
                              const h = Math.floor(totalSeconds / 3600);
                              const m = Math.floor((totalSeconds % 3600) / 60);
                              const s = totalSeconds % 60;
                              const pad = (n) => n.toString().padStart(2, "0");
                              return `${pad(h)}:${pad(m)}:${pad(s)}`;
                            },
                            display: true,
                          },
                        },
                        scales: {
                          y: {
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
                          tooltip: { enabled: true },
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
                  {pieLabels.map((project, idx) => {
                    const hours = pieData[idx];
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