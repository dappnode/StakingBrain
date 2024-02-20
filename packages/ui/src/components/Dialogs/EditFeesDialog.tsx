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
  Network,
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
import { getSmoothUrlByNetwork } from "../../params";
import { getSmoothAddressByNetwork } from "../../utils/addresses";

export default function FeeRecipientDialog({
  open,
  setOpen,
  rows,
  selectedRows,
  network,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  rows: CustomValidatorGetResponse[];
  selectedRows: GridSelectionModel;
  network: Network;
}): JSX.Element {
  const [newFeeRecipient, setNewFeeRecipient] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMevSpAddressSelected, setIsMevSpAddressSelected] = useState(false);
  const [activeStep, setActiveStep] = React.useState(0);
  const [isUnsubUnderstood, setIsUnsubUnderstood] = useState(false);
  const [nonEcdsaValidatorsData, setNonEcdsaValidatorsData] = useState<
    NonEcdsaValidatorsData[]
  >([]);
  const [smoothValidatorsPubkeys, setSmoothValidatorsPubkeys] = useState<
    string[]
  >([]);

  useEffect(() => {
    isAnyWithdrawalCredentialsDiff("ecdsa") && getNonEcdsaValidatorsData();
    getSmoothValidatorsSelected();
  }, [selectedRows]);

  const mevSpAddress = getSmoothAddressByNetwork(network);
  const smoothUrl = getSmoothUrlByNetwork(network);

  const handleClose = () => {
    setOpen(false);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleSubscriptionClick = async () => {
    try {
      window.open(smoothUrl, "_blank");
      await updateValidators();
      setOpen(false);
    } catch (err) {
      setErrorMessage(
        "There was an error setting the Smooth Fee Recipient to some validators: " +
          err
      );
    }
  };

  const handleUnsubscriptionClick = async () => {
    window.open(smoothUrl, "_blank");
  };

  const handleNewFeeRecipientChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (
      mevSpAddress &&
      !isMevSpAddressSelected &&
      event.target.value.toLowerCase() === mevSpAddress.toLocaleLowerCase()
    ) {
      switchSetMevSpAddress();
    } else {
      setNewFeeRecipient(event.target.value);
    }
  };

  const switchSetMevSpAddress = () => {
    if (mevSpAddress) {
      if (isMevSpAddressSelected) {
        setNewFeeRecipient("");
        setIsMevSpAddressSelected(false);
      } else {
        setNewFeeRecipient(mevSpAddress);
        setIsMevSpAddressSelected(true);
      }
    } else {
      console.error(
        "Error: Tried to switch Smooth's address in a network that doesn't have it"
      );
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
      const row = rows[+rowId];

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
    const selectedTags = selectedRows.map((rowId) => rows[+rowId].tag).flat();

    return areAllFeeRecipientsEditable(selectedTags);
  }

  function areAllOldFrsSameAsGiven(givenFr: string) {
    const oldFeeRecipients = selectedRows
      .map((rowId) => rows[+rowId].feeRecipient)
      .flat();

    return oldFeeRecipients.every((fr) => fr === givenFr);
  }
  function isRemovingMevSpFr() {
    const oldFeeRecipients = selectedRows
      .map((rowId) => rows[+rowId].feeRecipient)
      .flat();

    return (
      mevSpAddress !== null &&
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

  const isAnyWithdrawalCredentialsEqual = (
    givenFormat: WithdrawalCredentialsFormat
  ): boolean => {
    let isAnyAsGivenFormat = false;
    for (const row of selectedRows) {
      const rowData = rows[+row];
      const withdrawalFormat = rowData.withdrawalCredentials.format;
      if (withdrawalFormat === givenFormat) {
        isAnyAsGivenFormat = true;
        break;
      }
    }
    return isAnyAsGivenFormat;
  };

  const isAnyWithdrawalCredentialsDiff = (
    givenFormat: WithdrawalCredentialsFormat
  ): boolean => {
    let isAnyAsGivenFormat = false;
    for (const row of selectedRows) {
      const rowData = rows[+row];
      const withdrawalFormat = rowData.withdrawalCredentials.format;
      if (withdrawalFormat !== givenFormat) {
        isAnyAsGivenFormat = true;
        break;
      }
    }
    return isAnyAsGivenFormat;
  };

  const getSmoothValidatorsSelected = (): void => {
    const smoothValidatorsPubkeys: string[] = selectedRows
      .map((row) => {
        const rowData = rows[+row];
        return rowData.feeRecipient === mevSpAddress ? rowData.pubkey : null;
      })
      .filter((pubkey): pubkey is string => pubkey !== null);

    setSmoothValidatorsPubkeys(smoothValidatorsPubkeys);
  };

  const getNonEcdsaValidatorsData = (): void => {
    const filteredValidators = selectedRows
      .map((row) => {
        const rowData = rows[+row];
        return rowData.withdrawalCredentials.format !== "ecdsa"
          ? {
              pubkey: rowData.pubkey,
              withdrawalFormat: rowData.withdrawalCredentials.format,
            }
          : null;
      })
      .filter((item) => item !== null) as NonEcdsaValidatorsData[];

    setNonEcdsaValidatorsData(filteredValidators);
  };

  function SubscriptionCard(): JSX.Element {
    return (
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
            <Switch onChange={() => setIsUnsubUnderstood(!isUnsubUnderstood)} />
          }
          label={
            <Typography component="div">
              By checking this I understand that being subscribed to Smooth
              while having a wrong fee recipient can result in my validators
              getting banned from it.
            </Typography>
          }
          checked={isUnsubUnderstood}
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
          <Alert severity="warning" sx={{ marginY: 1 }}>
            This will only apply to the editable fee recipients
          </Alert>
        );

      case "feeAlreadySetToAllAlert":
        return (
          <Alert severity="warning" sx={{ marginY: 1 }}>
            This fee recipient has already been set to all selected validators
          </Alert>
        );

      case "subSmoothStep1Alert":
        return (
          <Alert severity="info" sx={{ marginY: 1 }}>
            You are setting the fee recipient to the Smooth Address. Doing this
            will mean that you will be <b>automatically subscribed</b> to Smooth{" "}
            <b>after you propose your next block</b>.
          </Alert>
        );

      case "subSmoothStep2Alert":
        return (
          <Alert severity="info" sx={{ marginY: 2 }}>
            You have successfully changed your fee recipient to Smooth. Your
            validator will be{" "}
            <b>automatically subscribed once it proposes a block</b>.
            <p>
              To start accumulating rewards right now, <b>subscribe manually</b>{" "}
              through{" "}
              <a href={getSmoothUrlByNetwork(network)} target="_blank">
                <b>Smooth's webpage!</b>
              </a>
            </p>
          </Alert>
        );

      case "unsubSmoothAlert":
        return (
          <Alert severity="warning" sx={{ marginY: 1 }}>
            You are removing Smooth's fee recipient from <b>1 or more</b>{" "}
            validators.{" "}
            <b>
              Please make sure all these validators are not subscribed to Smooth
              before changing the fee recipient.
            </b>{" "}
            Unsubscribing from Smooth can be done in Smooth's website.
          </Alert>
        );

      case "alreadySmoothAlert":
        return (
          <Alert severity="warning" sx={{ marginY: 1 }}>
            1 or more of the selected validators{" "}
            <b>already have Smooth's fee recipient set</b>. For those
            validators, the fee recipient won't updated. Their public keys are:
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
          <Alert severity="error" sx={{ marginY: 1 }}>
            Some of the selected validators have an{" "}
            <b>incorrect withdrawal address format</b>. In Smooth, only
            validators with an ETH1 withdrawal address are permitted to join.
            The validators with an incorrect withdrawal address are:
            <ul>
              {nonEcdsaValidatorsData
                .filter((validator) => validator.withdrawalFormat !== "error")
                .map((validator) => (
                  <li>
                    <b>{validator.withdrawalFormat.toUpperCase() + ": "}</b>
                    {validator.pubkey.substring(0, 20) +
                      "..." +
                      validator.pubkey.substring(validator.pubkey.length - 20)}
                  </li>
                ))}
            </ul>
            <p>
              Check how to change from BLS to ETH1{" "}
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
          <Alert severity="error" sx={{ marginY: 1 }}>
            {
              nonEcdsaValidatorsData.filter(
                (validator) => validator.withdrawalFormat === "error"
              ).length
            }{" "}
            of the selected validators' withdrawal address format could not be
            checked. Please,{" "}
            <b>make sure your consensus client is up and working!</b> This may
            also happen if some validators are new to the chain. Affected
            validator's public keys:
            <ul>
              {nonEcdsaValidatorsData
                .filter((validator) => validator.withdrawalFormat === "error")
                .map((validator) => (
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
          {mevSpAddress &&
            isMevSpAddressSelected &&
            !isAnyWithdrawalCredentialsDiff("ecdsa") && (
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
                  (isAnyWithdrawalCredentialsDiff("ecdsa") &&
                    newFeeRecipient === mevSpAddress)
                }
                helperText={
                  newFeeRecipient === ""
                    ? "The fee recipient is the address where the validator will send the fees"
                    : !isValidEcdsaPubkey(newFeeRecipient)
                    ? "Invalid address"
                    : newFeeRecipient === BURN_ADDRESS
                    ? "It is not possible to set the fee recipient to the burn address"
                    : mevSpAddress &&
                      isMevSpAddressSelected &&
                      isAnyWithdrawalCredentialsDiff("ecdsa")
                    ? "Smooth Fee Recipient is not valid for some of these validators"
                    : "Address is valid"
                }
                value={newFeeRecipient}
                disabled={isMevSpAddressSelected}
              />

              <FormGroup
                sx={{ marginTop: 1, display: "flex", alignContent: "center" }}
              >
                {mevSpAddress && (
                  <>
                    {!areAllOldFrsSameAsGiven(mevSpAddress) && (
                      <FormControlLabel
                        control={
                          <Switch onChange={() => switchSetMevSpAddress()} />
                        }
                        label={
                          <Typography component="div">
                            Set <b>Smooth</b> Fee Recipient
                          </Typography>
                        }
                        checked={isMevSpAddressSelected}
                      />
                    )}
                  </>
                )}
              </FormGroup>
              {!areAllSelectedFeeRecipientsEditable() &&
                alertCard("onlyEditableFeesAlert")}
              {areAllOldFrsSameAsGiven(newFeeRecipient) &&
                alertCard("feeAlreadySetToAllAlert")}
              {successMessage && alertCard("successAlert")}
              {errorMessage && alertCard("errorAlert")}
              {mevSpAddress && (
                <>
                  {isRemovingMevSpFr() && <UnsubscribeCard />}
                  {smoothValidatorsPubkeys.length > 0 &&
                    isMevSpAddressSelected &&
                    alertCard("alreadySmoothAlert")}
                  {isAnyWithdrawalCredentialsEqual("error") &&
                    isMevSpAddressSelected &&
                    alertCard("errorFormatAlert")}
                  {isMevSpAddressSelected &&
                    (isAnyWithdrawalCredentialsEqual("bls") ||
                      isAnyWithdrawalCredentialsEqual("unknown")) &&
                    alertCard("blsFormatAlert")}

                  {isMevSpAddressSelected &&
                    !areAllOldFrsSameAsGiven(newFeeRecipient) &&
                    !isAnyWithdrawalCredentialsDiff("ecdsa") &&
                    alertCard("subSmoothStep1Alert")}
                </>
              )}
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
                (mevSpAddress !== null && isRemovingMevSpFr() && !isUnsubUnderstood) ||
                (isAnyWithdrawalCredentialsDiff("ecdsa") &&
                  isMevSpAddressSelected)
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
