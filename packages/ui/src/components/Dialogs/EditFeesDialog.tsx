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
  Tooltip,
  Checkbox
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { GridSelectionModel } from "@mui/x-data-grid";
import {
  CustomValidatorGetResponse,
  BURN_ADDRESS,
  isValidEcdsaPubkey,
  CustomValidatorUpdateRequest,
  areAllFeeRecipientsEditable,
  WithdrawalCredentialsFormat,
  Network
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
import { getSmoothUrlByNetwork, getStakersLink } from "../../params";
import { getSmoothAddressByNetwork } from "../../utils/addresses";

export default function FeeRecipientDialog({
  open,
  setOpen,
  rows,
  selectedRows,
  network,
  isMevBoostSet
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  rows: CustomValidatorGetResponse[];
  selectedRows: GridSelectionModel;
  network: Network;
  isMevBoostSet: boolean;
}): JSX.Element {
  const [newFeeRecipient, setNewFeeRecipient] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isMevSpAddressSelected, setIsMevSpAddressSelected] = useState(false);
  const [activeStep, setActiveStep] = React.useState(0);
  const [isUnsubUnderstood, setIsUnsubUnderstood] = useState(false);
  const [nonEcdsaValidatorsData, setNonEcdsaValidatorsData] = useState<NonEcdsaValidatorsData[]>([]);
  const [smoothValidatorsPubkeys, setSmoothValidatorsPubkeys] = useState<string[]>([]);
  const [withdrawalAccessCheck, setWithdrawalAccessCheck] = useState(false);

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
      setErrorMessage("There was an error setting the Smooth Fee Recipient to some validators: " + err);
    }
  };

  const handleUnsubscriptionClick = async () => {
    window.open(smoothUrl, "_blank");
  };

  const handleNewFeeRecipientChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
      console.error("Error: Tried to switch Smooth's address in a network that doesn't have it");
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
          feeRecipient: newFeeRecipient
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
      setErrorMessage("There was an error updating some fee recipients: " + err);
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
    const oldFeeRecipients = selectedRows.map((rowId) => rows[+rowId].feeRecipient).flat();

    return oldFeeRecipients.every((fr) => fr === givenFr);
  }
  function isRemovingMevSpFr() {
    const oldFeeRecipients = selectedRows.map((rowId) => rows[+rowId].feeRecipient).flat();

    return (
      mevSpAddress !== null &&
      oldFeeRecipients.includes(mevSpAddress) &&
      isNewFeeRecipientValid() &&
      newFeeRecipient !== mevSpAddress
    );
  }

  function isNewFeeRecipientValid() {
    return isValidEcdsaPubkey(newFeeRecipient) && newFeeRecipient !== BURN_ADDRESS;
  }

  // Given a possible withdrawal credentials format, checks if any of the selected validators has it
  const isAnyWithdrawalCredentialsEqual = (givenFormat: WithdrawalCredentialsFormat): boolean => {
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

  // Given a possible withdrawal credentials format, checks if any of the selected validators has a different format
  const isAnyWithdrawalCredentialsDiff = (givenFormat: WithdrawalCredentialsFormat): boolean => {
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

  // Update the smoothValidatorsPubkeys state with the selected validators that have Smooth's fee recipient
  const getSmoothValidatorsSelected = (): void => {
    const smoothValidatorsPubkeys: string[] = selectedRows
      .map((row) => {
        const rowData = rows[+row];
        return rowData.feeRecipient === mevSpAddress ? rowData.pubkey : null;
      })
      .filter((pubkey): pubkey is string => pubkey !== null);

    setSmoothValidatorsPubkeys(smoothValidatorsPubkeys);
  };

  // Update the nonEcdsaValidatorsData state with the selected validators that have a withdrawal address format different from ecdsa
  const getNonEcdsaValidatorsData = (): void => {
    const filteredValidators = selectedRows
      .map((row) => {
        const rowData = rows[+row];
        return rowData.withdrawalCredentials.format !== "ecdsa"
          ? {
              pubkey: rowData.pubkey,
              withdrawalFormat: rowData.withdrawalCredentials.format
            }
          : null;
      })
      .filter((item) => item !== null) as NonEcdsaValidatorsData[];

    setNonEcdsaValidatorsData(filteredValidators);
  };

  function SmoothSubscriptionCard(): JSX.Element {
    return (
      <>
        {alertCard("subSmoothStep2Alert")}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            marginTop: 1
          }}
        >
          <Button variant="contained" sx={{ borderRadius: 2, marginLeft: 1 }} onClick={handleSubscriptionClick}>
            Take me to Smooth Website!
          </Button>
        </Box>
      </>
    );
  }

  function UnsubscribeFromSmoothCard(): JSX.Element {
    return (
      <>
        {alertCard("unsubSmoothAlert")}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            marginY: 3
          }}
        >
          <Button variant="contained" sx={{ borderRadius: 2, marginLeft: 1 }} onClick={handleUnsubscriptionClick}>
            Take me to Smooth's website
          </Button>
        </Box>
        <div
          style={{
            display: "flex",
            alignItems: "center"
          }}
        >
          <Checkbox checked={isUnsubUnderstood} onChange={() => setIsUnsubUnderstood(!isUnsubUnderstood)} />
          <span style={{ fontSize: 13 }}>
            By checking this I understand that being subscribed to Smooth while having a wrong fee recipient can result
            in my validators getting banned from it.
          </span>
        </div>
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
        //TODO: change a tag href to landing page's url when this been finished
        return (
          <>
            <Alert severity="info" sx={{ marginY: 1 }}>
              By setting the fee recipient to Smooth you are participating in the smoothing pool. You will be able to
              claim your rewards{" "}
              <Tooltip
                placement="top"
                title={
                  <p style={{ fontSize: 12 }}>
                    You don't need to change your withdrawal address, but you must have access to it to recieve rewards
                    from Smooth.
                    <br /> <br />
                    You will need to log in to Smooth UI from your Withdrawal address.
                    <br /> <br /> EigenPods are not currently supported as they can't recieve Execution Layer rewards.
                  </p>
                }
                arrow
              >
                <b>
                  <u>
                    to your withdrawal address
                    <InfoOutlinedIcon fontSize="small" />
                  </u>
                </b>
              </Tooltip>{" "}
              from the Smooth UI.{" "}
              <a href={getSmoothUrlByNetwork(network)} target="_blank">
                Learn more
              </a>
            </Alert>

            <div
              style={{
                display: "flex",
                alignItems: "center"
              }}
            >
              <Checkbox
                checked={withdrawalAccessCheck}
                onChange={() => {
                  setWithdrawalAccessCheck(!withdrawalAccessCheck);
                }}
              />
              <span style={{ fontSize: 13 }}>
                I understand I must have access to the withdrawal address to recieve Smooth rewards
              </span>
            </div>
          </>
        );

      case "subSmoothStep2Alert":
        return (
          <Alert severity="info" sx={{ marginY: 2 }}>
            You have changed your fee recipient to Smooth. To <b>start accumulating rewards</b> right now,{" "}
            <b>subscribe manually</b> thorugh Smooth's webpage.
            <br /> In the Smooth web you can see pending rewards, claim them and manage your Smooth validators.
          </Alert>
        );

      case "unsubSmoothAlert":
        return (
          <Alert severity="warning" sx={{ marginY: 1 }}>
            You are removing Smooth's fee recipient from <b>1 or more</b> validators.{" "}
            <b>Please make sure all these validators are not subscribed to Smooth before changing the fee recipient.</b>{" "}
            Unsubscribing from Smooth can be done in Smooth's website.
          </Alert>
        );

      case "alreadySmoothAlert":
        return (
          <Alert severity="warning" sx={{ marginY: 1 }}>
            1 or more of the selected validators <b>already have Smooth's fee recipient set</b>. For those validators,
            the fee recipient won't updated. Their public keys are:
            <ul>
              {smoothValidatorsPubkeys.map((pubkey) => (
                <li>{pubkey.substring(0, 20) + "..." + pubkey.substring(pubkey.length - 20)}</li>
              ))}
            </ul>
          </Alert>
        );

      case "blsFormatAlert":
        return (
          <Alert severity="error" sx={{ marginY: 1 }}>
            Some of the selected validators have an <b>incorrect withdrawal address format</b>. In Smooth, only
            validators with an ETH1 withdrawal address are permitted to join. The validators with an incorrect
            withdrawal address are:
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
                <a href="https://launchpad.ethereum.org/en/btec/" target="_blank">
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
            {nonEcdsaValidatorsData.filter((validator) => validator.withdrawalFormat === "error").length} of the
            selected validators' withdrawal address format could not be checked. Please,{" "}
            <b>make sure your consensus client is up and working!</b> This may also happen if some validators are new to
            the chain. Affected validator's public keys:
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
      case "noMevBoostSetAlert":
        return (
          <Alert severity="error" sx={{ marginY: 1 }}>
            To subscribe to Smooth, you need to use MEV-Boost. Please install the MEV-Boost package at your{" "}
            <strong>
              <a href={getStakersLink(network)} target="_blank" rel="noopener noreferrer">
                Stakers tab
              </a>
            </strong>{" "}
            and register to at least one MEV relay.
          </Alert>
        );
    }
  }

  // This function renders the alerts that are related to Smooth.
  // If all conditions are met, all alerts are rendered.
  function renderMevSpAddressAlerts(mevSpAddress: string | null) {
    if (!mevSpAddress) {
      return null;
    }

    return (
      <>
        {/* Renders UnsubscribeFromSmoothCard if isRemovingMevSpFr() is true */}
        {isRemovingMevSpFr() && <UnsubscribeFromSmoothCard />}

        {/* If one or more selected validators has smooth as FR and we're setting Smooth FR */}
        {smoothValidatorsPubkeys.length > 0 && isMevSpAddressSelected && alertCard("alreadySmoothAlert")}

        {/* If we couldnt check withdrawalcredential of one or more validators */}
        {isMevSpAddressSelected && isAnyWithdrawalCredentialsEqual("error") && alertCard("errorFormatAlert")}

        {/* If one or more validators has an incorrect withdrawal credentials format */}
        {isMevSpAddressSelected &&
          (isAnyWithdrawalCredentialsEqual("bls") || isAnyWithdrawalCredentialsEqual("unknown")) &&
          alertCard("blsFormatAlert")}

        {/* If mevBoost is not installed */}
        {isMevSpAddressSelected && !isMevBoostSet && alertCard("noMevBoostSetAlert")}

        {/* If everything okay, render alert (only info) */}
        {isMevSpAddressSelected &&
          !areAllOldFrsSameAsGiven(newFeeRecipient) &&
          !isAnyWithdrawalCredentialsDiff("ecdsa") &&
          isMevBoostSet &&
          alertCard("subSmoothStep1Alert")}
      </>
    );
  }

  const isApplyChangesDisabled = () => {
    // Not-Smooth related conditions
    const notSmoothRelated = !isNewFeeRecipientValid() || areAllOldFrsSameAsGiven(newFeeRecipient);

    // Smooth-related conditions. Will always be false if mevSpAddress is null (not in a network with Smooth)
    const smoothRelated =
      mevSpAddress !== null &&
      ((isRemovingMevSpFr() && !isUnsubUnderstood) ||
        (isAnyWithdrawalCredentialsDiff("ecdsa") && isMevSpAddressSelected) ||
        (isMevSpAddressSelected && !isMevBoostSet));

    return notSmoothRelated || smoothRelated;
  };

  function modalContent(): JSX.Element {
    return (
      <DialogContent>
        <Box sx={importDialogBoxStyle}>
          {mevSpAddress && isMevSpAddressSelected && !isAnyWithdrawalCredentialsDiff("ecdsa") && (
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
                  (isAnyWithdrawalCredentialsDiff("ecdsa") && newFeeRecipient === mevSpAddress)
                }
                helperText={
                  newFeeRecipient === ""
                    ? "The fee recipient is the address where the validator will send the fees"
                    : !isValidEcdsaPubkey(newFeeRecipient)
                      ? "Invalid address"
                      : newFeeRecipient === BURN_ADDRESS
                        ? "It is not possible to set the fee recipient to the burn address"
                        : mevSpAddress && isMevSpAddressSelected && isAnyWithdrawalCredentialsDiff("ecdsa")
                          ? "Smooth Fee Recipient is not valid for some of these validators"
                          : "Address is valid"
                }
                value={newFeeRecipient}
                disabled={isMevSpAddressSelected}
              />

              <FormGroup sx={{ marginTop: 1, display: "flex", alignContent: "center" }}>
                {mevSpAddress && (
                  <>
                    {!areAllOldFrsSameAsGiven(mevSpAddress) && (
                      <FormControlLabel
                        control={<Switch onChange={() => switchSetMevSpAddress()} />}
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
              {!areAllSelectedFeeRecipientsEditable() && alertCard("onlyEditableFeesAlert")}
              {areAllOldFrsSameAsGiven(newFeeRecipient) && alertCard("feeAlreadySetToAllAlert")}
              {successMessage && alertCard("successAlert")}
              {errorMessage && alertCard("errorAlert")}
              {renderMevSpAddressAlerts(mevSpAddress)}
            </>
          ) : (
            <SmoothSubscriptionCard />
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
      <DialogTitle id="alert-dialog-title" sx={{ fontWeight: 700, fontSize: 24 }}>
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
              disabled={isApplyChangesDisabled()}
            >
              Apply changes
            </Button>
          )}
          <Button onClick={handleClose} variant="outlined" sx={{ borderRadius: 2 }}>
            Close
          </Button>
        </DialogActions>
      ) : (
        <WaitBox />
      )}
    </Dialog>
  );
}
