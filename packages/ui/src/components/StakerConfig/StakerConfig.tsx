import React from "react";
import { StakerConfig as StakerConfigType } from "@stakingbrain/common";
import { Card, Box, Container, Typography } from "@mui/material";
import TrendingFlatRoundedIcon from "@mui/icons-material/TrendingFlatRounded";
import SyncAltRoundedIcon from "@mui/icons-material/SyncAltRounded";
import { prettyClientDnpName } from "../../utils/dataUtils";

export default function StakerConfig({ stakerConfig }: { stakerConfig: StakerConfigType }): JSX.Element {
  const images: { [key: string]: string } = {
    erigon: "/assets/erigon.png",
    geth: "/assets/geth.png",
    reth: "/assets/reth.png",
    besu: "/assets/besu.png",
    nethermind: "/assets/nethermind.png",
    prysm: "/assets/prysm.png",
    lighthouse: "/assets/lighthouse.png",
    teku: "/assets/teku.png",
    nimbus: "/assets/nimbus.png",
    lodestar: "/assets/lodestar.png",

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
                src={
                  Object.keys(images).includes(stakerConfig.executionClient)
                    ? images[stakerConfig.executionClient]
                    : images["default"]
                }
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
                src={
                  Object.keys(images).includes(stakerConfig.consensusClient)
                    ? images[stakerConfig.consensusClient]
                    : images["default"]
                }
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
