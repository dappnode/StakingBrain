import type { JSX } from "react";
import { Alert, CircularProgress } from "@mui/material";
import TopBar from "./components/TopBar/TopBar";
import ImportScreen from "./ImportScreen";
import ValidatorList from "./components/ValidatorList/ValidatorList";
import { ThemeProvider } from "@mui/material/styles";
import { createAppTheme } from "./Styles/theme";
import CssBaseline from "@mui/material/CssBaseline";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import React, { useEffect } from "react";
import { StakerConfig } from "@stakingbrain/common";
import { rpcClient } from "./socket";
import type { Web3SignerStatus } from "@stakingbrain/brain";

const COLOR_MODE_STORAGE_KEY = "stakingbrain.color-mode";

function App(): JSX.Element {
  const [mode, setMode] = React.useState<"dark" | "light">(() => {
    try {
      return window.localStorage.getItem(COLOR_MODE_STORAGE_KEY) === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });
  const [userMode, setUserMode] = React.useState<"basic" | "advanced">("basic");
  const theme = React.useMemo(() => createAppTheme(mode), [mode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
    } catch {
      // Keep theme switching available when browser storage is disabled.
    }
  }, [mode]);

  const [signerStatus, setSignerStatus] = React.useState<Web3SignerStatus>("LOADING");
  const [stakerConfig, setStakerConfig] = React.useState<StakerConfig>();

  useEffect(() => {
    getStakerConfig();
  }, []);

  useEffect(() => {
    signerGetStatus();
    const interval = setInterval(() => {
      signerGetStatus();
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function signerGetStatus(): Promise<void> {
    try {
      const status = (await rpcClient.call("signerGetStatus", undefined)).status;
      setSignerStatus(status);
    } catch (e) {
      console.error("Error on signerGetStatus", e);
      setSignerStatus("ERROR");
    }
  }

  async function getStakerConfig(): Promise<void> {
    try {
      const config = await rpcClient.call("getStakerConfig", undefined);
      console.log("config", config);
      setStakerConfig(config);
    } catch (e) {
      console.error("Error on getStakerConfig", e);
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TopBar
        network={stakerConfig?.network}
        mode={mode}
        setMode={setMode}
        userMode={userMode}
        setUserMode={setUserMode}
      />

      {signerStatus !== "UP" ? (
        signerStatus === "LOADING" ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: "60vh"
            }}
          >
            <CircularProgress />
          </div>
        ) : (
          <>
            <Alert severity="error" sx={{ m: 3 }}>
              Web3Signer is not available.
              {signerStatus === "DOWN" ? (
                <> Its API is responsive, but signer is down. </>
              ) : (
                <> Its API is not responsive. Check if the Web3Signer package is running. </>
              )}
              To avoid slashing, <b>do not upload </b>
              your validator <b>keystores to another machine</b>.
            </Alert>
            <Alert severity="info" sx={{ m: 3 }}>
              To safely migrate your keystores, remove the Web3Signer package (or its volumes) after you make sure you
              have a backup of your keystores. Then, wait for at least 2 epochs before you upload your keystores to
              another machine.
            </Alert>
          </>
        )
      ) : (
        stakerConfig && (
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<ValidatorList stakerConfig={stakerConfig} userMode={userMode} />} />
              <Route
                path="import"
                element={<ImportScreen network={stakerConfig.network} isMevBoostSet={stakerConfig.isMevBoostSet} />}
              />
            </Routes>
          </BrowserRouter>
        )
      )}
    </ThemeProvider>
  );
}

export default App;
