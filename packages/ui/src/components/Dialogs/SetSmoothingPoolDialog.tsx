import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { CustomValidatorUpdateRequest, Network } from "@stakingbrain/common";
import React, { useState } from "react";
import { api } from "../../api";

//Styles
import { importDialogBoxStyle } from "../../Styles/dialogStyles";
import { getSmoothingPoolAddress } from "../../utils/addresses";
import WaitBox from "../WaitBox/WaitBox";
import { SlideTransition } from "./Transitions";

export default function SetSmoothingPoolDialog({
  open,
  setOpen,
  validatorCurrentConfig,
  mevSpFeeRecipient,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  validatorCurrentConfig: CustomValidatorUpdateRequest;
  mevSpFeeRecipient: string;
}): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleClose = () => {
    setOpen(false);
  };

  const setSmoothingPoolFR = async () => {
    setLoading(true);

    try {
      const validatorNewConfig: CustomValidatorUpdateRequest = {
        pubkey: validatorCurrentConfig.pubkey,
        feeRecipient: mevSpFeeRecipient,
      };

      api.updateValidators([validatorNewConfig]);
    } catch (err) {
      setErrorMessage(
        "Dappnode MEV Smoothing Pool could not be set:" + err.message
      );
    }

    setLoading(false);
  };

  const isMevSpAddressAlreadySet = () => {
    return validatorCurrentConfig.feeRecipient === mevSpFeeRecipient;
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
      <DialogTitle
        id="alert-dialog-title"
        sx={{ fontWeight: 700, fontSize: 24 }}
      >
        Set Dappnode Smoothing Pool as Fee Recipient
      </DialogTitle>
      <>
        <DialogContent>
          <Box sx={importDialogBoxStyle}>
            {isMevSpAddressAlreadySet() && (
              <Alert severity="info" variant="filled" sx={{ marginTop: 2 }}>
                Dappnode Smoothing Pool Fee Recipient has already been set for
                this validator
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
            <Button
              onClick={() => setSmoothingPoolFR()}
              variant="contained"
              sx={{ margin: 2, borderRadius: 2 }}
              disabled={isMevSpAddressAlreadySet()}
            >
              Set Fee Recipient
            </Button>

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
