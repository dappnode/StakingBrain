import React from "react";

export default function StakerConfig() {
  // This component will show advanced information about the Brain:
  // network:
  // executionClient:
  // consensusClient:
  // executionClientUrl:
  // validatorUrl:
  // beaconchainUrl:
  // signerUrl:
  // defaultFeeRecipient?:

  /**{
          signerStatus === "UP" ? (
            <Tooltip title="Signer is UP">
              <CheckCircle color="success" />
            </Tooltip>
          ) : signerStatus === "DOWN" ? (
            <Tooltip title="Signer is DOWN">
              <Cancel color="error" />
            </Tooltip>
          ) : signerStatus === "LOADING" ? (
            <Tooltip title="Web3Signer status is loading">
              <CircularProgress size={"20px"} />
            </Tooltip>
          ) : (
            <Tooltip title="Web3Signer is not properly connected. Its URL might be wrong">
              <QuestionMark color="warning" />
            </Tooltip>
          );
        }**/

  /**
         *       {consensusClient && executionClient && (
        <ClientsBox
          consensusClient={consensusClient.split(".")[0]?.toUpperCase()}
          executionClient={executionClient.split(".")[0]?.toUpperCase()}
        />
      )}
         */

  return <div></div>;
}
