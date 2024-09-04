import Tooltip from "@mui/material/Tooltip";
import { HourglassTop, CrisisAlert, CheckCircle, Warning, Close, Help, Block } from "@mui/icons-material";
import CircularProgress from "@mui/material/CircularProgress";
import { MevSpSubscriptionStatus } from "@stakingbrain/common";
import { SmoothStatusProps } from "../../types";

export default function SmoothStatus({
  rowData,
  subscriptionStatus,
  mevSpFeeRecipient,
  oracleCallError
}: SmoothStatusProps): JSX.Element {
  const feeRecipient = rowData.row.feeRecipient;
  const withdrawalFormat = rowData.row.withdrawalCredentials.format;
  const mevSpAddress = mevSpFeeRecipient;

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
    <Tooltip title="Wrong Withdrawal Address Format! This validator has Smooth as fee recipient, but its withdrawal address format is not ETH1 execution format. Please change it to ETH1 execution format as soon as possible!">
      <CrisisAlert style={{ color: "red" }} />
    </Tooltip>
  );

  //Helper functions for rendering healthy oracle statuses
  const renderSubscriptionStatusIcon = (status: string) => {
    let icon, tooltipText;

    switch (status) {
      case MevSpSubscriptionStatus.ACTIVE:
        icon = <CheckCircle style={{ color: "green" }} />;
        tooltipText = "Active Subscription. All good!";
        break;
      case MevSpSubscriptionStatus.YELLOW_CARD:
        icon = <Warning style={{ color: "yellow" }} />;
        tooltipText =
          "Yellow Card Subscription. This validator missed it's last proposal. Propose successfully next block to get back to active.";
        break;
      case MevSpSubscriptionStatus.RED_CARD:
        icon = <Warning style={{ color: "red" }} />;
        tooltipText =
          "Red Card Subscription. This validator missed it's two last proposals in a row. Propose successfully next block to get back to yellow card.";
        break;
      case MevSpSubscriptionStatus.BANNED:
        icon = <Block style={{ color: "red" }} />;
        tooltipText = "Banned Subscription. This validator proposed a block with an incorrect fee recipient.";
        break;
      case MevSpSubscriptionStatus.NOT_SUBSCRIBED:
        icon = <Close style={{ color: "grey" }} />;
        tooltipText = "Not Subscribed. Subscribe to earn more rewards!";
        break;
      default:
        icon = <Help style={{ color: "red" }} />;
        tooltipText = "Unknown Status. Something went wrong."; // we should never get here
        break;
    }

    return <Tooltip title={tooltipText}>{icon}</Tooltip>;
  };

  // RENDERING LOGIC

  // if oracleCall had an error, return "?" status (couldnt be fetched)
  if (oracleCallError) {
    return (
      <Tooltip title={oracleCallError}>
        <Help style={{ color: "red" }} />
      </Tooltip>
    );
  }
  // subscriptionStatus is falsy or nullish when oracleCall hasnt finished yet
  if (!subscriptionStatus) {
    return <CircularProgress size={22} />;
  }

  // oracleCall was successful, but this validator's status could not be fetched because
  // it didnt have an index available. Either new validator to the chain or consensus client is unhealthy
  if (subscriptionStatus === "unknown") {
    return (
      <Tooltip title="Unknown Status. Is your consensus client up and synced? Is this validator new to the chain?">
        <Help style={{ color: "red" }} />
      </Tooltip>
    );
  }

  // if we get here, we assume oracleCall was successful and index was available
  if (
    // healthy pending_subscription. Good withdrawal address format and fee recipient
    subscriptionStatus.toLowerCase() === "notsubscribed" &&
    feeRecipient.toLowerCase() === mevSpAddress?.toLowerCase() &&
    withdrawalFormat === "ecdsa"
  ) {
    return renderAwaitingSubscription();

    // unhealthy pending_subscription/subscription. Wrong withdrawal address format
  } else if (feeRecipient.toLowerCase() === mevSpAddress?.toLowerCase() && withdrawalFormat !== "ecdsa") {
    return renderWrongWithdrawalAddressFormat();

    // unhealthy subscription. Wrong fee recipient
  } else if (
    (subscriptionStatus.toLowerCase() === "active" ||
      subscriptionStatus.toLowerCase() === "yellowcard" ||
      subscriptionStatus.toLowerCase() === "redcard") &&
    rowData.row.feeRecipient.toLowerCase() !== mevSpAddress?.toLowerCase()
  ) {
    return renderWrongFeeRecipient();

    // healthy statuses
  } else {
    return renderSubscriptionStatusIcon(subscriptionStatus);
  }
}
