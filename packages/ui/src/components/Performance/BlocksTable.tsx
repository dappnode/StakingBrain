import { createColumnHelper } from "@tanstack/react-table";
import { BlocksTableProps } from "../../types";
import DefalutTable from "./DefaultTable";

export default function BlocksTable({
  blocksData,
}: {
  blocksData: BlocksTableProps[];
}): JSX.Element {
  const columnHelper = createColumnHelper<BlocksTableProps>();

  const getSummaryColumns = () => [
    columnHelper.accessor("proposer", {
      header: () => <div>Proposer</div>,
      cell: (info) => {
        const proposer = info.getValue();
        return <div>{proposer.toString()}</div>;
      },
    }),
    columnHelper.accessor("group", {
      header: () => <div>Group</div>,
      cell: (info) => {
        const group = info.getValue();
        return <div>{group.toString()}</div>;
      },
    }),
    columnHelper.accessor("epoch", {
      header: () => <div>Epoch</div>,
      cell: (info) => {
        const epoch = info.getValue();
        return <div>{epoch.toString()}</div>;
      },
    }),
    columnHelper.accessor("slot", {
      header: () => <div>Slot</div>,
      cell: (info) => {
        const slot = info.getValue();
        return <div>{slot.toString()}</div>;
      },
    }),
    columnHelper.accessor("status", {
      header: () => <div>Status</div>,
      cell: (info) => {
        const status = info.getValue();
        return (
          <div>
            {status === "proposed"
              ? <div>Proposed ✅</div>
              
              : status === "missed"
                ? <div>Missed ❌</div>
                : "unchosen"}
          </div>
        );
      },
    }),
  ];

  return <DefalutTable title="Blocks" data={blocksData} getColumns={getSummaryColumns} />;
}
