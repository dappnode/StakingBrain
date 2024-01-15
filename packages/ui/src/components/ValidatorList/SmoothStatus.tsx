import React from "react";
import Tooltip from "@mui/material/Tooltip";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import CrisisAlertIcon from "@mui/icons-material/CrisisAlert";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import CloseIcon from "@mui/icons-material/Close";
import HelpIcon from "@mui/icons-material/Help";
import BlockIcon from "@mui/icons-material/Block";
import { MEV_SP_ADDRESS_MAINNET, MEV_SP_ADDRESS_PRATER } from "../../params";

import { SmoothStatusProps, ValidatorData } from "../../types";

export default function SmoothStatus({
  rowData,
  validatorData,
  network,
}: SmoothStatusProps): JSX.Element {
  console.log("SmoothStatus");
  console.log(rowData);
  console.log(validatorData);
  console.log(network);
  const { pubkey, feeRecipient, tag } = rowData.row;
  const validatorInfo: ValidatorData | undefined = validatorData[pubkey];

  if (!validatorInfo) {
    return <span>Loading...</span>; 
  }

  if (tag !== "solo") {
    return <span>-</span>;
  }

  const isMainnet = network === "mainnet";
  const mevSpAddress = isMainnet
    ? MEV_SP_ADDRESS_MAINNET
    : MEV_SP_ADDRESS_PRATER;
  const subscriptionStatus = validatorInfo.subscriptionStatus.toLowerCase();

  if (
    validatorInfo.subscriptionStatus.toLowerCase() === "notsubscribed" &&
    rowData.row.feeRecipient === mevSpAddress &&
    rowData.row.withdrawalCredentials.format === "ecdsa"
  ) {
    return (
      <Tooltip
        title="Awaiting Subscription. This validator will subscribe automatically when it proposes a block. Changes to 
    the state can take up to 40 minutes to update"
      >
        <HourglassTopIcon style={{ color: "orange" }} />
      </Tooltip>
    );
  } else if (
    (validatorInfo.subscriptionStatus.toLowerCase() === "active" ||
      validatorInfo.subscriptionStatus.toLowerCase() === "yellowcard" ||
      validatorInfo.subscriptionStatus.toLowerCase() === "redcard") &&
    rowData.row.feeRecipient !== mevSpAddress
  ) {
    return (
      <Tooltip
        title="Wrong Fee Recipient! This validator is subscribed to Smooth, but it's fee recipient is not set to Smooth's address.
    Please change it to Smooth's address as soon as possible!"
      >
        <CrisisAlertIcon style={{ color: "red" }} />
      </Tooltip>
    );
  } else if (
    rowData.row.feeRecipient === mevSpAddress &&
    rowData.row.withdrawalCredentials.format !== "ecdsa"
  ) {
    return (
      <Tooltip
        title="Wrong Withdrawal Address Format! This validator is subscribed to Smooth, but it's withdrawal address format is not ETH1 execution format.
    Please change it to ETH1 execution format as soon as possible!"
      >
        <CrisisAlertIcon style={{ color: "red" }} />
      </Tooltip>
    );
  }

  switch (subscriptionStatus) {
    case "active":
      return (
        <Tooltip title="Active">
          <CheckCircleIcon style={{ color: "green" }} />
        </Tooltip>
      );
    case "yellowcard":
      return (
        <Tooltip title="Yellow Card">
          <WarningIcon style={{ color: "yellow" }} />
        </Tooltip>
      );
    case "redcard":
      return (
        <Tooltip title="Red Card">
          <WarningIcon style={{ color: "red" }} />
        </Tooltip>
      );
    case "banned":
      return (
        <Tooltip title="Banned">
          <BlockIcon style={{ color: "red" }} />
        </Tooltip>
      );
    case "notsubscribed":
      return (
        <Tooltip title="Not Subscribed">
          <CloseIcon style={{ color: "grey" }} />
        </Tooltip>
      );
    default:
      return (
        <Tooltip title="There was an error getting this validator's Smooth status.">
          <HelpIcon style={{ color: "grey" }} />
        </Tooltip>
      );
  }
}
