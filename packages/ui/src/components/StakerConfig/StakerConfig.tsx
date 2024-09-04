import React from "react";
import { Network, StakerConfig as StakerConfigType } from "@stakingbrain/common";
import { Card, Box, Container, Typography } from "@mui/material";
import TrendingFlatRoundedIcon from "@mui/icons-material/TrendingFlatRounded";
import SyncAltRoundedIcon from "@mui/icons-material/SyncAltRounded";
import { prettyClientDnpName } from "../../utils/dataUtils";

export default function StakerConfig({ stakerConfig }: { stakerConfig: StakerConfigType<Network> }): JSX.Element {
  const images = {
    // Mainnet
    "erigon.dnp.dappnode.eth": "/assets/erigon.png",
    "geth.dnp.dappnode.eth": "/assets/geth.png",
    "besu.public.dappnode.eth": "/assets/besu.png",
    "nethermind.public.dappnode.eth": "/assets/nethermind.png",
    "prysm.dnp.dappnode.eth": "/assets/prysm.png",
    "lighthouse.dnp.dappnode.eth": "/assets/lighthouse.png",
    "teku.dnp.dappnode.eth": "/assets/teku.png",
    "nimbus.dnp.dappnode.eth": "/assets/nimbus.png",
    "lodestar.dnp.dappnode.eth": "/assets/lodestar.png",

    // Goerli/Prater
    "goerli-erigon.dnp.dappnode.eth": "/assets/erigon-goerli.png",
    "goerli-geth.dnp.dappnode.eth": "/assets/geth-goerli.png",
    "goerli-besu.dnp.dappnode.eth": "/assets/besu-goerli.png",
    "goerli-nethermind.dnp.dappnode.eth": "/assets/nethermind-goerli.png",
    "prysm-prater.dnp.dappnode.eth": "/assets/prysm-prater.png",
    "lighthouse-prater.dnp.dappnode.eth": "/assets/lighthouse-prater.png",
    "teku-prater.dnp.dappnode.eth": "/assets/teku-prater.png",
    "nimbus-prater.dnp.dappnode.eth": "/assets/nimbus-prater.png",
    "lodestar-prater.dnp.dappnode.eth": "/assets/lodestar-prater.png",

    // Gnosis
    "nethermind-xdai.dnp.dappnode.eth": "/assets/nethermind-gnosis.png",
    "gnosis-erigon.dnp.dappnode.eth": "/assets/gnosis-erigon.png",
    "gnosis-beacon-chain-prysm.dnp.dappnode.eth": "/assets/prysm-gnosis.png",
    "lighthouse-gnosis.dnp.dappnode.eth": "/assets/lighthouse-gnosis.png",
    "teku-gnosis.dnp.dappnode.eth": "/assets/teku-gnosis.png",
    // TODO: Add Nimbus Gnosis logo (now mainnet)
    "nimbus-gnosis.dnp.dappnode.eth": "/assets/nimbus.png",
    "lodestar-gnosis.dnp.dappnode.eth": "/assets/lodestar-gnosis.png",

    // Lukso --> // TODO: Add Lukso logos (now mainnet)
    "lukso-geth.dnp.dappnode.eth": "/assets/geth.png",
    "lukso-erigon.dnp.dappnode.eth": "/assets/erigon.png",
    "lukso-besu.dnp.dappnode.eth": "/assets/besu.png",
    "lukso-nethermind.dnp.dappnode.eth": "/assets/nethermind.png",
    "prysm-lukso.dnp.dappnode.eth": "/assets/prysm.png",
    "lighthouse-lukso.dnp.dappnode.eth": "/assets/lighthouse.png",
    "teku-lukso.dnp.dappnode.eth": "/assets/teku.png",
    "nimbus-lukso.dnp.dappnode.eth": "/assets/nimbus.png",
    "lodestar-lukso.dnp.dappnode.eth": "/assets/lodestar.png",

    //Holesky --> // TODO: Add Holesky logos (now mainnet)
    "holesky-geth.dnp.dappnode.eth": "/assets/geth.png",
    "holesky-erigon.dnp.dappnode.eth": "/assets/erigon.png",
    "holesky-besu.dnp.dappnode.eth": "/assets/besu.png",
    "holesky-nethermind.dnp.dappnode.eth": "/assets/nethermind.png",
    "prysm-holesky.dnp.dappnode.eth": "/assets/prysm.png",
    "lighthouse-holesky.dnp.dappnode.eth": "/assets/lighthouse.png",
    "teku-holesky.dnp.dappnode.eth": "/assets/teku.png",
    "nimbus-holesky.dnp.dappnode.eth": "/assets/nimbus.png",
    "lodestar-holesky.dnp.dappnode.eth": "/assets/lodestar.png",

    // Default logo until we have a package for them
    default: "/assets/dappnode_logo_clean.png"
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
        backgroundColor: "transparent"
      }}
    >
      <Card
        sx={{
          py: 1,
          px: 3,
          mt: 2,
          mb: -5,
          border: "none",
          boxShadow: "none",
          backgroundColor: "transparent",
          backgroundImage: "none"
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-evenly",
            gap: 2
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
          >
            <Card sx={{ borderRadius: 2 }}>
              <Box
                component="img"
                sx={{
                  height: 80,
                  width: 80,
                  padding: 1
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
              alignItems: "center"
            }}
          >
            <SyncAltRoundedIcon sx={{ mb: 4, fontSize: 48 }} />
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
          >
            <Card sx={{ borderRadius: 2 }}>
              <Box
                component="img"
                sx={{
                  height: 80,
                  width: 80,
                  padding: 1
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
              alignItems: "center"
            }}
          >
            <TrendingFlatRoundedIcon sx={{ mb: 4, fontSize: 48 }} />
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
          >
            <Card sx={{ borderRadius: 2 }}>
              <Box
                component="img"
                sx={{
                  height: 80,
                  width: 80,
                  padding: 1
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
