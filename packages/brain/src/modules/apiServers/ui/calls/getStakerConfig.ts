import { ConsensusClient, ExecutionClient, Network, StakerConfig } from "@stakingbrain/common";

export async function getStakerConfig({
  network,
  executionClient,
  consensusClient,
  isMevBoostSet,
  executionClientUrl,
  validatorUrl,
  beaconchainUrl,
  signerUrl
}: {
  network: Network;
  executionClient: ExecutionClient;
  consensusClient: ConsensusClient;
  isMevBoostSet: boolean;
  executionClientUrl: string;
  validatorUrl: string;
  beaconchainUrl: string;
  signerUrl: string;
}): Promise<StakerConfig> {
  return {
    network,
    executionClient,
    consensusClient,
    isMevBoostSet,
    executionClientUrl,
    validatorUrl,
    beaconchainUrl,
    signerUrl
  };
}
