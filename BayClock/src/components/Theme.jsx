import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";

// Theme-aware text color functions
export const getTextColor = (mode, opacity = 1) => {
  if (mode === 'dark') {
    return `rgba(255, 255, 255, ${opacity})`;
  } else {
    return `rgba(0, 0, 0, ${opacity})`;
  }
};

export const getSecondaryTextColor = (mode) => {
  if (mode === 'dark') {
    return 'rgba(255, 255, 255, 0.7)';
  } else {
    return 'rgba(0, 0, 0, 0.6)';
  }
};

export const getGridColor = (mode) => {
  if (mode === 'dark') {
    return 'rgba(255, 255, 255, 0.1)';
  } else {
    return 'rgba(0, 0, 0, 0.1)';
  }
};

// Glass morphism card component with compact header
export const GlassCard = ({ children, title, icon, delay = 0, sx = {}, ...props }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, rotateX: -15 }}
    animate={{ opacity: 1, y: 0, rotateX: 0 }}
    transition={{ duration: 0.6, delay }}
    whileHover={{ y: -2, scale: 1.01 }}
    style={{
      background: document.documentElement.classList.contains("dark")
        ? "rgba(35, 35, 42, 0.7)" 
        : "rgba(255, 255, 255, 0.7)",
      backdropFilter: "blur(20px)",
      border: document.documentElement.classList.contains("dark")
        ? "1px solid rgba(255, 255, 255, 0.1)" 
        : "1px solid rgba(0, 0, 0, 0.1)",
      borderRadius: "20px",
      boxShadow: document.documentElement.classList.contains("dark")
        ? "0 8px 20px rgba(0, 0, 0, 0.2)"
        : "0 8px 20px rgba(0, 0, 0, 0.08)",
      overflow: 'hidden',
      ...sx,
    }}
    {...props}
  >
    {/* Compact Header Section */}
    {title && (
      <CompactHeader icon={icon} title={title} />
    )}
    {children}
  </motion.div>
);

// Compact Header Component
export const CompactHeader = ({ icon, title }) => (
  <Box sx={{ 
    bgcolor: 'warning.main', 
    color: 'white', 
    py: 1, 
    px: 2,
    background: 'linear-gradient(135deg, #0F2D52 0%, #fb923c 100%)'
  }}>
    <Typography variant="subtitle1" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {icon} {title}
    </Typography>
  </Box>
);

// Chart Card wrapper using GlassCard
export const ChartCard = ({ title, icon, children, delay = 0, ...props }) => (
  <GlassCard title={title} icon={icon} delay={delay} {...props}>
    <Box sx={{ p: 2.5 }}>
      {children}
    </Box>
  </GlassCard>
);