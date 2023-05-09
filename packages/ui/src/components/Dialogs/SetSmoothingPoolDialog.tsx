import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import {
  CustomValidatorUpdateRequest,
  MEV_SP_ADDRESS,
} from "@stakingbrain/common";
import React, { useState } from "react";
import { api } from "../../api";

//Styles
import { importDialogBoxStyle } from "../../Styles/dialogStyles";
import WaitBox from "../WaitBox/WaitBox";
import { SlideTransition } from "./Transitions";

export default function SetSmoothingPoolDialog({
  open,
  setOpen,
  validatorCurrentConfig,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  validatorCurrentConfig: CustomValidatorUpdateRequest;
}): JSX.Element {
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setOpen(false);
  };

  const setSmoothingPoolFR = async () => {
    setLoading(true);

    const validatorNewConfig: CustomValidatorUpdateRequest = {
      pubkey: validatorCurrentConfig.pubkey,
      feeRecipient: MEV_SP_ADDRESS,
    };

    try {
      api.updateValidators([validatorNewConfig]);
    } catch (err) {
      // TODO Show error
    }

    setLoading(false);
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
            {validatorCurrentConfig.feeRecipient === MEV_SP_ADDRESS && (
              <Alert severity="info" variant="filled" sx={{ marginTop: 2 }}>
                Dappnode Smoothing Pool Fee Recipient has already been set for
                this validator
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
              disabled={validatorCurrentConfig.feeRecipient === MEV_SP_ADDRESS}
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
