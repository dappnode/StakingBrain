import type { JSX } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { BuilderConfig } from "@stakingbrain/common";
import { builderConfigComparison, BuilderComparisonRow } from "../../utils/builderConfigDisplay";

function ComparisonTable({ rows }: { rows: BuilderComparisonRow[] }): JSX.Element {
  return (
    <TableContainer>
      <Table size="small" sx={{ tableLayout: "fixed", "& td, & th": { overflowWrap: "anywhere", px: 1, py: 1.25 } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: "28%" }}>Setting</TableCell>
            <TableCell sx={{ bgcolor: "action.hover" }}>Saved in Brain</TableCell>
            <TableCell>Validator is using</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label}>
              <TableCell component="th" scope="row">
                {row.label}
              </TableCell>
              <TableCell sx={{ bgcolor: "action.hover" }}>
                <Tooltip title={row.savedDetail || ""} slotProps={{ tooltip: { sx: { overflowWrap: "anywhere" } } }}>
                  <span>{row.saved}</span>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Tooltip
                  title={row.effectiveDetail || ""}
                  slotProps={{ tooltip: { sx: { overflowWrap: "anywhere" } } }}
                >
                  <span>{row.effective}</span>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function BuilderConfigSummary({
  saved,
  resolved
}: {
  saved?: BuilderConfig | null;
  resolved?: BuilderConfig;
}): JSX.Element {
  const comparison = builderConfigComparison(saved, resolved);
  return (
    <Stack spacing={1}>
      <ComparisonTable rows={comparison.rows} />
      {comparison.builders.map((builder, index) => (
        <Accordion
          key={index}
          disableGutters
          elevation={0}
          sx={{ bgcolor: "transparent", "&::before": { display: "none" } }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 1, minWidth: 0 }}>
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                {builder.url}
              </Typography>
              {builder.source && <Chip label={builder.source} size="small" sx={{ alignSelf: "flex-start" }} />}
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 0 }}>
            <ComparisonTable rows={builder.rows} />
          </AccordionDetails>
        </Accordion>
      ))}
    </Stack>
  );
}
