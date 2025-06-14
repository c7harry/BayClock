import { Box, Card, CardContent, Typography, useTheme, Fade } from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { useMemo } from "react";
import { CircularProgressbarWithChildren, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

// Define levels for each achievement
const HOURS_LEVELS = [1, 5, 10, 25, 50, 100, 200, 400, 800, 1000]; // in hours
const STREAK_LEVELS = [1, 2, 3, 5, 7, 10, 14, 21, 30, 60]; // in days

const ACHIEVEMENTS = [
  {
    key: "hours_logged",
    label: "Hours Logged",
    description: (level) => `Log a total of ${HOURS_LEVELS[level]} hours.`,
    icon: (theme) => <EmojiEventsIcon sx={{ color: theme.palette.warning.main, fontSize: 40 }} />,
    levels: HOURS_LEVELS,
    getCurrent: (stats) => stats.totalHours,
    unit: "hours",
    color: (theme) => theme.palette.warning.main,
    bg: (theme) => theme.palette.mode === "dark" ? "#3b3b1f" : "#fff7ed",
  },
  {
    key: "streak",
    label: "Days in a Row",
    description: (level) => `Log time ${STREAK_LEVELS[level]} days in a row.`,
    icon: (theme) => <TrendingUpIcon sx={{ color: theme.palette.success.main, fontSize: 40 }} />,
    levels: STREAK_LEVELS,
    getCurrent: (stats) => stats.longestStreak,
    unit: "days",
    color: (theme) => theme.palette.success.main,
    bg: (theme) => theme.palette.mode === "dark" ? "#1e293b" : "#e0f2fe",
  },
];

// Helper to calculate stats from entries
function getStats(entries) {
  // Total hours
  const totalHours = entries.reduce((sum, e) => sum + (e.durationSeconds || 0) / 3600, 0);

  // Calculate streaks
  const dates = Array.from(new Set(entries.map(e => e.date))).sort();
  let longestStreak = 0, streak = 0, prevDate = null;
  for (let i = 0; i < dates.length; i++) {
    const date = new Date(dates[i]);
    if (
      prevDate &&
      (date - prevDate) / (1000 * 60 * 60 * 24) === 1
    ) {
      streak += 1;
    } else {
      streak = 1;
    }
    if (streak > longestStreak) longestStreak = streak;
    prevDate = date;
  }

  return { totalHours, longestStreak };
}

export default function MilestonesAchievements({ entries }) {
  const theme = useTheme();

  // Precompute seconds for each entry if not already present
  const entriesWithSeconds = useMemo(
    () =>
      entries.map(e => ({
        ...e,
        durationSeconds: e.durationSeconds ?? durationToSeconds(e.duration),
      })),
    [entries]
  );

  const stats = getStats(entriesWithSeconds);

  return (
    <Card
      elevation={8}
      sx={{
        borderRadius: 5,
        bgcolor: theme.palette.mode === "dark"
          ? "linear-gradient(135deg, #23232a 60%, #18181b 100%)"
          : "linear-gradient(135deg, #fff7ed 60%, #f3f4f6 100%)",
        mt: 2,
        boxShadow: theme.palette.mode === "dark"
          ? "0 4px 32px 0 rgba(0,0,0,0.45)"
          : "0 4px 32px 0 rgba(251,146,60,0.10)",
        border: theme.palette.mode === "dark"
          ? "1.5px solid #23232a"
          : "1.5px solid #ffe6d3",
        transition: "background-color 0.3s",
        px: { xs: 1, sm: 2 },
        py: 2,
      }}
    >
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mb: 1 }}>
          <Typography
            variant="h5"
            fontWeight={900}
            color={theme.palette.mode === "dark" ? "warning.light" : "warning.dark"}
            sx={{
              letterSpacing: 2,
              textShadow: theme.palette.mode === "dark"
                ? "0 1px 8px #18181b"
                : "0 1px 8px #ffe6d3",
              fontFamily: "Montserrat, 'Segoe UI', Arial, sans-serif",
              textAlign: "center",
            }}
          >
            Achievement Showcase
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: "stretch",
            justifyContent: "center",
            gap: 2,
            width: "100%",
          }}
        >
          {ACHIEVEMENTS.map((ach, idx) => {
            const current = ach.getCurrent(stats);
            // Find the highest level achieved
            let level = ach.levels.findIndex(req => current < req);
            if (level === -1) level = ach.levels.length; // All levels achieved
            const achieved = level === ach.levels.length;
            const currentLevel = achieved ? ach.levels.length : level;
            const prevReq = ach.levels[currentLevel - 1] || 0;
            const nextReq = ach.levels[currentLevel] || ach.levels[ach.levels.length - 1];
            const progress = achieved
              ? 1
              : (current - prevReq) / (nextReq - prevReq);

            // Layout: make the circle bigger, info below
            return (
              <Fade in timeout={500 + idx * 80} key={ach.key}>
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    maxWidth: 400,
                    minHeight: 170,
                    maxHeight: 220,
                    p: { xs: 1.5, sm: 2 },
                    borderRadius: 4,
                    bgcolor: ach.bg(theme),
                    border: achieved
                      ? `2px solid ${ach.color(theme)}`
                      : `1px solid ${theme.palette.divider}`,
                    boxShadow: achieved
                      ? "0 4px 16px 0 rgba(251,146,60,0.18)"
                      : theme.shadows[1],
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    transition: "background-color 0.3s, border-color 0.3s",
                    overflow: "hidden",
                    cursor: achieved ? "pointer" : "default",
                    "&:hover": {
                      boxShadow: achieved
                        ? "0 8px 32px 0 rgba(251,146,60,0.28)"
                        : theme.shadows[3],
                      transform: "translateY(-2px) scale(1.03)",
                    },
                  }}
                >
                  <Box sx={{ width: 120, height: 120, mx: "auto", position: "relative" }}>
                    <CircularProgressbarWithChildren
                      value={progress * 100}
                      styles={buildStyles({
                        pathColor: ach.color(theme),
                        trailColor: theme.palette.mode === "dark" ? "#23232a" : "#e5e7eb",
                        strokeLinecap: "round",
                        backgroundColor: ach.bg(theme),
                      })}
                      strokeWidth={10}
                    >
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        {ach.icon(theme)}
                        <Typography
                          variant="h6"
                          fontWeight={800}
                          color={ach.color(theme)}
                          sx={{
                            mt: 0.5,
                            fontSize: 22,
                            fontFamily: "Montserrat, 'Segoe UI', Arial, sans-serif",
                            letterSpacing: 1,
                          }}
                        >
                          {ach.unit === "hours"
                            ? `${Math.floor(current)}`
                            : `${Math.floor(current)}`}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            fontWeight: 700,
                            fontSize: 13,
                            letterSpacing: 0.5,
                          }}
                        >
                          {ach.unit === "hours" ? "Hours" : "Days"}
                        </Typography>
                      </Box>
                    </CircularProgressbarWithChildren>
                    <Box
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: -30,
                        bgcolor: ach.color(theme),
                        color: "#fff",
                        px: 1,
                        py: 0.2,
                        borderRadius: 2,
                        fontWeight: 700,
                        fontSize: 12,
                        boxShadow: "0 2px 8px 0 rgba(0,0,0,0.10)",
                        zIndex: 2,
                        letterSpacing: 1,
                        minWidth: 38,
                        textAlign: "center",
                      }}
                    >
                      Lv {currentLevel}
                    </Box>
                  </Box>
                  <Box sx={{ mt: 1, width: "100%", textAlign: "center" }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={800}
                      color={ach.color(theme)}
                      sx={{
                        fontSize: 15,
                        letterSpacing: 0.5,
                        fontFamily: "Montserrat, 'Segoe UI', Arial, sans-serif",
                      }}
                    >
                      {ach.label}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontSize: 13,
                        fontWeight: 500,
                        letterSpacing: 0.2,
                        maxWidth: 180,
                        display: "block",
                        mx: "auto",
                      }}
                    >
                      {ach.description(currentLevel)}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        display: "block",
                        mx: "auto",
                      }}
                    >
                      {ach.unit === "hours"
                        ? `${Math.floor(current)} / ${nextReq} hours`
                        : `${Math.floor(current)} / ${nextReq} days`}
                    </Typography>
                  </Box>
                </Box>
              </Fade>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
}

// Helper: parse "1h 30m 10s" to seconds
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