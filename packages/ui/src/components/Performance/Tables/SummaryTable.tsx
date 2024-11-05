import { CellContext, Column, createColumnHelper } from "@tanstack/react-table";
import { SummaryTableProps } from "../../../types";
import DefalutTable from "./DefaultTable";
import { getSortIndicator, toggleSort } from "./sortingUtils";

export default function SummaryTable({
  summaryData,
}: {
  summaryData: SummaryTableProps[];
}): JSX.Element {
  const columnHelper = createColumnHelper<SummaryTableProps>();

  const getSummaryColumns = () => [
    columnHelper.accessor("group", {
      header: () => <div>Group</div>,
      cell: (info) => {
        const groupName = info.getValue();
        return (
          <IsAllValidatorsRow info={info}>
            <div>{groupName.toString()}</div>
          </IsAllValidatorsRow>
        );
      },
    }),
    columnHelper.accessor("validators", {
      header: ({ column }) => (
        <div onClick={(e) => toggleSort(e, column)}>
          Validators<span>{getSortIndicator({ column })}</span>
        </div>
      ),
      cell: (info) => {
        const validatorNum = info.getValue();
        return (
          <IsAllValidatorsRow info={info}>
            <div>{validatorNum.toString()}</div>
          </IsAllValidatorsRow>
        );
      },
    }),
    columnHelper.accessor("attestations", {
      header: () => <div>Attestations</div>,
      cell: (info) => {
        const attestations = info.getValue();
        return (
          <IsAllValidatorsRow info={info}>
            <div>{attestations.toString()}</div>
          </IsAllValidatorsRow>
        );
      },
    }),
    columnHelper.accessor("proposals", {
      header: () => <div>Proposals</div>,
      cell: (info) => {
        const proposals = info.getValue();
        return (
          <IsAllValidatorsRow info={info}>
            <div>{proposals.toString()}</div>
          </IsAllValidatorsRow>
        );
      },
    }),
    columnHelper.accessor("efficiency", {
      header: () => <div>Efficiency</div>,
      cell: (info) => {
        const efficiency = info.getValue();
        return (
          <IsAllValidatorsRow info={info}>
            <div>{efficiency.toString()}</div>
          </IsAllValidatorsRow>
        );
      },
    }),
    columnHelper.accessor("clRewards", {
      header: () => <div>CL Rewards</div>,
      cell: (info) => {
        const clRewards = info.getValue();
        return (
          <IsAllValidatorsRow info={info}>
            <div>
              {clRewards.toString()}
              <span> ETH</span>
            </div>
          </IsAllValidatorsRow>
        );
      },
    }),
  ];

  return (
    <DefalutTable
      title="Summary"
      data={summaryData}
      getColumns={getSummaryColumns}
      chartComponent={<div>Chart component</div>}
    />
  );
}

function IsAllValidatorsRow({
  children,
  info,
}: {
  children: JSX.Element;
  info: CellContext<SummaryTableProps, any>;
}): JSX.Element {
  return (
    <div className={`${info.row.id === "0" && "italic text-text-purple"}`}>
      {children}
    </div>
  );
}
