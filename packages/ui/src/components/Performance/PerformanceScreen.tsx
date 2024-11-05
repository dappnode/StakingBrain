import { useEffect, useState } from "react";
import { rpcClient } from "../../socket";
import {
  CustomValidatorGetResponse,
  ValidatorsDataProcessed,
} from "@stakingbrain/brain";
import { CircularProgress } from "@mui/material";
import SummaryTable from "./Tables/SummaryTable";
import { PerformanceTableTypes } from "../../types";
import BlocksTable from "./Tables/BlocksTable";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

export default function PerformanceScreen(): JSX.Element {
  const [validators, setValidators] = useState<CustomValidatorGetResponse[]>();
  const [performanceData, setPerformanceData] =
    useState<Map<number, ValidatorsDataProcessed>>();
  const [loading, setLoading] = useState(false);
  const [selectedTable, setSelectedTable] =
    useState<PerformanceTableTypes>("Summary");

  const performanceTables: {
    tableName: PerformanceTableTypes;
    icon: JSX.Element;
  }[] = [
    { tableName: "Summary", icon: <TrendingUpIcon /> },
    { tableName: "Rewards", icon: <MilitaryTechIcon /> },
    { tableName: "Blocks", icon: <ViewInArIcon /> },
  ];
  useEffect(() => {
    getValidators();
  }, []);

  useEffect(() => {
    getValidatorsPerformance();
    console.log(validators);
  }, [validators]);

  async function getValidators() {
    try {
      setLoading(true);
      setValidators(await rpcClient.call("getValidators", undefined));
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }

  async function getValidatorsPerformance(): Promise<void> {
    try {
      if (validators) {
        setLoading(true);
        const validatorsIndex: string[] = [];
        for (const validator of validators) {
          validatorsIndex.push(validator.index);
        }

        const performanceData = await rpcClient.call(
          "fetchValidatorsPerformanceData",
          {
            validatorIndexes: validatorsIndex,
            numberOfDaysToQuery: 7,
            granularity: 86400000,
          },
        );
        console.log("performanceData: ", performanceData);
        console.log(performanceData);
        setPerformanceData(performanceData);
        setLoading(false);
      }
    } catch (e) {
      console.error("Error on getting validators performance", e);
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full w-full">
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <CircularProgress
            sx={{
              color: "#9333ea",
            }}
          />
        </div>
      ) : (
        <div className="pt-20 mb-5 flex h-full w-full flex-col gap-10">
          <div className="dark:border-dark-interface-400 flex flex-row justify-between rounded border border-interface-300 bg-interface-100 px-4 py-5 text-lg dark:border-dark-interface-200 dark:bg-dark-interface-100">
            <div>Online Validators</div>
            <div>Rewards</div>
          </div>
          <div className="flex w-full flex-col">
            <div className="flex flex-row">
              {performanceTables.map((table) => (
                <div
                  key={table.tableName}
                  className={`flex cursor-pointer flex-row items-center justify-center gap-1 px-3 py-3 text-lg ${selectedTable === table.tableName ? "dark:border-dark-interface-400 rounded border-l border-r border-t border-interface-300 bg-interface-100 dark:border-dark-interface-200 dark:bg-dark-interface-100" : "text-text-purple hover:text-text-purple/70"} `}
                  onClick={() => {
                    setSelectedTable(table.tableName);
                  }}
                >
                  <div>{table.icon}</div>
                  <div>{table.tableName}</div>
                </div>
              ))}
            </div>
            {selectedTable === "Summary" ? (
              <SummaryTable
                summaryData={[
                  {
                    group: "All Validators",
                    attestations: 15,
                    proposals: 0,
                    validators: 5,
                    efficiency: 80,
                    clRewards: 0.005
                  },
                  {
                    group: "Lido",
                    attestations: 15,
                    proposals: 0,
                    validators: 2,
                    efficiency: 90,
                    clRewards: 0.002
                  },
                ]}
              />
            ) : selectedTable === "Rewards" ? (
              <div>Rewards table</div>
            ) : (
              selectedTable === "Blocks" && (
                <BlocksTable
                  blocksData={[
                    {
                      proposer: 1762648,
                      epoch: 67342,
                      slot: 2154970,
                      group: "Lido",
                      status: "proposed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 83696,
                      slot: 2678289,
                      group: "Lido",
                      status: "missed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 67342,
                      slot: 2154970,
                      group: "Lido",
                      status: "proposed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 83696,
                      slot: 2678289,
                      group: "Lido",
                      status: "missed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 67342,
                      slot: 2154970,
                      group: "Lido",
                      status: "proposed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 83696,
                      slot: 2678289,
                      group: "Lido",
                      status: "missed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 67342,
                      slot: 2154970,
                      group: "Lido",
                      status: "proposed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 83696,
                      slot: 2678289,
                      group: "Lido",
                      status: "missed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 67342,
                      slot: 2154970,
                      group: "Lido",
                      status: "proposed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 83696,
                      slot: 2678289,
                      group: "Lido",
                      status: "missed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 67342,
                      slot: 2154970,
                      group: "Lido",
                      status: "proposed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 83696,
                      slot: 2678289,
                      group: "Lido",
                      status: "missed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 67342,
                      slot: 2154970,
                      group: "Lido",
                      status: "proposed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 83696,
                      slot: 2678289,
                      group: "Lido",
                      status: "missed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 67342,
                      slot: 2154970,
                      group: "Lido",
                      status: "proposed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 83696,
                      slot: 2678289,
                      group: "Lido",
                      status: "missed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 67342,
                      slot: 2154970,
                      group: "Lido",
                      status: "proposed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 83696,
                      slot: 2678289,
                      group: "Lido",
                      status: "missed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 67342,
                      slot: 2154970,
                      group: "Lido",
                      status: "proposed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 83696,
                      slot: 2678289,
                      group: "Lido",
                      status: "missed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 67342,
                      slot: 2154970,
                      group: "Lido",
                      status: "proposed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 83696,
                      slot: 2678289,
                      group: "Lido",
                      status: "missed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 67342,
                      slot: 2154970,
                      group: "Lido",
                      status: "proposed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 83696,
                      slot: 2678289,
                      group: "Lido",
                      status: "missed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 67342,
                      slot: 2154970,
                      group: "Lido",
                      status: "proposed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 83696,
                      slot: 2678289,
                      group: "Lido",
                      status: "missed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 67342,
                      slot: 2154970,
                      group: "Lido",
                      status: "proposed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 83696,
                      slot: 2678289,
                      group: "Lido",
                      status: "missed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 67342,
                      slot: 2154970,
                      group: "Lido",
                      status: "proposed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 83696,
                      slot: 2678289,
                      group: "Lido",
                      status: "missed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 67342,
                      slot: 2154970,
                      group: "Lido",
                      status: "proposed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 83696,
                      slot: 2678289,
                      group: "Lido",
                      status: "missed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 67342,
                      slot: 2154970,
                      group: "Lido",
                      status: "proposed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 83696,
                      slot: 2678289,
                      group: "Lido",
                      status: "missed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 67342,
                      slot: 2154970,
                      group: "Lido",
                      status: "proposed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 83696,
                      slot: 2678289,
                      group: "Lido",
                      status: "missed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 67342,
                      slot: 2154970,
                      group: "Lido",
                      status: "proposed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 83696,
                      slot: 2678289,
                      group: "Lido",
                      status: "missed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 67342,
                      slot: 2154970,
                      group: "Lido",
                      status: "proposed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 83696,
                      slot: 2678289,
                      group: "Lido",
                      status: "missed",
                    },
                    {
                      proposer: 1762647,
                      epoch: 67342,
                      slot: 2154970,
                      group: "Lido",
                      status: "proposed",
                    },
                    {
                      proposer: 1762646,
                      epoch: 83696,
                      slot: 2678289,
                      group: "Lido",
                      status: "missed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 67342,
                      slot: 2154970,
                      group: "Lido",
                      status: "proposed",
                    },
                    {
                      proposer: 1762642,
                      epoch: 83696,
                      slot: 2678289,
                      group: "Lido",
                      status: "missed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 67342,
                      slot: 2154970,
                      group: "Lido",
                      status: "proposed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 83696,
                      slot: 2678289,
                      group: "Lido",
                      status: "missed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 67342,
                      slot: 2154970,
                      group: "Lido",
                      status: "proposed",
                    },
                    {
                      proposer: 1762648,
                      epoch: 83696,
                      slot: 2678289,
                      group: "Lido",
                      status: "missed",
                    },
                  ]}
                />
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
