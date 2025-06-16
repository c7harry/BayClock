import { useState } from "react";
import { Card, Typography, Box, Stack, IconButton, Collapse, Avatar, Divider } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { motion } from "framer-motion";
import styled from "@emotion/styled";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip, { tooltipClasses } from "@mui/material/Tooltip";

// Styled Menu (adapts to dark/light mode)
const StyledMenu = styled(Menu)(({ theme }) => ({
  ".MuiPaper-root": {
    borderRadius: 12,
    minWidth: 120,
    boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
    background: theme.palette.background.paper,
    color: theme.palette.text.primary,
    border: `1px solid ${theme.palette.divider}`,
  },
}));

// Styled MenuItem (adapts to dark/light mode, uses black/white for text and strong hover)
const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.mode === "dark" ? "#fff" : "#222",
  transition: "background 0.2s, color 0.2s",
  "&:hover": {
    background: theme.palette.mode === "dark"
      ? "rgba(255,255,255,0.10)"
      : "rgba(0,0,0,0.08)",  
    color: theme.palette.mode === "dark" ? "#fff" : "#222",
  },
}));

// Add a styled IconButton for MoreVertIcon with adaptive hover effect
const StyledIconButton = styled(IconButton)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: "0 1px 4px 0 rgba(0,0,0,0.04)",
  padding: 6,
  transition: "background 0.2s, color 0.2s",
  "&:hover": {
    backgroundColor:
      theme.palette.mode === "dark"
        ? theme.palette.grey[800]
        : theme.palette.grey[100],
    color: theme.palette.mode === "dark"
      ? theme.palette.primary.light
      : theme.palette.primary.dark,
  },
}));

// Custom styled tooltip for entry cards
const EntryTooltip = styled(({ className, ...props }) => (
  <Tooltip {...props} classes={{ popper: className }} arrow />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.mode === "dark" ? "#23232a" : "#fff",
    color: theme.palette.mode === "dark" ? "#fff" : "#23232a",
    fontSize: 14,
    fontWeight: 500,
    borderRadius: 8,
    boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
    border: `1px solid ${theme.palette.divider}`,
    padding: "8px 12px",
  },
  [`& .${tooltipClasses.arrow}`]: {
    color: theme.palette.mode === "dark" ? "#23232a" : "#fff",
  },
}));

// Helper to format date as "Wed, Jun 4"
function formatEntryDate(dateStr) {
  if (!dateStr) return "";
  // Split the string and construct a local date
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day); // JS months are 0-based
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Helper to sum durations
function sumDurations(durations) {
  let totalSeconds = 0;
  durations.forEach((str) => {
    if (!str) return;
    const regex = /(\d+)\s*h|(\d+)\s*m|(\d+)\s*s/gi;
    let match;
    while ((match = regex.exec(str))) {
      if (match[1]) totalSeconds += parseInt(match[1]) * 3600;
      if (match[2]) totalSeconds += parseInt(match[2]) * 60;
      if (match[3]) totalSeconds += parseInt(match[3]);
    }
  });
  // Always show "Xh Ym Zs"
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  let out = [];
  if (h) out.push(`${h}h`);
  if (m) out.push(`${m}m`);
  out.push(`${s}s`); // Always show seconds, even if 0
  return out.join(" ") || "0s";
}

