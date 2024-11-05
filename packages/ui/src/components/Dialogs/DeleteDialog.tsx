import { Alert } from "@mui/material";
import { GridSelectionModel } from "@mui/x-data-grid";
import { shortenPubkey } from "@stakingbrain/common";
import type {
  CustomValidatorGetResponse,
  Web3signerDeleteResponse,
} from "@stakingbrain/brain";
import DefaultModal, { DefaultModalProps } from "./DefaultModal";
import { rpcClient } from "../../socket";
import { Button } from "@headlessui/react";

import { useState } from "react";
import DeletionWarning from "./DeletionWarning";

interface DeleteDialogProps {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedRows: GridSelectionModel;
  rows: CustomValidatorGetResponse[];
  setSelectedRows: (selectedRows: GridSelectionModel) => void;
}

export default function DeleteDialog({
  isOpen,
  setIsOpen,
  rows,
  selectedRows,
  setSelectedRows,
}: DeleteDialogProps): JSX.Element {
  const [keystoresDelete, setKeystoresDelete] =
    useState<Web3signerDeleteResponse>();
  const [keystoresDeleteError, setKeystoresDeleteError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function deleteSelectedKeystores() {
    try {
      setKeystoresDelete(undefined);
      setLoading(true);
      setKeystoresDelete(
        await rpcClient.call("deleteValidators", {
          pubkeys: selectedRows.map(
            (row) => rows[parseInt(row.toString())].pubkey,
          ),
        }),
      );
      setLoading(false);
      setKeystoresDeleteError(undefined);
      setSelectedRows([]);
    } catch (e) {
      console.error(e);
      setLoading(false);
      setKeystoresDeleteError(e.message);
    }
  }
  return (
    <DefaultModal
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      title={keystoresDelete ? "Done" : "Delete Keystores?"}
      children={
        <>
          <div>
            {keystoresDeleteError ? (
              `Error: ${keystoresDeleteError}`
            ) : keystoresDelete?.data ? (
              <div>
                {keystoresDelete.data.map((result, index) => (
                  <div>
                    <p className="text-lg">
                      {shortenPubkey(rows[index]?.pubkey)}
                    </p>
                    <p>
                      <b>Status:</b> {result.status}
                    </p>
                    {result.message ? (
                      <p>
                        <b>Message:</b> {result.message}
                      </p>
                    ) : null}
                  </div>
                ))}
                {keystoresDelete.slashing_protection ? (
                  <div>
                    <Alert severity="warning" variant="filled">
                      It is strongly recommended to stop the validator and watch
                      at least 3 missed attestations in the explorer before
                      uploading the keys to another machine.
                    </Alert>

                    {/* <Button
                    href={`data:text/json;charset=utf-8,${encodeURIComponent(keystoresDelete.slashing_protection)}`}
                    download="slashing_protection.json"
                  >
                    Download Slashing Protection Data
                  </Button> */}
                  </div>
                ) : null}
              </div>
            ) : (
              <div>
                {!loading ? (
                  <div className="animate-pulse bg-white p-5"> Loading</div>
                ) : (
                  <p>
                    <DeletionWarning rows={rows} selectedRows={selectedRows} />
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-row w-full justify-between">
            {!keystoresDelete && !loading ? (
              <Button
                onClick={() => deleteSelectedKeystores()}
                className="rounded-xl px-4 py-2 data-[active]:bg-red-700 data-[hover]:bg-red-500/80 dark:data-[hover]:bg-red-500/80 bg-interface-300 dark:bg-dark-interface-200 transition ease-in-out duration-300"
              >
                Delete
              </Button>
            ) : null}
            <Button
              onClick={() => setIsOpen(false)}
              className="rounded-xl bg-text-purple px-4 py-2 text-white data-[active]:bg-purple-700 data-[hover]:bg-text-purple/90 transition ease-in-out duration-300"
            >
              Close
            </Button>
          </div>
        </>
      }
    ></DefaultModal>
  );
}
