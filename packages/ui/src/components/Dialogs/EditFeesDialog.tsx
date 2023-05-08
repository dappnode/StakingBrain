//External components
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { GridSelectionModel } from "@mui/x-data-grid";
import {
  CustomValidatorGetResponse,
  burnAddress,
  isValidEcdsaPubkey,
  CustomValidatorUpdateRequest,
  areAllFeeRecipientsEditable,
} from "@stakingbrain/common";
import React from "react";

//Logic
import { useEffect, useState } from "react";
import { api } from "../../api";

//Styles
import { importDialogBoxStyle } from "../../Styles/dialogStyles";
import WaitBox from "../WaitBox/WaitBox";
import { SlideTransition } from "./Transitions";

export default function FeeRecipientDialog({
  open,
  setOpen,
  rows,
  selectedRows,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  rows: CustomValidatorGetResponse[];
  selectedRows: GridSelectionModel;
}): JSX.Element {
  const [newFeeRecipient, setNewFeeRecipient] = useState("");
  //const [wrongPostPubkeys, setWrongPostPubkeys] = useState(new Array<string>());
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setOpen(false);
    setErrorMessage("");
    setSuccessMessage("");
    //setWrongPostPubkeys(new Array<string>());
  };

  const handleNewFeeRecipientChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setNewFeeRecipient(event.target.value);
  };

  //To hide success message after 5 seconds
  useEffect(() => {
    const timeId = setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, 3000);

    return () => {
      clearTimeout(timeId);
    };
  }, [successMessage]);

  const updateFeeRecipients = async (newFeeRecipient: string) => {
    let error = false;
    const validatorsData: CustomValidatorUpdateRequest[] = [];

    selectedRows.forEach((rowId) => {
      const row = rows[parseInt(rowId.toString())];

      if (row) {
        validatorsData.push({
          pubkey: row.pubkey,
          feeRecipient: newFeeRecipient,
        });
      }
    });

    setLoading(true);

    try {
      api.updateValidators(validatorsData);
    } catch (err) {
      setErrorMessage(
        "There was an error updating some fee recipients: " + err
      );
      error = true;
    }

    setLoading(false);

    if (!error) {
      setSuccessMessage("Fee recipients updated successfully");
    }
  };

  function areAllSelectedFeeRecipientsEditable() {
    const selectedTags = selectedRows
      .map((rowId) => rows[parseInt(rowId.toString())].tag)
      .flat();

    return areAllFeeRecipientsEditable(selectedTags);
  }

  function isNewFrSameAsAllOldFrs(): boolean {
    const oldFeeRecipients = selectedRows
      .map((rowId) => rows[parseInt(rowId.toString())].feeRecipient)
      .flat();

    console.log(oldFeeRecipients);

    return oldFeeRecipients.every((fr) => fr === newFeeRecipient);
  }

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
      <DialogTitle
        id="alert-dialog-title"
        sx={{ fontWeight: 700, fontSize: 24 }}
      >
        Edit Fee Recipient (for selected validators)
      </DialogTitle>
      <>
        <DialogContent>
          <Box sx={importDialogBoxStyle}>
            <TextField
              onChange={handleNewFeeRecipientChange}
              sx={{ marginTop: 2 }}
              label="New Fee Recipient"
              error={
                newFeeRecipient !== "" &&
                (!isValidEcdsaPubkey(newFeeRecipient) ||
                  newFeeRecipient === burnAddress)
              }
              helperText={
                newFeeRecipient === ""
                  ? "The fee recipient is the address where the validator will send the fees"
                  : !isValidEcdsaPubkey(newFeeRecipient)
                  ? "Invalid address"
                  : newFeeRecipient === burnAddress
                  ? "It is not possible to set the fee recipient to the burn address"
                  : "Address is valid"
              }
              value={newFeeRecipient}
            />
            {!areAllSelectedFeeRecipientsEditable() && (
              <Alert severity="info">
                This will only apply to the editable fee recipients
              </Alert>
            )}
            {isNewFrSameAsAllOldFrs() && (
              <Alert severity="info">
                This fee recipient has already been set to all selected
                validators
              </Alert>
            )}
            {successMessage && (
              <Alert severity="success" variant="filled" sx={{ marginTop: 2 }}>
                {successMessage}
              </Alert>
            )}
            {errorMessage && (
              <Alert severity="error" variant="filled" sx={{ marginTop: 2 }}>
                {errorMessage}
              </Alert>
            )}
          </Box>
        </DialogContent>
        {!loading ? (
          <DialogActions>
            {!errorMessage && (
              <Button
                onClick={() => updateFeeRecipients(newFeeRecipient)}
                variant="contained"
                sx={{ margin: 2, borderRadius: 2 }}
                disabled={
                  !isValidEcdsaPubkey(newFeeRecipient) ||
                  newFeeRecipient === burnAddress ||
                  isNewFrSameAsAllOldFrs()
                }
              >
                Apply changes
              </Button>
            )}
            <Button
              onClick={handleClose}
              variant="outlined"
              sx={{ margin: 2, borderRadius: 2 }}
            >
              Close
            </Button>
          </DialogActions>
        ) : (
          <WaitBox />
        )}
      </>
    </Dialog>
  );
}
