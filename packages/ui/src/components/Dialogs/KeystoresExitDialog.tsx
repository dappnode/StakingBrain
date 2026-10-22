import type { JSX } from "react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Button,
  DialogContentText,
  DialogActions,
  TextField,
  Alert,
  Divider
} from "@mui/material";
import type { GridRowId } from "@mui/x-data-grid";
import { importDialogBoxStyle } from "../../Styles/dialogStyles";
import WaitBox from "../WaitBox/WaitBox";
import ExitWarning from "./ExitWarning";
import { rpcClient } from "../../socket";
import { SlideTransition } from "./Transitions";
import LogoutIcon from "@mui/icons-material/Logout";
import DialogHeader from "./DialogHeader";
import ValidatorResult from "./ValidatorResult";
import type { CustomValidatorGetResponse, ValidatorExitExecute } from "@stakingbrain/brain";
import { useTheme, useMediaQuery } from "@mui/material";

export default function KeystoresExitDialog({
  rows,
  selectedRows,
  setSelectedRows,
  open,
  setOpen
}: {
  rows: CustomValidatorGetResponse[];
  selectedRows: GridRowId[];
  setSelectedRows: (selectedRows: GridRowId[]) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}): JSX.Element {
  const [validatorsExitResponse, setValidatorsExitResponse] = useState<ValidatorExitExecute[]>();
  const [validatorsExitError, setValidatorsExitError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [userConfirmText, setUserConfirmText] = useState("");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const exitConfirmationMessage = "I want to exit";

  async function getExitSelectedKeystores() {
    try {
      setLoading(true);
      const exitKeysores = await rpcClient.call("getExitValidators", {
        pubkeys: selectedRows.map((row) => rows[parseInt(row.toString())].pubkey)
      });

      exitKeysores.forEach((validator) => {
        const element = document.createElement("a");
        const file = new Blob([JSON.stringify(validator)], {
          type: "application/json"
        });
        element.href = URL.createObjectURL(file);
        element.download = `${validator.message.validator_index}.json`;
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();
      });
      setLoading(false);
    } catch (e) {
      setLoading(false);
      console.error(e);
    }
  }

  async function exitSelectedKeystores() {
    try {
      setValidatorsExitResponse(undefined);
      setLoading(true);
      setValidatorsExitResponse(
        await rpcClient.call("exitValidators", {
          pubkeys: selectedRows.map((row) => rows[parseInt(row.toString())].pubkey)
        })
      );
      setLoading(false);
      setValidatorsExitError(undefined);
      setSelectedRows([]);
    } catch (e) {
      console.error(e);
      setLoading(false);
      setValidatorsExitError(e.message);
    }
  }
  const handleClose = () => {
    setOpen(false);
  };
  return (
    <Dialog
      disableEscapeKeyDown={true}
      open={open}
      fullScreen={isMobile}
      fullWidth={!isMobile}
      onClose={(event, reason) => {
        if (!reason) {
          handleClose();
        }
      }}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      TransitionComponent={SlideTransition}
    >
      <DialogHeader
        title={validatorsExitResponse ? "Exit results" : "Exit validators"}
        subtitle="Review and confirm your validator exits."
        icon={<LogoutIcon />}
        count={validatorsExitResponse?.length ?? selectedRows.length}
        onClose={handleClose}
        busy={loading}
      />
      <DialogContent>
        <Box sx={importDialogBoxStyle}>
          {validatorsExitError ? (
            <Alert severity="error">{validatorsExitError}</Alert>
          ) : validatorsExitResponse ? (
            <div>
              {validatorsExitResponse.map((result) => (
                <ValidatorResult
                  key={result.pubkey}
                  pubkey={result.pubkey}
                  status={result.status.exited ? "Exited" : "Not exited"}
                  message={result.status.message}
                />
              ))}
            </div>
          ) : (
            <div>
              {loading ? (
                <WaitBox />
              ) : (
                <>
                  <DialogContentText id="alert-dialog-description" component={"span"}>
                    <ExitWarning rows={rows} selectedRows={selectedRows} />
                  </DialogContentText>

                  <br />

                  <TextField
                    id="outlined-basic"
                    label='Type "I want to exit" to confirm'
                    variant="outlined"
                    value={userConfirmText}
                    onChange={(e) => setUserConfirmText(e.target.value)}
                    sx={{ width: "100%" }}
                  />
                </>
              )}
            </div>
          )}
        </Box>
      </DialogContent>
      <Divider />
      <DialogActions>
        <Button disabled={loading} onClick={handleClose}>
          Close
        </Button>
        {!validatorsExitResponse && !loading ? (
          <>
            <Button onClick={() => getExitSelectedKeystores()} variant="outlined">
              Download exit messages
            </Button>
            <Button
              onClick={() => exitSelectedKeystores()}
              variant="contained"
              color="error"
              sx={{ marginRight: 1, borderRadius: 2 }}
              disabled={userConfirmText !== exitConfirmationMessage}
            >
              Exit
            </Button>
          </>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
