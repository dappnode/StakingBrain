import { createTheme } from "@mui/material/styles";
import type { PaletteMode } from "@mui/material";

export function createAppTheme(mode: PaletteMode) {
  return createTheme({
    palette: {
      mode,
      background: {
        default: mode === "light" ? "#f7f9fc" : "#11151c",
        paper: mode === "light" ? "#ffffff" : "#1a2029"
      }
    },
    shape: { borderRadius: 8 },
    typography: {
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      subtitle1: { fontWeight: 600 },
      button: { textTransform: "none", fontWeight: 600 }
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 16, paddingInline: 16 } }
      },
      MuiIconButton: { styleOverrides: { root: { borderRadius: 12 } } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
      MuiCard: {
        defaultProps: { variant: "outlined" },
        styleOverrides: { root: { borderRadius: 20, boxShadow: "none" } }
      },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 24 }, paperFullScreen: { borderRadius: 0 } } },
      MuiDialogTitle: { styleOverrides: { root: { padding: "20px 24px" } } },
      MuiDialogContent: { styleOverrides: { root: { padding: 24 } } },
      MuiDialogActions: { styleOverrides: { root: { padding: "16px 24px", gap: 8, flexWrap: "wrap" } } },
      MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
      MuiFormControl: { defaultProps: { size: "small" } },
      MuiFormControlLabel: { styleOverrides: { label: { fontSize: 14 } } },
      MuiDialogContentText: { styleOverrides: { root: { fontSize: 14, lineHeight: 1.6 } } },
      MuiSelect: { defaultProps: { size: "small" } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 16 }, message: { overflowWrap: "anywhere" } } },
      MuiChip: { styleOverrides: { root: { fontWeight: 500 } } },
      MuiLink: { defaultProps: { underline: "hover" } }
    }
  });
}
