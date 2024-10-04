import {
  createColumnHelper
} from "@tanstack/react-table";
import { SummaryTableProps } from "../../types";
import DefalutTable from "./DefaultTable";



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
        return <div>{groupName.toString()}</div>;
      },
    }),
    columnHelper.accessor("validators", {
      header: () => <div>Validators</div>,
      cell: (info) => {
        const validatorNum = info.getValue();
        return <div>{validatorNum.toString()}</div>;
      },
    }),
    columnHelper.accessor("attestations", {
      header: () => <div>Attestations</div>,
      cell: (info) => {
        const attestations = info.getValue();
        return <div>{attestations.toString()}</div>;
      },
    }),
    columnHelper.accessor("proposals", {
      header: () => <div>Proposals</div>,
      cell: (info) => {
        const proposals = info.getValue();
        return <div>{proposals.toString()}</div>;
      },
    }),
  ];

  return (
    <DefalutTable title="Summary" data={summaryData} getColumns={getSummaryColumns} />
  );
}
