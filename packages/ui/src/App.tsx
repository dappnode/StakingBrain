import { Alert } from "@mui/material";
import TopBar from "./components/TopBar/TopBar";
import ImportScreen from "./ImportScreen";
import ValidatorList from "./components/ValidatorList/ValidatorList";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import React, { useEffect } from "react";
import { startApi, api } from "./api";
import { Network, StakerConfig, Web3SignerStatus } from "@stakingbrain/common";

function App(): JSX.Element {
  const [mode, setMode] = React.useState<"dark" | "light">("light");
  const [userMode, setUserMode] = React.useState<"basic" | "advanced">("basic");

  const [signerStatus, setSignerStatus] =
    React.useState<Web3SignerStatus>("LOADING");
  const [stakerConfig, setStakerConfig] =
    React.useState<StakerConfig<Network>>();

  useEffect(() => {
    // Start API and Socket.io once user has logged in
    startApi()
      .then(() => {
        getStakerConfig();
      })
      .catch((e) => console.error("Error on startApi", e));
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
      const status = (await api.signerGetStatus()).status;
      setSignerStatus(status);
    } catch (e) {
      console.error("Error on signerGetStatus", e);
      setSignerStatus("ERROR");
    }
  }

  async function getStakerConfig(): Promise<void> {
    try {
      const config = await api.getStakerConfig();
      console.log("config", config);
      setStakerConfig(config);
    } catch (e) {
      console.error("Error on getStakerConfig", e);
    }
  }

  return (
    <ThemeProvider
      theme={createTheme({
        palette: {
          mode,
        },
      })}
    >
      <CssBaseline />
      <TopBar
        mode={mode}
        setMode={setMode}
        userMode={userMode}
        setUserMode={setUserMode}
      />

      {stakerConfig?.network && (
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                <ValidatorList
                  network={stakerConfig.network}
                  userMode={userMode}
                />
              }
            />
            <Route path="import" element={<ImportScreen />} />
          </Routes>
        </BrowserRouter>
      )}

      {/** TODO: Add warnings components right below */}
      {signerStatus === "ERROR" ? (
        <Alert severity="error" sx={{ marginTop: 2 }} variant="filled">
          Web3Signer API is not available. Check URL or global variables. Is the
          Web3Signer API running?
        </Alert>
      ) : (
        signerStatus === "DOWN" && (
          <Alert severity="error" sx={{ marginTop: 2 }} variant="filled">
            Web3Signer is down.
          </Alert>
        )
      )}
      {!stakerConfig?.network && (
        <Alert severity="error" sx={{ marginTop: 2 }} variant="filled">
          Network has not been properly set. Check URL or global variables.
        </Alert>
      )}
    </ThemeProvider>
  );
}

export default App;
