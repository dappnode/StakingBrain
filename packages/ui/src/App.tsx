import { Alert, CircularProgress } from "@mui/material";
import ImportScreen from "./ImportScreen";
import ValidatorList from "./components/ValidatorList/ValidatorList";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import React, { useEffect, useState } from "react";
import { StakerConfig } from "@stakingbrain/common";
import { rpcClient } from "./socket";
import type { Web3SignerStatus } from "@stakingbrain/brain";
import NavBar from "./components/Navbar";
import PerformanceScreen from "./components/Performance/PerformanceScreen";

function App(): JSX.Element {
  const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
  const [theme, setTheme] = useState<"light" | "dark">(savedTheme ?? "light");

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  const [userMode, setUserMode] = React.useState<"basic" | "advanced">("basic");

  const [signerStatus, setSignerStatus] =
    React.useState<Web3SignerStatus>("LOADING");
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
      const status = (await rpcClient.call("signerGetStatus", undefined))
        .status;
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
    <div className="flex h-full min-h-screen w-full flex-col">
      <BrowserRouter>
        <NavBar
          network={stakerConfig?.network}
          theme={theme}
          toggleTheme={toggleTheme}
          userMode={userMode}
          setUserMode={setUserMode}
        />
        <div className="flex w-full flex-grow justify-center">
          <div className=" w-3/4 ">
            {signerStatus !== "UP" ? (
              signerStatus === "LOADING" ? (
                <div className="flex h-full items-center justify-center">
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
                        Its API is not responsive. Check if the Web3Signer
                        package is running.{" "}
                      </>
                    )}
                    To avoid slashing, <b>do not upload </b>
                    your validator <b>keystores to another machine</b>.
                  </Alert>
                  <Alert severity="info" sx={{ m: 2 }} variant="filled">
                    To safely migrate your keystores, remove the Web3Signer
                    package (or its volumes) after you make sure you have a
                    backup of your keystores. Then, wait for at least 2 epochs
                    before you upload your keystores to another machine.
                  </Alert>
                </>
              )
            ) : (
              stakerConfig && (
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
                    element={
                      <ImportScreen
                        network={stakerConfig.network}
                        isMevBoostSet={stakerConfig.isMevBoostSet}
                      />
                    }
                  />
                  <Route path="performance" element={<PerformanceScreen />} />
                </Routes>
              )
            )}
          </div>
        </div>
      </BrowserRouter>
    </div>
  );
}

export default App;
