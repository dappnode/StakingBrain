import { Column, createColumnHelper } from "@tanstack/react-table";
import { BlocksTableProps } from "../../types";
import DefalutTable from "./DefaultTable";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { ReactNode } from "react";

export default function BlocksTable({
  blocksData,
}: {
  blocksData: BlocksTableProps[];
}): JSX.Element {
  const columnHelper = createColumnHelper<BlocksTableProps>();

  const getSortIndicator = ({
    column,
  }: {
    column: Column<any, any>;
  }): ReactNode => {
    let sortIndicator: ReactNode = null;

    if (column?.getIsSorted()) {
      sortIndicator =
        column.getIsSorted() === "desc" ? (
          <KeyboardArrowDownIcon />
        ) : (
          <KeyboardArrowUpIcon />
        );
    } else if (column?.getCanSort()) {
      sortIndicator = <UnfoldMoreIcon />;
    }

    return sortIndicator;
  };

  const toggleSort = (
    event: React.MouseEvent | React.KeyboardEvent,
    column: Column<any, any>,
  ) => {
    // Check if getToggleSortingHandler exists and then call the returned function with the event
    const toggleHandler = column.getToggleSortingHandler();
    if (toggleHandler) {
      toggleHandler(event);
    }
  };

  const getSummaryColumns = () => [
    columnHelper.accessor("proposer", {
      header: ({ column }) => {
        return (
          <div onClick={(e) => toggleSort(e, column)}>
            Proposer <span>{getSortIndicator({ column })}</span>
          </div>
        );
      },
      cell: (info) => {
        const proposer = info.getValue();
        return <div>{proposer.toString()}</div>;
      },
      enableSorting: true,
    }),
    columnHelper.accessor("group", {
      header:  ({ column }) => {
        return (
          <div onClick={(e) => toggleSort(e, column)}>
            Group <span>{getSortIndicator({ column })}</span>
          </div>
        );
      },
      cell: (info) => {
        const group = info.getValue();
        return <div>{group.toString()}</div>;
      },
    }),
    columnHelper.accessor("epoch", {
      header:  ({ column }) => {
        return (
          <div onClick={(e) => toggleSort(e, column)}>
            Epoch <span>{getSortIndicator({ column })}</span>
          </div>
        );
      },
      cell: (info) => {
        const epoch = info.getValue();
        return <div>{epoch.toString()}</div>;
      },
    }),
    columnHelper.accessor("slot", {
      header:  ({ column }) => {
        return (
          <div onClick={(e) => toggleSort(e, column)}>
            Slot <span>{getSortIndicator({ column })}</span>
          </div>
        );
      },
      cell: (info) => {
        const slot = info.getValue();
        return <div>{slot.toString()}</div>;
      },
    }),
    columnHelper.accessor("status", {
      header:  ({ column }) => {
        return (
          <div onClick={(e) => toggleSort(e, column)}>
            Status <span>{getSortIndicator({ column })}</span>
          </div>
        );
      },
      cell: (info) => {
        const status = info.getValue();
        return (
          <div>
            {status === "proposed" ? (
              <div>Proposed ✅</div>
            ) : status === "missed" ? (
              <div>Missed ❌</div>
            ) : (
              "unchosen"
            )}
          </div>
        );
      },
    }),
  ];

  return (
    <DefalutTable
      title="Blocks"
      data={blocksData}
      getColumns={getSummaryColumns}
      pagination
    />
  );
}