// Helper to format time as "2:09 AM"
function formatEntryTime(timeStr) {
  if (!timeStr) return "";
  // Accepts "14:09" or "2:09" or "2:09 AM"
  let [h, m] = timeStr.split(":");
  if (m && m.length > 2) m = m.slice(0, 2); // handle "14:09:00"
  let date = new Date();
  date.setHours(Number(h), Number(m), 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// Helper to format duration as "HH:mm:ss"
function formatDurationHMS(str) {
  if (!str) return "00:00:00";
  let totalSeconds = 0;
  const regex = /(\d+)\s*h|(\d+)\s*m|(\d+)\s*s/gi;
  let match;
  while ((match = regex.exec(str))) {
    if (match[1]) totalSeconds += parseInt(match[1]) * 3600;
    if (match[2]) totalSeconds += parseInt(match[2]) * 60;
    if (match[3]) totalSeconds += parseInt(match[3]);
  }
  const h = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// Get first start and last end from entries
function getTimeRange(entries) {
  // Only consider entries with both start and end
  const valid = entries.filter(e => e.start && e.end);
  if (!valid.length) return ["", ""];
  // Sort by start time
  valid.sort((a, b) => a.start.localeCompare(b.start));
  const firstStart = valid[0].start;
  // Sort by end time
  valid.sort((a, b) => a.end.localeCompare(b.end));
  const lastEnd = valid[valid.length - 1].end;
  return [firstStart, lastEnd];
}

// Get overall min start and max end for a group
function getOverallTimeRange(entries) {
  const starts = entries.map(e => e.start).filter(Boolean);
  const ends = entries.map(e => e.end).filter(Boolean);
  if (!starts.length || !ends.length) return ["", ""];
  const minStart = starts.reduce((a, b) => (a < b ? a : b));
  const maxEnd = ends.reduce((a, b) => (a > b ? a : b));
  return [minStart, maxEnd];
}

/**
 * EntryCardGroup groups entries by date and shows a badge with the count.
 * When clicked, it expands to show all entries for that date.
 * 
 * Props:
 * - entries: array of entry objects for the same date
 * - mode, onEdit, onDelete, showActions: passed to each EntryCard
 */

export function EntryCardGroup({
  entries,
  mode = "light",
  onEdit,
  onDelete,
  showActions = false,
  motionProps = {},
  onResume,
  isRunning,
  projects = [],
  hideDate,
  hideTotal,
}) {
  const [expanded, setExpanded] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null); // For menu
  const menuOpen = Boolean(anchorEl);
  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const entry = entries[0];

  // Get time range for minimized and expanded
  const [firstStart, lastEnd] = getTimeRange(entries);
  const [overallStart, overallEnd] = getOverallTimeRange(entries);

  // Find project name for the group (use first entry)
  const projectName =
    projects.find((p) => p.id === entry.project_id)?.name || "Unknown Project";

  // Calculate total time for this group
  function sumDurations(durations) {
    let totalSeconds = 0;
    const regex = /(\d+)h|(\d+)m|(\d+)s/g;
    durations.forEach((str) => {
      let match;
      while ((match = regex.exec(str))) {
        if (match[1]) totalSeconds += parseInt(match[1]) * 3600;
        if (match[2]) totalSeconds += parseInt(match[2]) * 60;
        if (match[3]) totalSeconds += parseInt(match[3]);
      }
    });
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    let out = [];
    if (h) out.push(`${h}h`);
    if (m) out.push(`${m}m`);
    out.push(`${s}s`);
    return out.join(" ") || "0s";
  }
  const totalTime = sumDurations(entries.map(e => e.duration));

  return (
    <motion.li
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...motionProps}
      style={{ listStyle: "none" }}
    >
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          bgcolor: "background.default",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 2px 8px 0 rgba(0,0,0,0.04)",
          border: "1px solid",
          borderColor: "divider",
          transition: "box-shadow 0.2s, border-color 0.2s",
          "&:hover": {
            boxShadow: "0 4px 16px 0 rgba(251,146,60,0.10)",
            borderColor: "warning.main",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { sm: "center" },
            justifyContent: "space-between",
            gap: 2,
            px: { xs: 1.5, sm: 3 },
            py: { xs: 1.5, sm: 2 },
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Avatar
                sx={{
                  bgcolor: "warning.main",
                  color: "#fff",
                  width: 40,
                  height: 40,
                  fontWeight: 700,
                  fontSize: 18,
                  mr: 0,
                  cursor: "pointer",
                  boxShadow: "0 1px 4px 0 rgba(251,146,60,0.10)",
                }}
                onClick={() => setExpanded((v) => !v)}
              >
                {entries.length}
              </Avatar>
              <EntryTooltip title={`Show ${entries.length} entries`} arrow>
                <Box
                  sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}
                  onClick={() => setExpanded((v) => !v)}
                >
                  <ExpandMoreIcon
                    sx={{
                      ml: 0.5,
                      transition: "transform 0.2s",
                      transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                      color: "warning.main",
                      fontSize: 22,
                    }}
                  />
                </Box>
              </EntryTooltip>
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              {/* Task description and project on the same row */}
              <Stack direction="row" alignItems="center" spacing={2} sx={{ minWidth: 0, overflow: "hidden", flexWrap: "nowrap" }}>
                <EntryTooltip title={entry.description} arrow>
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    color="text.primary"
                    sx={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2, // Show up to 2 lines, then ellipsis
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontSize: 17,
                      mb: 0.2,
                      minWidth: 0,
                      flexGrow: 1,
                      whiteSpace: "normal",
                      maxHeight: "3.2em", // Prevents overflow (2 lines)
                    }}
                  >
                    {entry.description}
                  </Typography>
                </EntryTooltip>
                <Box
                  sx={{
                    minWidth: 100,
                    display: "flex",
                    justifyContent: "flex-end",
                    mr: 2, 
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      bgcolor: "warning.light",
                      color: "warning.dark",
                      borderRadius: 2,
                      px: 1.2,
                      py: 0.2,
                      fontWeight: 500,
                      fontSize: 13,
                      letterSpacing: 0.2,
                      textAlign: "center",
                      display: "inline-block",
                      width: "100%",
                    }}
                  >
                    • {projectName}
                  </Typography>
                </Box>
                {/* Spacer for extra padding between project type and time range*/}
                <Box sx={{ width: 32 }} />
                {/* Time range display */}
                <Box sx={{ minWidth: 120, mr: 2, display: "flex", alignItems: "center" }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 500 }}
                  >
                    {!expanded
                      ? (firstStart && lastEnd
                          ? `${formatEntryTime(firstStart)} - ${formatEntryTime(lastEnd)}`
                          : "")
                      : (overallStart && overallEnd)
                          ? `${formatEntryTime(overallStart)} - ${formatEntryTime(overallEnd)}`
                          : ""
                    }
                  </Typography>
                </Box>
                {/* Resume Task Button */}
                <EntryTooltip title={isRunning ? "A task is already running" : "Resume this task"} arrow>
                  <span>
                    <IconButton
                      aria-label="resume"
                      color="warning"
                      sx={{
                        bgcolor: "warning.light",
                        color: "warning.dark",
                        ml: 1,
                        "&:hover": { bgcolor: "warning.main", color: "#fff" },
                      }}
                      size="small"
                      onClick={() => !isRunning && onResume && onResume(entry)}
                      disabled={isRunning}
                    >
                      <PlayArrowIcon fontSize="small" />
                    </IconButton>
                  </span>
                </EntryTooltip>
                {/* Vertical button stays at the right */}
                {showActions && onDelete && (
                  <>
                    <EntryTooltip title="More actions" arrow>
                      <span>
                        <StyledIconButton
                          aria-label="more"
                          aria-controls={menuOpen ? "entry-group-menu" : undefined}
                          aria-haspopup="true"
                          aria-expanded={menuOpen ? "true" : undefined}
                          onClick={handleMenuOpen}
                          size="small"
                          sx={{
                            overflow: "visible", 
                            zIndex: 2,         
                          }}
                        >
                          <MoreVertIcon />
                        </StyledIconButton>
                      </span>
                    </EntryTooltip>
                    <StyledMenu
                      id="entry-group-menu"
                      anchorEl={anchorEl}
                      open={menuOpen}
                      onClose={handleMenuClose}
                      anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "right",
                      }}
                      transformOrigin={{
                        vertical: "top",
                        horizontal: "right",
                      }}
                    >
                      <StyledMenuItem
                        onClick={() => {
                          handleMenuClose();
                          // Delete all entries in this group (by date)
                          entries.forEach((e) => onDelete(e.id));
                        }}
                      >
                        <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                        Delete All
                      </StyledMenuItem>
                    </StyledMenu>
                  </>
                )}
              </Stack>
            </Box>
          </Stack>
        </Box>
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box sx={{ pl: 1, pt: 0 }}>
            {entries.map((e, idx) => (
              <Box
                key={e.id}
                sx={{
                  mb: idx === entries.length - 1 ? 1.5 : 0 // Add spacing below the last card
                }}
              >
                <EntryCard
                  entry={e}
                  projects={projects}
                  mode={mode}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  showActions={showActions}
                  motionProps={{ initial: false, animate: true }}
                  hideDate
                  showTimeRange // prop to show time range on single cards
                  onResume={onResume}
                  isRunning={isRunning}
                />
              </Box>
            ))}
          </Box>
        </Collapse>
      </Card>
    </motion.li>
  );
}

