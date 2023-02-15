import React from "react";
import {
  Network,
  StakerConfig as StakerConfigType,
} from "@stakingbrain/common";
import { Card, Box, CardHeader, Tooltip } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Container } from "@mui/system";
import { prettyClientDnpName } from "../../utils/dataUtils";

export default function StakerConfig({
  stakerConfig,
}: {
  stakerConfig: StakerConfigType<Network>;
}): JSX.Element {
  const images = {
    "erigon.dnp.dappnode.eth": "/assets/erigon.png",
    "goerli-erigon.dnp.dappnode.eth": "/assets/erigon-goerli.png",
    "geth.dnp.dappnode.eth": "/assets/geth.png",
    "besu.public.dappnode.eth": "/assets/besu.png",
    "nethermind.public.dappnode.eth": "/assets/nethermind.png",
    "nethermind-xdai.dnp.dappnode.eth": "/assets/nethermind-gnosis.png",
    "goerli-geth.dnp.dappnode.eth": "/assets/geth-goerli.png",
    "goerli-besu.dnp.dappnode.eth": "/assets/besu-goerli.png",
    "prysm.dnp.dappnode.eth": "/assets/prysm.png",
    "lighthouse.dnp.dappnode.eth": "/assets/lighthouse.png",
    "teku.dnp.dappnode.eth": "/assets/teku.png",
    "nimbus.dnp.dappnode.eth": "/assets/nimbus.png",
    "prysm-prater.dnp.dappnode.eth": "/assets/prysm-prater.png",
    "lighthouse-prater.dnp.dappnode.eth": "/assets/lighthouse-prater.png",
    "teku-prater.dnp.dappnode.eth": "/assets/teku-prater.png",
    "nimbus-prater.dnp.dappnode.eth": "/assets/nimbus-prater.png",
    "gnosis-beacon-chain-prysm.dnp.dappnode.eth": "/assets/prysm-gnosis.png",
    "lighthouse-gnosis.dnp.dappnode.eth": "/assets/lighthouse-gnosis.png",
    "teku-gnosis.dnp.dappnode.eth": "/assets/teku-gnosis.png",
    "nimbus-gnosis.dnp.dappnode.eth": "/assets/nimbus-gnosis.png",

    // Default logo until we have a package for them
    default: "/assets/dappnode_logo.png",
    "goerli-nethermind.dnp.dappnode.eth": "/assets/dappnode_logo.png",
    "lodestar.dnp.dappnode.eth": "/assets/dappnode_logo.png",
    "lodestar-prater.dnp.dappnode.eth": "/assets/dappnode_logo.png",
    "lodestar-gnosis.dnp.dappnode.eth": "/assets/dappnode_logo.png",
  };

  return (
    <Container>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-evenly",
          borderRadius: 2,
        }}
      >
        <Tooltip title={`Url: ${stakerConfig.executionClientUrl}`}>
          <Card>
            <CardHeader
              title={prettyClientDnpName(stakerConfig.executionClient)}
            />
            <Box
              component="img"
              sx={{
                height: 100,
                width: 100,
              }}
              alt="erigon-goerli"
              src={images[stakerConfig.executionClient]}
            />
          </Card>
        </Tooltip>

        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <ArrowBackIcon />
          <ArrowForwardIcon />
        </Box>

        <Tooltip title={`Url: ${stakerConfig.validatorUrl}`}>
          <Card>
            <CardHeader
              title={prettyClientDnpName(stakerConfig.consensusClient)}
            />
            <Box
              component="img"
              sx={{
                height: 100,
                width: 100,
              }}
              alt="erigon-goerli"
              src={images[stakerConfig.consensusClient]}
            />
          </Card>
        </Tooltip>

        <ArrowForwardIcon />

        <Tooltip title={`Url: ${stakerConfig.signerUrl}`}>
          <Card>
            <CardHeader title="Signer" />
            <Box
              component="img"
              sx={{
                height: 100,
                width: 100,
              }}
              alt="signer"
              src={images["default"]}
            />
          </Card>
        </Tooltip>
      </Box>
      <br />
      <br />
    </Container>
  );
}
