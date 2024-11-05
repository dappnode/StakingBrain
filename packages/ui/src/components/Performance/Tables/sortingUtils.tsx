import React, { ReactNode } from "react";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { Column } from "@tanstack/react-table";

export const getSortIndicator = ({
  column,
}: {
  column: Column<any, any>;
}): ReactNode => {
  let sortIndicator: ReactNode = null;

  if (column?.getIsSorted()) {
    sortIndicator =
      column.getIsSorted() === "desc" ? (
        <KeyboardArrowDownIcon style={{ fontSize: "16px" }} />
      ) : (
        <KeyboardArrowUpIcon style={{ fontSize: "16px" }} />
      );
  } else if (column?.getCanSort()) {
    sortIndicator = <UnfoldMoreIcon style={{ fontSize: "16px" }} />;
  }

  return sortIndicator;
};

export const toggleSort = (
  event: React.MouseEvent | React.KeyboardEvent,
  column: Column<any, any>,
) => {
  const toggleHandler = column.getToggleSortingHandler();
  if (toggleHandler) {
    toggleHandler(event);
  }
};
