import { Box, Button, CircularProgress } from "@mui/material";
import { Link } from "react-router-dom";
import { buttonsBoxStyle } from "../../Styles/buttonsBoxStyles";
import { BeaconchaUrlBuildingStatus } from "../../types";
import BackupIcon from "@mui/icons-material/Backup";

export default function ButtonsBox({
  isTableEmpty,

  validatorSummaryURL,
  summaryUrlBuildingStatus,
  loadSummaryUrl,
}: {
  isTableEmpty: boolean;

  validatorSummaryURL: string;
  summaryUrlBuildingStatus: BeaconchaUrlBuildingStatus;
  loadSummaryUrl(): void;
}): JSX.Element {
  return (
    <Box sx={buttonsBoxStyle}>
      <Link to={{ pathname: "/import", search: window.location.search }}>
        <Button
          variant="contained"
          size="large"
          sx={{ borderRadius: 3 }}
          endIcon={<BackupIcon />}
        >
          Import
        </Button>
      </Link>

      {summaryUrlBuildingStatus === BeaconchaUrlBuildingStatus.NotStarted ? (
        !isTableEmpty && (
          <Button
            variant="contained"
            size="large"
            sx={{ marginRight: 4, borderRadius: 3 }}
            onClick={loadSummaryUrl}
          >
            Load dashboard
          </Button>
        )
      ) : summaryUrlBuildingStatus === BeaconchaUrlBuildingStatus.NoIndexes ? (
        <></>
      ) : summaryUrlBuildingStatus === BeaconchaUrlBuildingStatus.Success ? (
        <Button
          variant="contained"
          size="large"
          sx={{ marginRight: 4, borderRadius: 3 }}
          target="_blank"
          href={validatorSummaryURL}
        >
          Go to summary dashboard
        </Button>
      ) : (
        <>
          <Button
            variant="contained"
            size="large"
            sx={{ marginRight: 4, borderRadius: 3 }}
            disabled={true}
          >
            Loading summary dashboard...
            <CircularProgress size={24} sx={{ marginLeft: 2 }} />
          </Button>
        </>
      )}
    </Box>
  );
}
