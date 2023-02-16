import React from "react";
import {
  Network,
  StakerConfig as StakerConfigType,
} from "@stakingbrain/common";
import { Card, Box, Container, Typography } from "@mui/material";
import TrendingFlatRoundedIcon from "@mui/icons-material/TrendingFlatRounded";
import SyncAltRoundedIcon from "@mui/icons-material/SyncAltRounded";
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
    default: "/assets/dappnode_logo_clean.png",
    "goerli-nethermind.dnp.dappnode.eth": "/assets/dappnode_logo.png",
    "lodestar.dnp.dappnode.eth": "/assets/dappnode_logo.png",
    "lodestar-prater.dnp.dappnode.eth": "/assets/dappnode_logo.png",
    "lodestar-gnosis.dnp.dappnode.eth": "/assets/dappnode_logo.png",
  };

  return (
    //The container should fill all horizontal space
    <Container
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
      }}
    >
      <Card sx={{ py: 1, px: 3, mt: 2, mb: -5, borderRadius: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-evenly",
            gap: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Card sx={{ borderRadius: 2 }}>
              <Box
                component="img"
                sx={{
                  height: 80,
                  width: 80,
                  padding: 1,
                }}
                alt="erigon-goerli"
                src={images[stakerConfig.executionClient]}
              />
            </Card>
            <Typography sx={{ fontWeight: "bold", mt: 2 }}>
              {prettyClientDnpName(stakerConfig.executionClient)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <SyncAltRoundedIcon sx={{ mb: 4, fontSize: 48 }} />
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Card sx={{ borderRadius: 2 }}>
              <Box
                component="img"
                sx={{
                  height: 80,
                  width: 80,
                  padding: 1,
                }}
                alt="erigon-goerli"
                src={images[stakerConfig.consensusClient]}
              />
            </Card>
            <Typography sx={{ fontWeight: "bold", mt: 2 }}>
              {prettyClientDnpName(stakerConfig.consensusClient)}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <TrendingFlatRoundedIcon sx={{ mb: 4, fontSize: 48 }} />
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Card sx={{ borderRadius: 2 }}>
              <Box
                component="img"
                sx={{
                  height: 80,
                  width: 80,
                  padding: 1,
                }}
                alt="signer"
                src={images["default"]}
              />
            </Card>
            <Typography sx={{ fontWeight: "bold", mt: 2 }}>Signer</Typography>
          </Box>
        </Box>
      </Card>
    </Container>
  );
}
