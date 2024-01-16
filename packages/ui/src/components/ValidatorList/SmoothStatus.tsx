import Tooltip from "@mui/material/Tooltip";
import {
  HourglassTop,
  CrisisAlert,
  CheckCircle,
  Warning,
  Close,
  Help,
  Block,
} from "@mui/icons-material";
import { MEV_SP_ADDRESS_MAINNET, MEV_SP_ADDRESS_PRATER } from "../../params";
import { SmoothStatusProps, MevSpSubscriptionStatus } from "../../types";

export default function SmoothStatus({
  rowData,
  subscriptionStatus,
  network,
}: SmoothStatusProps): JSX.Element {
  const feeRecipient = rowData.row.feeRecipient;
  const withdrawalFormat = rowData.row.withdrawalCredentials.format;

  const isMainnet = network === "mainnet";
  const mevSpAddress = isMainnet
    ? MEV_SP_ADDRESS_MAINNET
    : MEV_SP_ADDRESS_PRATER;

  // Helper functions for rendering based on conditions
  const renderAwaitingSubscription = () => (
    <Tooltip title="Awaiting Subscription. This validator will subscribe automatically when it proposes a block. Changes to the state can take up to 40 minutes to update">
      <HourglassTop style={{ color: "orange" }} />
    </Tooltip>
  );

  const renderWrongFeeRecipient = () => (
    <Tooltip title="Wrong Fee Recipient! This validator is subscribed to Smooth, but its fee recipient is not set to Smooth's address. Please change it to Smooth's address as soon as possible!">
      <CrisisAlert style={{ color: "red" }} />
    </Tooltip>
  );

  const renderWrongWithdrawalAddressFormat = () => (
    <Tooltip title="Wrong Withdrawal Address Format! This validator is subscribed to Smooth, but its withdrawal address format is not ETH1 execution format. Please change it to ETH1 execution format as soon as possible!">
      <CrisisAlert style={{ color: "red" }} />
    </Tooltip>
  );

  const renderSubscriptionStatusIcon = (status: string) => {
    switch (status) {
      case MevSpSubscriptionStatus.ACTIVE:
        return <CheckCircle style={{ color: "green" }} />;
      case MevSpSubscriptionStatus.YELLOW_CARD:
        return <Warning style={{ color: "yellow" }} />;
      case MevSpSubscriptionStatus.RED_CARD:
        return <Warning style={{ color: "red" }} />;
      case MevSpSubscriptionStatus.BANNED:
        return <Block style={{ color: "red" }} />;
      case MevSpSubscriptionStatus.NOT_SUBSCRIBED:
        return <Close style={{ color: "grey" }} />;
      default:
        return <Help style={{ color: "grey" }} />;
    }
  };

  // rendering logic
  if (
    // healthy pending subscription. Good withdrawal address format and fee recipient
    subscriptionStatus.toLowerCase() === "notsubscribed" &&
    feeRecipient === mevSpAddress &&
    withdrawalFormat === "ecdsa"
  ) {
    return renderAwaitingSubscription();

    // unhealthy pending subscription. Wrong withdrawal address format
  } else if (feeRecipient === mevSpAddress && withdrawalFormat !== "ecdsa") {
    return renderWrongWithdrawalAddressFormat();

    // unhealthy subscription. Wrong fee recipient
  } else if (
    (subscriptionStatus.toLowerCase() === "active" ||
      subscriptionStatus.toLowerCase() === "yellowcard" ||
      subscriptionStatus.toLowerCase() === "redcard") &&
    rowData.row.feeRecipient !== mevSpAddress
  ) {
    return renderWrongFeeRecipient();

    // healthy statuses
  } else {
    return renderSubscriptionStatusIcon(subscriptionStatus);
  }
}
