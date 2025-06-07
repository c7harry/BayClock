import { useState } from "react";
import { Card, Typography, Box, Stack, IconButton, Tooltip, Collapse, Avatar } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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
  const entry = entries[0];

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
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { sm: "center" },
          justifyContent: "space-between",
          gap: 2,
          px: { xs: 1.5, sm: 3 },
          py: { xs: 1.5, sm: 2 },
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
              }}
            >
              {entry.description}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography
                variant="caption"
                sx={{
                  bgcolor: "warning.light",
                  color: "warning.dark",
                  borderRadius: 2,
                  px: 1.2,
                  py: 0.2,
                  fontWeight: 500,
                  fontSize: 12,
                  letterSpacing: 0.2,
                }}
              >
                {entry.project}
              </Typography>
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ fontSize: 12, ml: 0.5 }}
              >
                {formatEntryDate(entry.date)}
              </Typography>
            </Stack>
          </Box>
        </Stack>
        <Stack alignItems="flex-end" spacing={0.5} sx={{ minWidth: 90 }}>
          <Typography
            variant="h6"
            fontWeight={700}
            color="warning.main"
            sx={{ fontSize: 20, lineHeight: 1.1 }}
          >
            {entries.map((e) => e.duration).join(" + ")}
          </Typography>
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ fontSize: 11, letterSpacing: 0.5 }}
          >
            Duration(s)
          </Typography>
        </Stack>
      </Card>
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
            />
          ))}
        </Box>
      </Collapse>
    </motion.li>
  );
}

// Single entry card (unchanged)
export default function EntryCard({
  entry,
  mode = "light",
  onEdit,
  onDelete,
  showActions = false,
  motionProps = {},
}) {
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
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { sm: "center" },
          justifyContent: "space-between",
          gap: 2,
          px: { xs: 1.5, sm: 3 },
          py: { xs: 1.5, sm: 2 },
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
        <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1, minWidth: 0 }}>
          {/* Avatar removed */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
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
              }}
            >
              {entry.description}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography
                variant="caption"
                sx={{
                  bgcolor: "warning.light",
                  color: "warning.dark",
                  borderRadius: 2,
                  px: 1.2,
                  py: 0.2,
                  fontWeight: 500,
                  fontSize: 12,
                  letterSpacing: 0.2,
                }}
              >
                {entry.project}
              </Typography>
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ fontSize: 12, ml: 0.5 }}
              >
                {formatEntryDate(entry.date)}
              </Typography>
            </Stack>
          </Box>
        </Stack>
        <Stack alignItems="flex-end" spacing={0.5} sx={{ minWidth: 90 }}>
          <Typography
            variant="h6"
            fontWeight={700}
            color="warning.main"
            sx={{ fontSize: 20, lineHeight: 1.1 }}
          >
            {entry.duration}
          </Typography>
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ fontSize: 11, letterSpacing: 0.5 }}
          >
            Duration
          </Typography>
          {showActions && (
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
              {onEdit && (
                <Tooltip title="Edit" arrow>
                  <IconButton
                    aria-label="edit"
                    color="primary"
                    size="small"
                    onClick={() => onEdit(entry)}
                    sx={{
                      bgcolor: "background.paper",
                      borderRadius: 2,
                      boxShadow: "0 1px 4px 0 rgba(0,0,0,0.04)",
                      "&:hover": { bgcolor: "primary.light" },
                      p: 0.7,
                    }}
                  >
                    <span className="material-icons" style={{ fontSize: 18 }}>edit</span>
                  </IconButton>
                </Tooltip>
              )}
              {onDelete && (
                <Tooltip title="Delete" arrow>
                  <IconButton
                    aria-label="delete"
                    color="error"
                    size="small"
                    onClick={() => onDelete(entry.id)}
                    sx={{
                      bgcolor: "background.paper",
                      borderRadius: 2,
                      boxShadow: "0 1px 4px 0 rgba(0,0,0,0.04)",
                      "&:hover": { bgcolor: "error.light" },
                      p: 0.7,
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          )}
        </Stack>
      </Card>
    </motion.li>
  );
}