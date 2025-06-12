import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, Card, CardContent,
  TableContainer, Chip, Tooltip, Paper
} from "@mui/material";
import { FaListAlt } from "react-icons/fa";

export default function AllEntries() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    async function fetchEntries() {
      // Fetch entries
      const { data: entries, error } = await supabase
        .from("entries")
        .select("*")
        .order("date", { ascending: false })
        .order("start", { ascending: false });
      if (error) {
        console.error("Supabase error:", error.message);
        setEntries([]);
        return;
      }

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email");
      if (profilesError) {
        console.error("Supabase error:", profilesError.message);
        setEntries(entries || []);
        return;
      }

      // Fetch all projects
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("id, name");
      if (projectsError) {
        console.error("Supabase error:", projectsError.message);
        setEntries(entries || []);
        return;
      }

      // Map profiles and projects
      const profileMap = Object.fromEntries(
        (profiles || []).map((p) => [p.id, p])
      );
      const projectMap = Object.fromEntries(
        (projects || []).map((p) => [p.id, p.name])
      );

      // Attach profile and project name to entries
      const entriesWithDetails = (entries || []).map((entry) => ({
        ...entry,
        profile: profileMap[entry.user_id] || {},
        projectName: projectMap[entry.project_id] || entry.project_id,
      }));

      setEntries(entriesWithDetails);
    }
    fetchEntries();
  }, []);

  return (
    <Box
      sx={{
        p: { xs: 1, md: 5 },
        width: "100%",
        maxWidth: "1550px",
        mx: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Title Card */}
      <Card
        elevation={6}
        sx={{
          borderRadius: 5,
          bgcolor: "background.paper",
          mb: 3,
          width: "100%",
          maxWidth: "100%",
        }}
      >
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
          <FaListAlt size={32} color="#fb923c" />
          <Typography
            variant="h4"
            fontWeight={700}
            color="text.primary"
            sx={{ textAlign: "center" }}
          >
            All User Entries
          </Typography>
        </CardContent>
      </Card>
      {/* Entries Table Card */}
      <Card
        elevation={4}
        sx={{
          borderRadius: 5,
          bgcolor: "background.paper",
          width: "100%",
          maxWidth: "100%",
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <TableContainer
            component={Paper}
            sx={{
              maxHeight: "70vh",
              borderRadius: 3,
              boxShadow: "none",
              overflowX: "auto",
            }}
          >
            <Table
              stickyHeader
              size="small"
              aria-label="entries table"
              sx={{
                mx: "auto",
                tableLayout: "fixed", 
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, bgcolor: "background.default", textAlign: "center" }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: "background.default", textAlign: "center" }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: "background.default", textAlign: "center" }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: "background.default", textAlign: "center" }}>Start</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: "background.default", textAlign: "center" }}>End</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: "background.default", textAlign: "center" }}>Duration</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: "background.default", maxWidth: 200, textAlign: "center" }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 700, bgcolor: "background.default", textAlign: "center" }}>Project</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.map((entry, idx) => (
                  <TableRow
                    key={entry.id}
                    hover
                    sx={{
                      bgcolor: idx % 2 === 0 ? "background.paper" : "grey.50",
                      transition: "background 0.2s",
                    }}
                  >
                    <TableCell align="center">{entry.profile?.full_name || entry.user_id}</TableCell>
                    <TableCell align="center" sx={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <Tooltip title={entry.profile?.email || ""} arrow>
                        <span>{entry.profile?.email || ""}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">{entry.date}</TableCell>
                    <TableCell align="center">{entry.start}</TableCell>
                    <TableCell align="center">{entry.end}</TableCell>
                    <TableCell align="center">{entry.duration}</TableCell>
                    <TableCell align="center" sx={{ maxWidth: 200, p: 0.5 }}>
                      <Tooltip title={entry.description || ""} arrow>
                        <Typography
                          variant="body2"
                          sx={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "normal",
                            maxWidth: 200,
                          }}
                        >
                          {entry.description}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={entry.projectName}
                        color="warning"
                        size="small"
                        sx={{
                          bgcolor: "warning.light",
                          color: "warning.dark",
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}