// Single entry card (date row on top, optionally hidden)
export default function EntryCard({
  entry,
  mode = "light",
  onEdit,
  onDelete,
  showActions = false,
  motionProps = {},
  hideDate = false,
  showTimeRange = false,
  onResume,
  isRunning,
  projects = [], // <-- add this prop
}) {
  // Find project name for this entry
  const projectName =
    projects.find((p) => p.id === entry.project_id)?.name || "Unknown Project";

  // Always show time range for single entries
  const displayTimeRange = entry.start && entry.end;

  // State for menu
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);
  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  return (
    <motion.li
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...motionProps}
      style={{ listStyle: "none" }}
    >
      <Card
        elevation={0}
        sx={{
          borderRadius: 3,
          bgcolor: "background.default",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 2px 8px 0 rgba(0,0,0,0.04)",
          border: "1px solid",
          borderColor: "divider",
          transition: "box-shadow 0.2s, border-color 0.2s",
          "&:hover": {
            boxShadow: "0 4px 16px 0 rgba(251,146,60,0.10)",
            borderColor: "warning.main",
          },
        }}
      >
        {/* Date and duration row on top */}
        {!hideDate && (
          <Box
            sx={{
              px: { xs: 1.5, sm: 3 },
              pt: 1.2,
              pb: 0.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ fontSize: 13, fontWeight: 600 }}
            >
              {formatEntryDate(entry.date)}
            </Typography>
            <Typography
              variant="caption"
              color="warning.main"
              sx={{ fontSize: 13, fontWeight: 700 }}
            >
              Total: {sumDurations([entry.duration])}
            </Typography>
          </Box>
        )}
        {!hideDate && <Divider />}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { sm: "center" },
            justifyContent: "space-between",
            gap: 2,
            px: { xs: 1.5, sm: 3 },
            py: { xs: 1.5, sm: 2 },
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* Task description and project on the same row */}
              <Stack direction="row" alignItems="center" spacing={2} sx={{ minWidth: 0, overflow: "hidden", flexWrap: "nowrap" }}>
                <EntryTooltip title={entry.description} arrow>
                  <Typography
                    variant="subtitle1"
                    fontWeight={600}
                    color="text.primary"
                    sx={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2, // Show up to 2 lines, then ellipsis
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontSize: 17,
                      mb: 0.2,
                      minWidth: 0,
                      flexGrow: 1,
                      whiteSpace: "normal",
                      maxHeight: "3.2em", // Prevents overflow (2 lines)
                    }}
                  >
                    {entry.description}
                  </Typography>
                </EntryTooltip>
                <Box
                  sx={{
                    minWidth: 100,
                    display: "flex",
                    justifyContent: "flex-end",
                    mr: 2,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      bgcolor: "warning.light",
                      color: "warning.dark",
                      borderRadius: 2,
                      px: 1.2,
                      py: 0.2,
                      fontWeight: 500,
                      fontSize: 13,
                      letterSpacing: 0.2,
                      textAlign: "center",
                      display: "inline-block",
                      width: "100%",
                    }}
                  >
                    • {projectName}
                  </Typography>
                </Box>
                {/* Spacer for extra padding */}
                <Box sx={{ width: 32 /* or 24, adjust as needed */ }} />
                {/* Always show time range for single entry */}
                {displayTimeRange && (
                  <Box sx={{ minWidth: 120, mr: 2, display: "flex", alignItems: "center" }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 500 }}
                    >
                      {formatEntryTime(entry.start)} - {formatEntryTime(entry.end)}
                    </Typography>
                  </Box>
                )}
                {/* === Individual Entry Duration === */}
                <Box
                  sx={{
                    minWidth: 60,
                    mr: 2,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="warning.main"
                    sx={{
                      fontSize: 13,
                      fontWeight: 700,
                      bgcolor: "warning.light",
                      color: "warning.dark",
                      borderRadius: 2,
                      px: 1.5,
                      py: 0.5,
                      letterSpacing: 0.2,
                      textAlign: "center",
                      display: "inline-block",
                      width: "100%",
                    }}
                  >
                    {formatDurationHMS(entry.duration)}
                  </Typography>
                </Box>
                {/* Resume Task Button */}
                <EntryTooltip title={isRunning ? "A task is already running" : "Resume this task"} arrow>
                  <span>
                    <IconButton
                      aria-label="resume"
                      color="warning"
                      sx={{
                        bgcolor: "warning.light",
                        color: "warning.dark",
                        ml: 1,
                        "&:hover": { bgcolor: "warning.main", color: "#fff" },
                      }}
                      size="small"
                      onClick={() => !isRunning && onResume && onResume(entry)}
                      disabled={isRunning}
                    >
                      <PlayArrowIcon fontSize="small" />
                    </IconButton>
                  </span>
                </EntryTooltip>
                {/* 3 vertical dots menu for actions */}
                {showActions && (
                  <>
                    <EntryTooltip title="More actions" arrow>
                      <span
                        style={{
                          display: "inline-flex",
                          position: "relative",
                          zIndex: 2, // Ensure tooltip and hover effect are above parent overflow
                        }}
                      >
                        <IconButton
                          aria-label="more"
                          aria-controls={menuOpen ? "entry-menu" : undefined}
                          aria-haspopup="true"
                          aria-expanded={menuOpen ? "true" : undefined}
                          onClick={handleMenuOpen}
                          sx={{
                            ml: 1,
                            bgcolor: "background.paper",
                            borderRadius: 2,
                            boxShadow: "0 1px 4px 0 rgba(0,0,0,0.04)",
                            "&:hover": { bgcolor: "grey.100" },
                            p: 0.7,
                            overflow: "visible",
                            zIndex: 2,         
                          }}
                          size="small"
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </span>
                    </EntryTooltip>
                    <StyledMenu
                      id="entry-menu"
                      anchorEl={anchorEl}
                      open={menuOpen}
                      onClose={handleMenuClose}
                      anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "right",
                      }}
                      transformOrigin={{
                        vertical: "top",
                        horizontal: "right",
                      }}
                    >
                      {onEdit && (
                        <StyledMenuItem
                          onClick={() => {
                            handleMenuClose();
                            onEdit(entry);
                          }}
                        >
                          <EditIcon fontSize="small" sx={{ mr: 1 }} />
                          Edit
                        </StyledMenuItem>
                      )}
                      {onDelete && (
                        <StyledMenuItem
                          onClick={() => {
                            handleMenuClose();
                            onDelete(entry.id);
                          }}
                        >
                          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                          Delete
                        </StyledMenuItem>
                      )}
                    </StyledMenu>
                  </>
                )}
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Card>
    </motion.li>
  );
}