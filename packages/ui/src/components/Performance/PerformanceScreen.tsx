import { useEffect, useState } from "react";
import { rpcClient } from "../../socket";
import {
  CustomValidatorGetResponse,
  ValidatorsDataProcessed,
} from "@stakingbrain/brain";
import { CircularProgress } from "@mui/material";
import SummaryTable from "./SummaryTable";
import { PerformanceTableTypes } from "../../types";
import BlocksTable from "./BlocksTable";

export default function PerformanceScreen(): JSX.Element {
  const [validators, setValidators] = useState<CustomValidatorGetResponse[]>();
  const [performanceData, setPerformanceData] =
    useState<Map<number, ValidatorsDataProcessed>>();
  const [loading, setLoading] = useState(false);
  const [selectedTable, setSelectedTable] =
    useState<PerformanceTableTypes>("Summary");

  const performanceTables: PerformanceTableTypes[] = [
    "Summary",
    "Rewards",
    "Blocks",
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
    <div className="flex h-full w-full items-center justify-center">
      {loading ? (
        <CircularProgress
          sx={{
            color: "#9333ea",
          }}
        />
      ) : (
        <div className="flex h-full w-4/5 flex-col">
          <div className="flex flex-row">
            {performanceTables.map((tableName) => (
              <div
                className={`cursor-pointer px-4 py-3 text-lg ${selectedTable === tableName ? "rounded border-l border-r border-t border-interface-300 bg-interface-100 dark:border-dark-interface-400 dark:bg-dark-interface-100" : "text-text-purple hover:text-text-purple/70"} `}
                onClick={() => {
                  setSelectedTable(tableName);
                }}
              >
                {tableName}
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
                  validators: 2,
                },
                {
                  group: "Lido",
                  attestations: 15,
                  proposals: 0,
                  validators: 2,
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
                ]}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}
