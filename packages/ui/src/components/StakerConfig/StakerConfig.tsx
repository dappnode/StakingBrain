import type { JSX } from "react";
import { StakerConfig as StakerConfigType } from "@stakingbrain/common";
import { Box, Paper, Stack, Typography } from "@mui/material";
import { prettyClientDnpName } from "../../utils/dataUtils";

export default function StakerConfig({ stakerConfig }: { stakerConfig: StakerConfigType }): JSX.Element {
  const clients = [
    { label: "Execution client", name: stakerConfig.executionClient },
    { label: "Consensus client", name: stakerConfig.consensusClient },
    { label: "Signer", name: "Web3Signer" }
  ];
  const images = ["erigon", "geth", "reth", "besu", "nethermind", "prysm", "lighthouse", "teku", "nimbus", "lodestar"];
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2.5 }}>
      <Typography variant="subtitle1" sx={{ mb: 2 }}>
        Connected clients
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
        {clients.map(({ label, name }) => (
          <Stack key={label} direction="row" alignItems="center" spacing={1.5}>
            <Box
              component="img"
              alt=""
              src={images.includes(name) ? "/assets/" + name + ".png" : "/assets/dappnode_logo_clean.png"}
              sx={{ width: 40, height: 40, objectFit: "contain" }}
            />
            <Box>
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {prettyClientDnpName(name)}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Box>
    </Paper>
  );
}
