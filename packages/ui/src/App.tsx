//External components
import { ThemeProvider } from "@mui/material/styles";
import { Container, Alert } from "@mui/material";

//Internal components
import TopBar from "./components/TopBar/TopBar";
import ImportScreen from "./ImportScreen";
import ValidatorList from "./components/ValidatorList/ValidatorList";
import ClientsBox from "./components/ClientsBox/ClientsBox";

//Themes
import { darkTheme } from "./Themes/globalThemes";

//Other libraries
import { BrowserRouter, Route, Routes } from "react-router-dom";
import React, { useEffect } from "react";
import { startApi, api } from "./api";
import { Network, Web3SignerStatus } from "@stakingbrain/common";

function App(): JSX.Element {
  const [signerStatus, setSignerStatus] =
    React.useState<Web3SignerStatus>("LOADING");
  const [currentNetwork, setCurrentNetwork] = React.useState<Network>();
  const [consensusClient, setConsensusClient] = React.useState<string>();
  const [executionClient, setExecutionClient] = React.useState<string>();

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
      setCurrentNetwork(config.network);
      setConsensusClient(config.consensusClient);
      setExecutionClient(config.executionClient);
    } catch (e) {
      console.error("Error on getStakerConfig", e);
    }
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <TopBar network={currentNetwork} signerStatus={signerStatus} />
      <Container component="main" maxWidth="xl">
        {signerStatus === "UP" && currentNetwork ? (
          <BrowserRouter>
            <Routes>
              <Route
                path="/"
                element={
                  <>
                    <ValidatorList network={currentNetwork} />
                    {consensusClient && executionClient && (
                      <ClientsBox
                        consensusClient={consensusClient
                          .split(".")[0]
                          ?.toUpperCase()}
                        executionClient={executionClient
                          .split(".")[0]
                          ?.toUpperCase()}
                      />
                    )}
                  </>
                }
              />
              <Route path="import" element={<ImportScreen />} />
            </Routes>
          </BrowserRouter>
        ) : (
          <>
            {signerStatus === "ERROR" ? (
              <Alert severity="error" sx={{ marginTop: 2 }} variant="filled">
                Web3Signer API is not available. Check URL or global variables.
                Is the Web3Signer API running?
              </Alert>
            ) : (
              signerStatus === "DOWN" && (
                <Alert severity="error" sx={{ marginTop: 2 }} variant="filled">
                  Web3Signer is down.
                </Alert>
              )
            )}
            {!currentNetwork && (
              <Alert severity="error" sx={{ marginTop: 2 }} variant="filled">
                Network has not been properly set. Check URL or global
                variables.
              </Alert>
            )}
          </>
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;
