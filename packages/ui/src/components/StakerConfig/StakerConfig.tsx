import React from "react";
import {
  Network,
  StakerConfig as StakerConfigType,
} from "@stakingbrain/common";
import { Card, Box, CardHeader, Tooltip } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Container } from "@mui/system";
import { prettyDnpName } from "../../utils/dataUtils";

export default function StakerConfig({
  stakerConfig,
}: {
  stakerConfig: StakerConfigType<Network>;
}) {
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
        <Card>
          <Tooltip title={`Url: ${stakerConfig.executionClientUrl}`}>
            <CardHeader title={prettyDnpName(stakerConfig.executionClient)} />
          </Tooltip>
        </Card>
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <ArrowBackIcon />
          <ArrowForwardIcon />
        </Box>

        <Card>
          <Tooltip title={`Url: ${stakerConfig.validatorUrl}`}>
            <CardHeader title={prettyDnpName(stakerConfig.consensusClient)} />
          </Tooltip>
        </Card>
        <ArrowForwardIcon />
        <Card>
          <Tooltip title={`Url: ${stakerConfig.signerUrl}`}>
            <CardHeader title="Signer" />
          </Tooltip>
        </Card>
      </Box>
      <br />
      <br />
    </Container>
  );
}
