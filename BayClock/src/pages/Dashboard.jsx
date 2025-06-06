import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { motion } from "framer-motion";
import { FaHome } from "react-icons/fa";

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
          alignItems: "center",
          transition: "background-color 0.3s",
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 700, display: "flex", flexDirection: "column", gap: 4 }}>
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

          {/* Recent Entries */}
          <motion.div variants={tileVariants} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
            <Card elevation={4} sx={{ borderRadius: 5, bgcolor: "background.paper" }}>
              <CardContent>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  color="text.secondary"
                  mb={2}
                  sx={{ textAlign: "center" }}
                >
                  Recent Entries
                </Typography>
                {entries.length === 0 ? (
                  <Typography color="text.disabled" sx={{ textAlign: "center" }}>
                    No entries yet.
                  </Typography>
                ) : (
                  <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    {entries.slice(0, 5).map((entry) => (
                      <motion.li
                        key={entry.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card
                          elevation={2}
                          sx={{
                            borderRadius: 3,
                            bgcolor: "background.default",
                            display: "flex",
                            flexDirection: { xs: "column", sm: "row" },
                            alignItems: { sm: "center" },
                            justifyContent: "space-between",
                            gap: 2,
                            px: 2,
                            py: 1.5,
                          }}
                        >
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                              <Typography
                                variant="subtitle1"
                                fontWeight={600}
                                color="text.primary"
                                sx={{ flex: 1, minWidth: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}
                              >
                                {entry.description}
                              </Typography>
                              <Box
                                sx={{
                                  bgcolor: "warning.light",
                                  color: "warning.dark",
                                  borderRadius: 2,
                                  px: 1.5,
                                  py: 0.5,
                                  fontSize: 12,
                                  fontWeight: 500,
                                  ml: 1,
                                }}
                              >
                                {entry.project}
                              </Box>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              <span style={{ color: "#aaa" }}>Date:</span>{" "}
                              <span
                                style={{
                                  color:
                                    mode === "dark"
                                      ? "#fff"
                                      : "#444",
                                  fontFamily: "inherit",
                                }}
                              >
                                {entry.date}
                              </span>
                            </Typography>
                          </Box>
                          <Box sx={{ minWidth: 80, textAlign: "right" }}>
                            <Typography variant="h6" fontWeight={700} color="warning.main">
                              {entry.duration}
                            </Typography>
                            <Typography variant="caption" color="text.disabled">
                              Duration
                            </Typography>
                          </Box>
                        </Card>
                      </motion.li>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Box>
      </Box>
    </ThemeProvider>
  );
}