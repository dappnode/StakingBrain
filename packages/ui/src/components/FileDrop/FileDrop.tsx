import type { JSX } from "react";
import { DropEvent, useDropzone } from "react-dropzone";
import { Box, Stack, Typography } from "@mui/material";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";

interface Props {
  callback: <T extends File>(files: T[], event: DropEvent) => void;
}

export default function FileDrop({ callback }: Props): JSX.Element {
  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDropAccepted: callback,
    accept: { "application/json": [".json"] }
  });

  return (
    <Box
      {...getRootProps({ role: "button", "aria-label": "Upload JSON files" })}
      sx={{
        p: { xs: 3, sm: 4 },
        border: "1px dashed",
        borderColor: isDragReject
          ? "error.main"
          : isDragAccept
            ? "success.main"
            : isDragActive
              ? "primary.main"
              : "divider",
        bgcolor: isDragActive ? "action.selected" : "action.hover",
        borderRadius: 2.5,
        cursor: "pointer",
        textAlign: "center",
        "&:hover": { borderColor: "primary.main" },
        "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 }
      }}
    >
      <input {...getInputProps()} />
      <Stack spacing={1} alignItems="center">
        <UploadFileOutlinedIcon color="primary" sx={{ fontSize: 28 }} />
        <Typography variant="body2" fontWeight={600}>
          {isDragActive ? "Drop your files here" : "Drop JSON files here or click to browse"}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          JSON files only
        </Typography>
      </Stack>
    </Box>
  );
}
