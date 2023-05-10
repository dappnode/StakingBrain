//External components
import {
  Alert,
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormGroup,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { GridSelectionModel } from "@mui/x-data-grid";
import {
  CustomValidatorGetResponse,
  BURN_ADDRESS,
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
  mevSpAddress,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  rows: CustomValidatorGetResponse[];
  selectedRows: GridSelectionModel;
  mevSpAddress: string;
}): JSX.Element {
  const [newFeeRecipient, setNewFeeRecipient] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMevSpAddressSelected, setIsMevSpAddressSelected] = useState(false);

  const handleClose = () => {
    setOpen(false);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSubscriptionClick = async () => {
    try {
      await updateValidators();
      window.open("https://dappnode-mev-pool.vercel.app/", "_blank");
      setOpen(false);
    } catch (err) {
      setErrorMessage(
        "There was an error setting the Dappnode MEV Smoothing Pool Fee Recipient to some validators: " +
          err
      );
    }
  };

  const handleUnsubscriptionClick = async () => {
    window.open("https://dappnode-mev-pool.vercel.app/", "_blank");
  };

  const handleNewFeeRecipientChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!isMevSpAddressSelected && event.target.value === mevSpAddress) {
      switchSetMevSpAddress();
    } else {
      setNewFeeRecipient(event.target.value);
    }
  };

  const switchSetMevSpAddress = () => {
    if (isMevSpAddressSelected) {
      setNewFeeRecipient("");
      setIsMevSpAddressSelected(false);
    } else {
      setNewFeeRecipient(mevSpAddress);
      setIsMevSpAddressSelected(true);
    }
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

  async function updateValidators() {
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
    await api.updateValidators(validatorsData);
  }

  const handleApplyChanges = async () => {
    setLoading(true);

    try {
      await updateValidators();
    } catch (err) {
      setErrorMessage(
        "There was an error updating some fee recipients: " + err
      );
    }

    setLoading(false);

    if (!errorMessage) {
      setSuccessMessage("Fee recipients updated successfully");
    }
  };

  function areAllSelectedFeeRecipientsEditable() {
    const selectedTags = selectedRows
      .map((rowId) => rows[parseInt(rowId.toString())].tag)
      .flat();

    return areAllFeeRecipientsEditable(selectedTags);
  }

  function isNewFrSameAsAllOldFrs() {
    const oldFeeRecipients = selectedRows
      .map((rowId) => rows[parseInt(rowId.toString())].feeRecipient)
      .flat();

    console.log(oldFeeRecipients);

    return oldFeeRecipients.every((fr) => fr === newFeeRecipient);
  }

  function isRemovingMevSpFr() {
    const oldFeeRecipients = selectedRows
      .map((rowId) => rows[parseInt(rowId.toString())].feeRecipient)
      .flat();

    return oldFeeRecipients.includes(mevSpAddress) && isNewFeeRecipientValid() && newFeeRecipient !== mevSpAddress;
  }

  function isNewFeeRecipientValid() {
    return (
      isValidEcdsaPubkey(newFeeRecipient) && newFeeRecipient !== BURN_ADDRESS
    );
  }

  function SubscriptionCard(): JSX.Element {
    return (
      // TODO: Set proper link to the Dappnode Smoothing Pool
      <Card sx={{ boxShadow: 2, borderRadius: 2, padding: 2, marginTop: 1 }}>
        <Alert severity="info">
          You are setting the fee recipient to the MEV Smoothing Pool Address.
          Doing this will mean that you will be <b>automatically subscribed</b>{" "}
          to the Dappnode Smoothing Pool{" "}
          <b>after you propose your first block</b>. If you want to{" "}
          <b>start generating rewards now</b>,{" "}
          <b>subscribe your validators manually </b> to the Smoothing Pool here:
        </Alert>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            marginTop: 1,
          }}
        >
          <Button
            variant="contained"
            sx={{ borderRadius: 2, marginLeft: 1 }}
            onClick={handleSubscriptionClick}
          >
            Subscribe Now
          </Button>
        </Box>
      </Card>
    );
  }

  function UnsubscribeCard(): JSX.Element {
    return (
      <Card sx={{ boxShadow: 2, borderRadius: 2, padding: 2, marginTop: 1 }}>
        <Alert severity="warning">
          You are removing the Dappnode MEV Smoothing Pool fee recipient from
          some validators. If you want to{" "}
          <b>avoid being banned from the pool</b> for the future, please
          <b>unsubscribe</b> here:
        </Alert>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            marginTop: 1,
          }}
        >
          <Button
            variant="contained"
            sx={{ borderRadius: 2, marginLeft: 1 }}
            onClick={handleUnsubscriptionClick}
          >
            Unsubscribe Now
          </Button>
        </Box>
      </Card>
    );
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
              error={!isNewFeeRecipientValid() && newFeeRecipient !== ""}
              helperText={
                newFeeRecipient === ""
                  ? "The fee recipient is the address where the validator will send the fees"
                  : !isValidEcdsaPubkey(newFeeRecipient)
                  ? "Invalid address"
                  : newFeeRecipient === BURN_ADDRESS
                  ? "It is not possible to set the fee recipient to the burn address"
                  : "Address is valid"
              }
              value={newFeeRecipient}
              disabled={isMevSpAddressSelected}
            />
            <FormGroup
              sx={{ marginTop: 1, display: "flex", alignContent: "center" }}
            >
              <FormControlLabel
                control={<Switch onChange={() => switchSetMevSpAddress()} />}
                label={
                  <Typography component="div">
                    Set <b>Dappnode MEV Smoothing Pool</b> Fee Recipient
                  </Typography>
                }
                checked={isMevSpAddressSelected}
              />
            </FormGroup>
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
            {isRemovingMevSpFr() && <UnsubscribeCard />}
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
            {newFeeRecipient === mevSpAddress && !isNewFrSameAsAllOldFrs() && (
              <SubscriptionCard />
            )}
          </Box>
        </DialogContent>
        {!loading ? (
          <DialogActions>
            {!errorMessage && (
              <Button
                onClick={() => handleApplyChanges()}
                variant="contained"
                sx={{ borderRadius: 2 }}
                disabled={!isNewFeeRecipientValid() || isNewFrSameAsAllOldFrs()}
              >
                Apply changes
              </Button>
            )}
            <Button
              onClick={handleClose}
              variant="outlined"
              sx={{ borderRadius: 2 }}
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
