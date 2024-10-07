import { ConsensusClient } from "@stakingbrain/common";

export const getValidatorToken = (consensusClient: ConsensusClient): string => {
  if (consensusClient === ConsensusClient.Teku) return "cd4892ca35d2f5d3e2301a65fc7aa660";
  if (consensusClient === ConsensusClient.Lighthouse)
    return "api-token-0x0200e6ce18e26fd38caca7ae1bfb9e2bba7efb20ed2746ad17f2f6dda44603152d";
  if (consensusClient === ConsensusClient.Prysm)
    return "0xd59b8238ecaeb255d62c85c6ca8aee185870bd7a27e43f85fd2658267036d94a";
  if (consensusClient === ConsensusClient.Nimbus)
    return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.MxwOozSH-TLbW_XKepjyYDHm2IT8Ki0tD3AHuajfNMg";
  if (consensusClient === ConsensusClient.Lodestar)
    return "api-token-0x7fd16fff6453982a5d8bf14617e7823b68cd18ade59985befe64e0a659300e7d";
  throw Error(`Unknown consensus client selected: ${consensusClient}`);
};
