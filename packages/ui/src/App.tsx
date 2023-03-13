import { Alert, CircularProgress } from "@mui/material";
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
              height: "100vh",
            }}
          >
            <CircularProgress />
          </div>
        ) : (
          <>
            <Alert severity="error" sx={{ m: 2 }} variant="filled">
              Web3Signer is not available.
              {signerStatus === "DOWN" ? (
                <> Its API is responsive, but signer is down. </>
              ) : (
                <>
                  {" "}
                  Its API is not responsive. Check if the Web3Signer package is
                  running.{" "}
                </>
              )}
              To avoid slashing, <b>do not upload </b>
              your validator <b>keystores to another machine</b>.
            </Alert>
            <Alert severity="info" sx={{ m: 2 }} variant="filled">
              To safely migrate your keystores, remove the Web3Signer package
              (or its volumes) after you make sure you have a backup of your
              keystores. Then, wait for at least 2 epochs before you upload your
              keystores to another machine.
            </Alert>
          </>
        )
      ) : (
        stakerConfig && (
          <BrowserRouter>
            <Routes>
              <Route
                path="/"
                element={
                  <ValidatorList
                    stakerConfig={stakerConfig}
                    userMode={userMode}
                  />
                }
              />
              <Route
                path="import"
                element={<ImportScreen network={stakerConfig.network} />}
              />            
              </Routes>
          </BrowserRouter>
        )
      )}
    </ThemeProvider>
  );
}

export default App;
