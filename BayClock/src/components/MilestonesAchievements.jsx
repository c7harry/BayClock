import { useState, useEffect } from "react";
import { Box, Typography, LinearProgress } from "@mui/material";
import { motion } from "framer-motion";
import { FaTrophy, FaFire, FaStar, FaCrown, FaGem, FaMedal, FaClock } from "react-icons/fa";
import { GlassCard, getTextColor, getSecondaryTextColor } from "./Theme";

export default function MilestonesAchievements({ entries }) {
  // Dark/Light mode detection
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

  // Calculate total hours worked
  const totalHours = entries.reduce((sum, entry) => {
    const duration = entry.duration || "0s";
    let seconds = 0;
    const regex = /(\d+)h|(\d+)m|(\d+)s/g;
    let match;
    while ((match = regex.exec(duration))) {
      if (match[1]) seconds += parseInt(match[1]) * 3600;
      if (match[2]) seconds += parseInt(match[2]) * 60;
      if (match[3]) seconds += parseInt(match[3]);
    }
    return sum + seconds / 3600;
  }, 0);

  // Calculate consecutive days
  const dates = [...new Set(entries.map(e => e.date))].sort();
  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1]);
    const currDate = new Date(dates[i]);
    const diffTime = currDate - prevDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      tempStreak++;
    } else {
      maxStreak = Math.max(maxStreak, tempStreak);
      tempStreak = 1;
    }
  }
  maxStreak = Math.max(maxStreak, tempStreak);

  // Check if today continues the streak
  const today = new Date().toISOString().slice(0, 10);
  const lastDate = dates[dates.length - 1];
  if (lastDate === today) {
    currentStreak = tempStreak;
  }

  // Define milestones
  const milestones = [
    {
      id: "first-hour",
      title: "First Hour",
      description: "Track your first hour",
      target: 1,
      current: totalHours,
      icon: <FaClock size={20} color="#34d399" />,
      color: "#34d399",
      unlocked: totalHours >= 1,
    },
    {
      id: "ten-hours",
      title: "Getting Started",
      description: "Track 10 total hours",
      target: 10,
      current: totalHours,
      icon: <FaFire size={20} color="#fbbf24" />,
      color: "#fbbf24",
      unlocked: totalHours >= 10,
    },
    {
      id: "fifty-hours",
      title: "Dedicated Tracker",
      description: "Track 50 total hours",
      target: 50,
      current: totalHours,
      icon: <FaStar size={20} color="#60a5fa" />,
      color: "#60a5fa",
      unlocked: totalHours >= 50,
    },
    {
      id: "hundred-hours",
      title: "Time Master",
      description: "Track 100 total hours",
      target: 100,
      current: totalHours,
      icon: <FaCrown size={20} color="#a78bfa" />,
      color: "#a78bfa",
      unlocked: totalHours >= 100,
    },
    {
      id: "week-streak",
      title: "Week Warrior",
      description: "Track time for 7 consecutive days",
      target: 7,
      current: maxStreak,
      icon: <FaGem size={20} color="#f472b6" />,
      color: "#f472b6",
      unlocked: maxStreak >= 7,
    },
    {
      id: "legend",
      title: "Time Tracking Legend",
      description: "Track 500 total hours",
      target: 500,
      current: totalHours,
      icon: <FaMedal size={20} color="#fb923c" />,
      color: "#fb923c",
      unlocked: totalHours >= 500,
    },
  ];

  const unlockedCount = milestones.filter(m => m.unlocked).length;

  return (
    <GlassCard 
      title="Achievements & Milestones" 
      icon={<FaTrophy size={16} />} 
      delay={0}
    >
      <Box sx={{ p: 3 }}>
        {/* Stats Summary */}
        <Box sx={{ 
          display: "grid", 
          gridTemplateColumns: { xs: "1fr 1fr", md: "1fr 1fr 1fr 1fr" }, 
          gap: 2, 
          mb: 3 
        }}>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "#fb923c" }}>
              {Math.floor(totalHours)}h
            </Typography>
            <Typography variant="body2" sx={{ color: getSecondaryTextColor(mode) }}>
              Total Hours
            </Typography>
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "#34d399" }}>
              {entries.length}
            </Typography>
            <Typography variant="body2" sx={{ color: getSecondaryTextColor(mode) }}>
              Sessions
            </Typography>
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "#60a5fa" }}>
              {maxStreak}
            </Typography>
            <Typography variant="body2" sx={{ color: getSecondaryTextColor(mode) }}>
              Best Streak
            </Typography>
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "#a78bfa" }}>
              {unlockedCount}/{milestones.length}
            </Typography>
            <Typography variant="body2" sx={{ color: getSecondaryTextColor(mode) }}>
              Achievements
            </Typography>
          </Box>
        </Box>

        {/* Achievements Grid */}
        <Box sx={{ 
          display: "grid", 
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" }, 
          gap: 2 
        }}>
          {milestones.map((milestone, index) => (
            <motion.div
              key={milestone.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ scale: 1.05 }}
            >
              <Box
                sx={{
                  p: 2,
                  borderRadius: 3,
                  background: milestone.unlocked
                    ? `linear-gradient(135deg, ${milestone.color}20, ${milestone.color}10)`
                    : mode === 'dark' 
                      ? "rgba(255, 255, 255, 0.05)"
                      : "rgba(0, 0, 0, 0.05)",
                  border: milestone.unlocked 
                    ? `2px solid ${milestone.color}40`
                    : mode === 'dark'
                      ? "2px solid rgba(255, 255, 255, 0.1)"
                      : "2px solid rgba(0, 0, 0, 0.1)",
                  backdropFilter: "blur(10px)",
                  position: "relative",
                  overflow: "hidden",
                  opacity: milestone.unlocked ? 1 : 0.6,
                }}
              >
                {/* Shine effect for unlocked achievements */}
                {milestone.unlocked && (
                  <motion.div
                    animate={{ x: [-100, 300] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "50px",
                      height: "100%",
                      background: `linear-gradient(90deg, transparent, ${milestone.color}40, transparent)`,
                      zIndex: 1,
                    }}
                  />
                )}

                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <motion.div
                    animate={milestone.unlocked ? { rotate: [0, 15, -15, 0] } : {}}
                    transition={{ duration: 0.5, repeat: milestone.unlocked ? Infinity : 0, repeatDelay: 2 }}
                  >
                    {milestone.icon}
                  </motion.div>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      ml: 1, 
                      fontWeight: 600, 
                      color: milestone.unlocked ? milestone.color : getSecondaryTextColor(mode),
                      fontSize: "0.95rem"
                    }}
                  >
                    {milestone.title}
                  </Typography>
                </Box>

                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: getSecondaryTextColor(mode), 
                    mb: 1.5,
                    fontSize: "0.8rem"
                  }}
                >
                  {milestone.description}
                </Typography>

                {/* Progress Bar */}
                <Box sx={{ mb: 1 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontSize: "0.75rem", color: getTextColor(mode) }}>
                      Progress
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: "0.75rem", color: milestone.color }}>
                      {Math.min(Math.floor(milestone.current), milestone.target)}/{milestone.target}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min((milestone.current / milestone.target) * 100, 100)}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: mode === 'dark' 
                        ? "rgba(255, 255, 255, 0.1)"
                        : "rgba(0, 0, 0, 0.1)",
                      "& .MuiLinearProgress-bar": {
                        backgroundColor: milestone.color,
                        borderRadius: 3,
                      },
                    }}
                  />
                </Box>

                {milestone.unlocked && (
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mt: 1 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: milestone.color, 
                        fontWeight: 600,
                        fontSize: "0.75rem"
                      }}
                    >
                      ✨ UNLOCKED ✨
                    </Typography>
                  </Box>
                )}
              </Box>
            </motion.div>
          ))}
        </Box>

        {/* Motivational Message */}
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography 
            variant="body1" 
            sx={{ 
              color: getTextColor(mode, 0.8), 
              fontStyle: "italic",
              fontSize: "0.9rem"
            }}
          >
            {unlockedCount === milestones.length 
              ? "🎉 Congratulations! You've unlocked all achievements!"
              : `Keep tracking! ${milestones.length - unlockedCount} more achievement${milestones.length - unlockedCount !== 1 ? 's' : ''} to unlock.`
            }
          </Typography>
        </Box>
      </Box>
    </GlassCard>
  );
}