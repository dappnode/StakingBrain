import type { JSX } from "react";
import { useState } from "react";
import { Dialog, DialogContent, Box, Button, DialogContentText, DialogActions, Alert, Divider } from "@mui/material";
import type { GridRowId } from "@mui/x-data-grid";
import { importDialogBoxStyle } from "../../Styles/dialogStyles";
import WaitBox from "../WaitBox/WaitBox";
import DeletionWarning from "./DeletionWarning";
import { rpcClient } from "../../socket";
import { SlideTransition } from "./Transitions";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DialogHeader from "./DialogHeader";
import ValidatorResult from "./ValidatorResult";
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
  selectedRows: GridRowId[];
  setSelectedRows: (selectedRows: GridRowId[]) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}): JSX.Element {
  const [keystoresDelete, setKeystoresDelete] = useState<Web3signerDeleteResponse>();
  const [keystoresDeleteError, setKeystoresDeleteError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [deletedPubkeys, setDeletedPubkeys] = useState<string[]>([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  async function deleteSelectedKeystores() {
    try {
      setKeystoresDelete(undefined);
      setLoading(true);
      const pubkeysToDelete = selectedRows.map((row) => rows[parseInt(row.toString())]?.pubkey);
      setDeletedPubkeys(pubkeysToDelete);
      setKeystoresDelete(
        await rpcClient.call("deleteValidators", {
          pubkeys: pubkeysToDelete
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
      <DialogHeader
        title={keystoresDelete ? "Deletion results" : "Delete keystores"}
        subtitle="Remove validator keys from this signer."
        icon={<DeleteOutlineIcon />}
        count={keystoresDelete ? deletedPubkeys.length : selectedRows.length}
        onClose={handleClose}
        busy={loading}
      />
      <DialogContent>
        <Box sx={importDialogBoxStyle}>
          {keystoresDeleteError ? (
            <Alert severity="error">{keystoresDeleteError}</Alert>
          ) : keystoresDelete?.data ? (
            <div>
              {keystoresDelete.data.map((result, index) => {
                const pubkey = deletedPubkeys[index];
                return (
                  <ValidatorResult
                    key={pubkey || index}
                    pubkey={pubkey}
                    status={result.status}
                    message={result.message}
                  />
                );
              })}
              {keystoresDelete.slashing_protection ? (
                <div>
                  <Alert severity="warning" sx={{ marginTop: 2, marginBottom: 2 }}>
                    It is strongly recommended to stop the validator and watch at least 3 missed attestations in the
                    explorer before uploading the keys to another machine.
                  </Alert>

                  <Button
                    variant="contained"
                    href={`data:text/json;charset=utf-8,${encodeURIComponent(keystoresDelete.slashing_protection)}`}
                    download="slashing_protection.json"
                    sx={{ borderRadius: 2 }}
                  >
                    Download slashing protection
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
      <Divider />
      <DialogActions>
        <Button disabled={loading} onClick={handleClose}>
          Close
        </Button>
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
      </DialogActions>
    </Dialog>
  );
}
