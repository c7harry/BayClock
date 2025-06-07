import { useState } from "react";
import { Card, Typography, Box, Stack, IconButton, Tooltip, Collapse, Avatar, Divider, Menu, MenuItem } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { motion } from "framer-motion";

// Helper to format date as "Wed, Jun 4"
function formatEntryDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
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
        {/* Date and total duration row on top */}
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
            Total: {sumDurations(entries.map((e) => e.duration))}
          </Typography>
        </Box>
        <Divider />
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
            <Tooltip title={`Show ${entries.length} entries`} arrow>
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
            </Tooltip>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {/* Task description and project on the same row */}
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight={600}
                  color="text.primary"
                  sx={{
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    fontSize: 17,
                    mb: 0.2,
                    minWidth: 0,
                    flexGrow: 1,
                  }}
                >
                  {entry.description}
                </Typography>
                <Box
                  sx={{
                    minWidth: 100,
                    display: "flex",
                    justifyContent: "flex-end",
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
                    • {entry.project}
                  </Typography>
                </Box>
                {/* Time range display and vertical menu */}
                <Box sx={{ minWidth: 120, ml: 2, display: "flex", alignItems: "center" }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 500 }}
                  >
                    {!expanded
                      ? (firstStart && lastEnd
                          ? `${formatEntryTime(firstStart)} - ${formatEntryTime(lastEnd)}`
                          : "")
                      : (overallStart && overallEnd
                          ? `${formatEntryTime(overallStart)} - ${formatEntryTime(overallEnd)}`
                          : "")
                    }
                  </Typography>
                  {showActions && onDelete && (
                    <>
                      <IconButton
                        aria-label="more"
                        aria-controls={menuOpen ? "entry-group-menu" : undefined}
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
                        }}
                        size="small"
                      >
                        <MoreVertIcon />
                      </IconButton>
                      <Menu
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
                        <MenuItem
                          onClick={() => {
                            handleMenuClose();
                            // Delete all entries in this group (by date)
                            entries.forEach((e) => onDelete(e.id));
                          }}
                        >
                          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                          Delete All
                        </MenuItem>
                      </Menu>
                    </>
                  )}
                </Box>
              </Stack>
            </Box>
          </Stack>
        </Box>
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box sx={{ pl: 6, pt: 1 }}>
            {entries.map((e) => (
              <EntryCard
                key={e.id}
                entry={e}
                mode={mode}
                onEdit={onEdit}
                onDelete={onDelete}
                showActions={showActions}
                motionProps={{ initial: false, animate: true }}
                hideDate
                showTimeRange // pass this prop to show time range on single cards
              />
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
  showTimeRange = false, // new prop
}) {
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
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight={600}
                  color="text.primary"
                  sx={{
                    textOverflow: "ellipsis",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    fontSize: 17,
                    mb: 0.2,
                    minWidth: 0,
                    flexGrow: 1,
                  }}
                >
                  {entry.description}
                </Typography>
                <Box
                  sx={{
                    minWidth: 100,
                    display: "flex",
                    justifyContent: "flex-end",
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
                    • {entry.project}
                  </Typography>
                </Box>
                {/* Always show time range for single entry */}
                {displayTimeRange && (
                  <Box sx={{ minWidth: 120, ml: 2 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 500 }}
                    >
                      {formatEntryTime(entry.start)} - {formatEntryTime(entry.end)}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>
          </Stack>
          {/* 3 vertical dots menu for actions */}
          {showActions && (
            <>
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
                }}
                size="small"
              >
                <MoreVertIcon />
              </IconButton>
              <Menu
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
                  <MenuItem
                    onClick={() => {
                      handleMenuClose();
                      onEdit(entry);
                    }}
                  >
                    <span className="material-icons" style={{ fontSize: 18, marginRight: 8 }}></span>
                    Edit
                  </MenuItem>
                )}
                {onDelete && (
                  <MenuItem
                    onClick={() => {
                      handleMenuClose();
                      onDelete(entry.id);
                    }}
                  >
                    <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                    Delete
                  </MenuItem>
                )}
              </Menu>
            </>
          )}
        </Box>
      </Card>
    </motion.li>
  );
}