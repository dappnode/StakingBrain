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
  Alert
} from "@mui/material";
import { GridSelectionModel } from "@mui/x-data-grid";
import { importDialogBoxStyle } from "../../Styles/dialogStyles";
import WaitBox from "../WaitBox/WaitBox";
import DeletionWarning from "./DeletionWarning";
import { shortenPubkey } from "@stakingbrain/common";
import { rpcClient } from "../../socket";
import { SlideTransition } from "./Transitions";
import { getEmoji } from "../../utils/dataUtils";
import type { CustomValidatorGetResponse, Web3signerDeleteResponse } from "@stakingbrain/brain";
import { useTheme, useMediaQuery } from "@mui/material";

export default function KeystoresDeleteDialog({
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
  const [keystoresDelete, setKeystoresDelete] = useState<Web3signerDeleteResponse>();
  const [keystoresDeleteError, setKeystoresDeleteError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  async function deleteSelectedKeystores() {
    try {
      setKeystoresDelete(undefined);
      setLoading(true);
      setKeystoresDelete(
        await rpcClient.call("deleteValidators", {
          pubkeys: selectedRows.map((row) => rows[parseInt(row.toString())].pubkey)
        })
      );
      setLoading(false);
      setKeystoresDeleteError(undefined);
      setSelectedRows([]);
    } catch (e) {
      console.error(e);
      setLoading(false);
      setKeystoresDeleteError(e.message);
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
      <DialogTitle id="alert-dialog-title">{keystoresDelete ? "Done" : "Delete Keystores?"}</DialogTitle>
      <DialogContent>
        <Box sx={importDialogBoxStyle}>
          {keystoresDeleteError ? (
            `Error: ${keystoresDeleteError}`
          ) : keystoresDelete?.data ? (
            <div>
              {keystoresDelete.data.map((result, index) => (
                <div style={{ marginBottom: "20px" }}>
                  <Typography variant="h5" color="GrayText">
                    {shortenPubkey(rows[index]?.pubkey)}
                  </Typography>
                  <Typography variant="h6">
                    <b>Status:</b> {result.status} {getEmoji(result.status)}
                  </Typography>
                  {result.message ? (
                    <Typography variant="h6">
                      <b>Message:</b> {result.message}
                    </Typography>
                  ) : null}
                </div>
              ))}
              {keystoresDelete.slashing_protection ? (
                <div>
                  <Alert severity="warning" sx={{ marginTop: 2, marginBottom: 2 }} variant="filled">
                    It is strongly recommended to stop the validator and watch at least 3 missed attestations in the
                    explorer before uploading the keys to another machine.
                  </Alert>

                  <Button
                    variant="contained"
                    href={`data:text/json;charset=utf-8,${encodeURIComponent(keystoresDelete.slashing_protection)}`}
                    download="slashing_protection.json"
                    sx={{ borderRadius: 2 }}
                  >
                    Download Slashing Protection Data
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div>
              {loading ? (
                <WaitBox />
              ) : (
                <DialogContentText id="alert-dialog-description" component={"span"}>
                  <DeletionWarning rows={rows} selectedRows={selectedRows} />
                </DialogContentText>
              )}
            </div>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        {!keystoresDelete && !loading ? (
          <Button
            onClick={() => deleteSelectedKeystores()}
            variant="contained"
            color="error"
            sx={{ marginRight: 1, borderRadius: 2 }}
          >
            Delete
          </Button>
        ) : null}
        <Button onClick={handleClose} variant="outlined" sx={{ borderRadius: 2 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
