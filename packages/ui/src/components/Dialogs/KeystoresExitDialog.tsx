import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Button,
  DialogContentText,
  DialogActions,
  TextField
} from "@mui/material";
import { GridSelectionModel } from "@mui/x-data-grid";
import { importDialogBoxStyle } from "../../Styles/dialogStyles";
import WaitBox from "../WaitBox/WaitBox";
import ExitWarning from "./ExitWarning";
import { CustomValidatorGetResponse, ValidatorExitExecute, shortenPubkey } from "@stakingbrain/common";
import { api } from "../../api";
import { SlideTransition } from "./Transitions";
import { getEmoji } from "../../utils/dataUtils";

export default function KeystoresExitDialog({
  rows,
  selectedRows,
  setSelectedRows,
  open,
  setOpen
}: {
  rows: CustomValidatorGetResponse[];
  selectedRows: GridSelectionModel;
  setSelectedRows: (selectedRows: GridSelectionModel) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}): JSX.Element {
  const [validatorsExitResponse, setValidatorsExitResponse] = useState<ValidatorExitExecute[]>();
  const [validatorsExitError, setValidatorsExitError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [userConfirmText, setUserConfirmText] = useState("");

  const exitConfirmationMessage = "I want to exit";

  async function getExitSelectedKeystores() {
    try {
      setLoading(true);
      const exitKeysores = await api.getExitValidators({
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
        await api.exitValidators({
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
      fullWidth={true}
      onClose={(event, reason) => {
        if (!reason) {
          handleClose();
        }
      }}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      TransitionComponent={SlideTransition}
    >
      <DialogTitle id="alert-dialog-title">{validatorsExitResponse ? "Done" : "Exit Validators?"}</DialogTitle>
      <DialogContent>
        <Box sx={importDialogBoxStyle}>
          {validatorsExitError ? (
            `Error: ${validatorsExitError}`
          ) : validatorsExitResponse ? (
            <div>
              {validatorsExitResponse.map((result, index) => (
                <div style={{ marginBottom: "20px" }}>
                  <Typography variant="h5" color="GrayText">
                    {shortenPubkey(rows[index]?.pubkey)}
                  </Typography>
                  <Typography variant="h6">
                    <b>Status:</b> {result.status.exited ? <>Exited</> : <>Not exited</>}{" "}
                    {getEmoji(result.status.exited)}
                  </Typography>
                  {result.status.message ? (
                    <Typography variant="h6">
                      <b>Message:</b> {result.status.message}
                    </Typography>
                  ) : null}
                </div>
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
      <DialogActions>
        {!validatorsExitResponse && !loading ? (
          <>
            <Button
              onClick={() => exitSelectedKeystores()}
              variant="contained"
              color="error"
              sx={{ marginRight: 1, borderRadius: 2 }}
              disabled={userConfirmText !== exitConfirmationMessage}
            >
              Exit
            </Button>
            <Button
              onClick={() => getExitSelectedKeystores()}
              variant="contained"
              sx={{ marginRight: 1, borderRadius: 2 }}
            >
              Download
            </Button>
          </>
        ) : null}
        <Button onClick={handleClose} variant="outlined" sx={{ borderRadius: 2 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
