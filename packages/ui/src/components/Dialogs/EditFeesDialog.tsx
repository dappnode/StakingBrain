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
  Stepper,
  Step,
  StepLabel,
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
  const [activeStep, setActiveStep] = React.useState(0);

  const handleClose = () => {
    setOpen(false);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSubscriptionClick = async () => {
    try {
      await updateValidators();
      window.open("https://smooth.dappnode.io/", "_blank");
      setOpen(false);
    } catch (err) {
      setErrorMessage(
        "There was an error setting the Dappnode MEV Smoothing Pool Fee Recipient to some validators: " +
          err
      );
    }
  };

  const handleUnsubscriptionClick = async () => {
    window.open("https://smooth.dappnode.io/", "_blank");
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
      isMevSpAddressSelected && setActiveStep(1);
    }
  };

  function areAllSelectedFeeRecipientsEditable() {
    const selectedTags = selectedRows
      .map((rowId) => rows[parseInt(rowId.toString())].tag)
      .flat();

    return areAllFeeRecipientsEditable(selectedTags);
  }

  function areAllOldFrsSameAsGiven(givenFr: string) {
    const oldFeeRecipients = selectedRows
      .map((rowId) => rows[parseInt(rowId.toString())].feeRecipient)
      .flat();

    console.log(oldFeeRecipients);
    return oldFeeRecipients.every((fr) => fr === givenFr);
  }
  function isRemovingMevSpFr() {
    const oldFeeRecipients = selectedRows
      .map((rowId) => rows[parseInt(rowId.toString())].feeRecipient)
      .flat();

    return (
      oldFeeRecipients.includes(mevSpAddress) &&
      isNewFeeRecipientValid() &&
      newFeeRecipient !== mevSpAddress
    );
  }

  function isNewFeeRecipientValid() {
    return (
      isValidEcdsaPubkey(newFeeRecipient) && newFeeRecipient !== BURN_ADDRESS
    );
  }

  function SubscriptionCard(): JSX.Element {
    return (
      // TODO: Set proper link to the Dappnode Smoothing Pool
      <>
        <Alert severity="info" sx={{ marginY: 2 }}>
          You have successfully changed your fee recipient to smooth. Your
          validator will be{" "}
          <b>automatically subscribed once it proposes a block</b>.
          <p>
            To start accumulating rewards right now, <b>subscribe manually</b>{" "}
            through{" "}
            <a href="https://smooth.dappnode.io/" target="_blank">
              <b>Smooth's webpage!</b>
            </a>
          </p>
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
            Take me to Smooth Website!
          </Button>
        </Box>
      </>
    );
  }

  function UnsubscribeCard(): JSX.Element {
    return (
      <Card sx={{ boxShadow: 2, borderRadius: 2, padding: 2, marginTop: 1 }}>
        <Alert severity="warning">
          You are removing Smooth's fee recipient from some validators. Please
          make sure you have already <b>manually unsubscribed</b> all selected
          validators in Smooth's website to avoid getting banned from Smooth.
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
            Take me to Smooth's website
          </Button>
        </Box>
      </Card>
    );
  }

  const joinSpSteps = ["Edit Fee Recipient", "Subscribe manually (optional)"];

  function step1Card(): JSX.Element {
    return (
      <>
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
          {!areAllOldFrsSameAsGiven(mevSpAddress) && (
            <FormControlLabel
              control={<Switch onChange={() => switchSetMevSpAddress()} />}
              label={
                <Typography component="div">
                  Set <b>Dappnode MEV Smoothing Pool</b> Fee Recipient
                </Typography>
              }
              checked={isMevSpAddressSelected}
            />
          )}
        </FormGroup>
        {!areAllSelectedFeeRecipientsEditable() && (
          <Alert severity="info">
            This will only apply to the editable fee recipients
          </Alert>
        )}
        {areAllOldFrsSameAsGiven(newFeeRecipient) && (
          <Alert severity="info">
            This fee recipient has already been set to all selected validators
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
        {newFeeRecipient === mevSpAddress &&
          !areAllOldFrsSameAsGiven(newFeeRecipient) && (
            <Alert severity="info">
              You are setting the fee recipient to the MEV Smoothing Pool
              Address. Doing this will mean that you will be{" "}
              <b>automatically subscribed</b> to the Dappnode Smoothing Pool{" "}
              <b>after you propose your first block</b>.
            </Alert>
          )}
      </>
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
      <DialogContent>
        <Box sx={importDialogBoxStyle}>
          {isMevSpAddressSelected && (
            <Stepper activeStep={activeStep} alternativeLabel>
              {joinSpSteps.map((label, i) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          )}
          {activeStep === 0
            ? step1Card()
            : activeStep === 1 && <SubscriptionCard />}
        </Box>
      </DialogContent>
      {!loading ? (
        <DialogActions>
          {!errorMessage && activeStep === 0 && (
            <Button
              onClick={() => handleApplyChanges()}
              variant="contained"
              sx={{ borderRadius: 2 }}
              disabled={
                !isNewFeeRecipientValid() ||
                areAllOldFrsSameAsGiven(newFeeRecipient)
              }
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
    </Dialog>
  );
}
