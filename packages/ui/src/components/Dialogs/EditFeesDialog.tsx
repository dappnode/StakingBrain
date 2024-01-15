//External components
import {
  Alert,
  Box,
  Button,
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
  WithdrawalCredentialsFormat,
} from "@stakingbrain/common";
import React from "react";

//Logic
import { useEffect, useState } from "react";
import { api } from "../../api";

//Styles
import { importDialogBoxStyle } from "../../Styles/dialogStyles";
import WaitBox from "../WaitBox/WaitBox";
import { SlideTransition } from "./Transitions";
import { AlertType, NonEcdsaValidatorsData } from "../../types";

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
  const [isUnsubUndestood, setIsUnsubUndestood] = useState(false);
  const [NonEcdsaValidatorsData, setNonEcdsaValidatorsData] = useState<
    NonEcdsaValidatorsData[]
  >([]);
  const [smoothValidatorsPubkeys, setSmoothValidatorsPubkeys] = useState<
    string[]
  >([]);

  useEffect(() => {
    console.log(smoothValidatorsPubkeys);
  });

  useEffect(() => {
    isAnyFormatValidatorSelected({
      givenFormat: "ecdsa",
      checkEquality: false,
    }) && nonEcdsaValidatorsData();
    getSmoothValidatorsSelected();
  }, [selectedRows]);

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

  const isAnyFormatValidatorSelected = ({
    givenFormat,
    checkEquality,
  }: {
    givenFormat: WithdrawalCredentialsFormat;
    checkEquality: boolean;
  }): boolean => {
    let isAnyGiven = false;
    for (const row of selectedRows) {
      const withdrawalFormat =
        rows[parseInt(row.toString())].withdrawalCredentials.format;
      if (
        checkEquality
          ? withdrawalFormat === givenFormat
          : withdrawalFormat !== givenFormat
      ) {
        isAnyGiven = true;
        break;
      }
    }
    return isAnyGiven;
  };

  const getSmoothValidatorsSelected = () => {
    const auxList: string[] = [];
    selectedRows.forEach((row) => {
      rows[parseInt(row.toString())].feeRecipient === mevSpAddress &&
        auxList.push(rows[parseInt(row.toString())].pubkey);
    });
    setSmoothValidatorsPubkeys(auxList);
  };

  const nonEcdsaValidatorsData = () => {
    const auxList: NonEcdsaValidatorsData[] = [];
    selectedRows.forEach((row) => {
      rows[parseInt(row.toString())].withdrawalCredentials.format !== "ecdsa" &&
        auxList.push({
          pubkey: rows[parseInt(row.toString())].pubkey,
          withdrawalFormat:
            rows[parseInt(row.toString())].withdrawalCredentials.format,
        });
    });
    setNonEcdsaValidatorsData([...auxList]);
  };

  function SubscriptionCard(): JSX.Element {
    return (
      // TODO: Set proper link to the Dappnode Smoothing Pool
      <>
        {alertCard("subSmoothStep2Alert")}
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
      <>
        {alertCard("unsubSmoothAlert")}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            marginY: 3,
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
        <FormControlLabel
          control={
            <Switch onChange={() => setIsUnsubUndestood(!isUnsubUndestood)} />
          }
          label={
            <Typography component="div">
              By checking this I understand that I have to{" "}
              <b>unsuscribe manually in order to not get banned</b> from
              Dappnode MEV Smoothing Pool.
            </Typography>
          }
          checked={isUnsubUndestood}
        />
      </>
    );
  }

  const joinSpSteps = ["Edit Fee Recipient", "Subscribe manually (optional)"];

  function alertCard(alertType: AlertType): JSX.Element {
    switch (alertType) {
      case "successAlert":
        return (
          <Alert severity="success" variant="filled" sx={{ marginY: 1 }}>
            {successMessage}
          </Alert>
        );

      case "errorAlert":
        return (
          <Alert severity="error" variant="filled" sx={{ marginY: 1 }}>
            {errorMessage}
          </Alert>
        );

      case "onlyEditableFeesAlert":
        return (
          <Alert severity="info" sx={{ marginY: 1 }}>
            This will only apply to the editable fee recipients
          </Alert>
        );

      case "feeAlreadySetToAllAlert":
        return (
          <Alert severity="info" sx={{ marginY: 1 }}>
            This fee recipient has already been set to all selected validators
          </Alert>
        );

      case "subSmoothStep1Alert":
        return (
          <Alert severity="info" sx={{ marginY: 1 }}>
            You are setting the fee recipient to the MEV Smoothing Pool Address.
            Doing this will mean that you will be{" "}
            <b>automatically subscribed</b> to the Dappnode Smoothing Pool{" "}
            <b>after you propose your first block</b>.
          </Alert>
        );

      case "subSmoothStep2Alert":
        return (
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
        );

      case "unsubSmoothAlert":
        return (
          <Alert severity="warning" sx={{ marginY: 1 }}>
            You are removing Smooth's fee recipient from some validators. Please
            make sure you have already <b>manually unsubscribed</b> all selected
            validators in Smooth's website to avoid getting banned from Smooth.
          </Alert>
        );

      case "alreadySmoothAlert":
        return (
          <Alert severity="info" sx={{ marginY: 1 }}>
            At least one of the selected validators{" "}
            <b>already have the Dappnode MEV Smoothing Pool fee recipient</b>.
            For those validators their fee recipient won't updated, whose public
            keys are:
            <ul>
              {smoothValidatorsPubkeys.map((pubkey) => (
                <li>
                  {pubkey.substring(0, 20) +
                    "..." +
                    pubkey.substring(pubkey.length - 20)}
                </li>
              ))}
            </ul>
          </Alert>
        );

      case "blsFormatAlert":
        return (
          <Alert severity="warning" sx={{ marginY: 1 }}>
            {
              NonEcdsaValidatorsData.filter(
                (validator) => validator.withdrawalFormat !== "error"
              ).length
            }{" "}
            of the selected validators has not ETH1 as withdrawal address
            format. <b>Dappnode MEV Smoothing Pool</b> does not allow those to
            join, whose public keys are:
            <ul>
              {NonEcdsaValidatorsData.filter(
                (validator) => validator.withdrawalFormat !== "error"
              ).map((validator) => (
                <li>
                  <b>{validator.withdrawalFormat.toUpperCase() + ": "}</b>
                  {validator.pubkey.substring(0, 20) +
                    "..." +
                    validator.pubkey.substring(validator.pubkey.length - 20)}
                </li>
              ))}
            </ul>
            <p>
              You may check how to change from BLS to ETH1{" "}
              <b>
                <a
                  href="https://launchpad.ethereum.org/en/btec/"
                  target="_blank"
                >
                  here
                </a>
              </b>
              !
            </p>
          </Alert>
        );

      case "errorFormatAlert":
        return (
          <Alert severity="warning" sx={{ marginY: 1 }}>
            {
              NonEcdsaValidatorsData.filter(
                (validator) => validator.withdrawalFormat === "error"
              ).length
            }{" "}
            of the selected validators' withdrawal address format could not been
            checked. Please, make sure your <b>consensus client</b> is up and
            working! Those validators' public keys are:
            <ul>
              {NonEcdsaValidatorsData.filter(
                (validator) => validator.withdrawalFormat === "error"
              ).map((validator) => (
                <li>
                  {validator.pubkey.substring(0, 20) +
                    "..." +
                    validator.pubkey.substring(validator.pubkey.length - 20)}
                </li>
              ))}
            </ul>
          </Alert>
        );
    }
  }

  function modalContent(): JSX.Element {
    return (
      <DialogContent>
        <Box sx={importDialogBoxStyle}>
          {isMevSpAddressSelected &&
            !isAnyFormatValidatorSelected({
              givenFormat: "ecdsa",
              checkEquality: false,
            }) && (
              <Stepper activeStep={activeStep} alternativeLabel>
                {joinSpSteps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            )}
          {activeStep === 0 ? (
            <>
              <TextField
                onChange={handleNewFeeRecipientChange}
                sx={{ marginTop: 2 }}
                label="New Fee Recipient"
                error={
                  (!isNewFeeRecipientValid() && newFeeRecipient !== "") ||
                  (isAnyFormatValidatorSelected({
                    givenFormat: "ecdsa",
                    checkEquality: false,
                  }) &&
                    newFeeRecipient === mevSpAddress)
                }
                helperText={
                  newFeeRecipient === ""
                    ? "The fee recipient is the address where the validator will send the fees"
                    : !isValidEcdsaPubkey(newFeeRecipient)
                    ? "Invalid address"
                    : newFeeRecipient === BURN_ADDRESS
                    ? "It is not possible to set the fee recipient to the burn address"
                    : isAnyFormatValidatorSelected({
                        givenFormat: "ecdsa",
                        checkEquality: false,
                      }) && newFeeRecipient === mevSpAddress
                    ? "Dappnode Mev Smoothing Pool Fee Recipient is not valid for some of these validators"
                    : "Address is valid"
                }
                value={newFeeRecipient}
                disabled={isMevSpAddressSelected}
              />

              <FormGroup
                sx={{ marginTop: 1, display: "flex", alignContent: "center" }}
              >
                {!areAllOldFrsSameAsGiven(mevSpAddress) && (
                  <>
                    <FormControlLabel
                      control={
                        <Switch onChange={() => switchSetMevSpAddress()} />
                      }
                      label={
                        <Typography component="div">
                          Set <b>Dappnode MEV Smoothing Pool</b> Fee Recipient
                        </Typography>
                      }
                      checked={isMevSpAddressSelected}
                    />
                    {isAnyFormatValidatorSelected({
                      givenFormat: "error",
                      checkEquality: true,
                    }) && alertCard("errorFormatAlert")}
                    {isMevSpAddressSelected &&
                      (isAnyFormatValidatorSelected({
                        givenFormat: "bls",
                        checkEquality: true,
                      }) ||
                        isAnyFormatValidatorSelected({
                          givenFormat: "unknown",
                          checkEquality: true,
                        })) &&
                      alertCard("blsFormatAlert")}
                  </>
                )}
                {smoothValidatorsPubkeys.length > 0 &&
                  newFeeRecipient === mevSpAddress &&
                  alertCard("alreadySmoothAlert")}
              </FormGroup>
              {isRemovingMevSpFr() && <UnsubscribeCard />}
              {!areAllSelectedFeeRecipientsEditable() &&
                alertCard("onlyEditableFeesAlert")}
              {areAllOldFrsSameAsGiven(newFeeRecipient) &&
                alertCard("feeAlreadySetToAllAlert")}
              {successMessage && alertCard("successAlert")}
              {errorMessage && alertCard("errorAlert")}
              {newFeeRecipient === mevSpAddress &&
                !areAllOldFrsSameAsGiven(newFeeRecipient) &&
                !isAnyFormatValidatorSelected({
                  givenFormat: "ecdsa",
                  checkEquality: false,
                }) &&
                alertCard("subSmoothStep1Alert")}
            </>
          ) : (
            <SubscriptionCard />
          )}
        </Box>
      </DialogContent>
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
      {modalContent()}
      {!loading ? (
        <DialogActions>
          {!errorMessage && activeStep === 0 && (
            <Button
              onClick={() => handleApplyChanges()}
              variant="contained"
              sx={{ borderRadius: 2 }}
              disabled={
                !isNewFeeRecipientValid() ||
                areAllOldFrsSameAsGiven(newFeeRecipient) ||
                (isRemovingMevSpFr() && !isUnsubUndestood) ||
                (isAnyFormatValidatorSelected({
                  givenFormat: "ecdsa",
                  checkEquality: false,
                }) &&
                  newFeeRecipient === mevSpAddress)
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
