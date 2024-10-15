import { Network, Tag } from "@stakingbrain/common";
import express from "express";
import { deleteValidators } from "../../../ui/calls/deleteValidators.js";
import { importValidators } from "../../../ui/calls/importValidators.js";
import { BrainKeystoreImportRequest } from "../../types.js";
import { validateDeleteRequestBody, validateImportKeystoresRequestBody } from "./validation.js";
import logger from "../../../../logger/index.js";
import { Web3signerDeleteRequest } from "../../../../apiClients/types.js";
import { CronJob } from "../../../../cron/cron.js";
import { BrainDataBase } from "../../../../db/index.js";
import { Web3SignerApi } from "../../../../apiClients/signer/index.js";
import { ValidatorApi } from "../../../../apiClients/validator/index.js";

export const createKeystoresRouter = ({
  signerApi,
  reloadValidatorsCronTask,
  network,
  validatorApi,
  signerUrl,
  brainDb
}: {
  signerApi: Web3SignerApi;
  reloadValidatorsCronTask: CronJob;
  network: Network;
  validatorApi: ValidatorApi;
  signerUrl: string;
  brainDb: BrainDataBase;
}) => {
  const keystoresRouter = express.Router();
  const keystoresEndpoint = "/eth/v1/keystores";

  // Following schema: https://ethereum.github.io/keymanager-APIs/#/Local%20Key%20Manager/listKeys
  keystoresRouter.post(keystoresEndpoint, async (req, res) => {
    const importRequest = req.body as BrainKeystoreImportRequest;

    try {
      validateImportKeystoresRequestBody(importRequest);
    } catch (e) {
      res.status(400).send({ message: `Bad request: ${e}` });
      return;
    }

    try {
      const importResponse = await importValidators({
        postRequest: {
          importFrom: "api",
          validatorsImportRequest: importRequest.keystores.map((keystore: string, index: number) => ({
            keystore,
            password: importRequest.passwords[index],
            tag: importRequest.tags[index] as Tag,
            feeRecipient: importRequest.feeRecipients[index]
          })),
          slashing_protection: importRequest.slashing_protection
        },
        reloadValidatorsCronTask,
        network,
        signerApi,
        validatorApi,
        signerUrl,
        brainDb
      });

      res.status(200).send(importResponse);
    } catch (e) {
      logger.error(e);
      res.status(500).send({ message: "Internal server error" });
    }
  });

  // Following schema: https://ethereum.github.io/keymanager-APIs/#/Remote%20Key%20Manager/deleteRemoteKeys
  keystoresRouter.delete(keystoresEndpoint, async (req, res) => {
    const deleteRequest = req.body as Web3signerDeleteRequest;

    try {
      validateDeleteRequestBody(deleteRequest);
    } catch (e) {
      res.status(400).send({ message: `Bad request: ${e}` });
      return;
    }

    try {
      const deleteResponse = await deleteValidators({
        deleteRequest,
        reloadValidatorsCronTask,
        validatorApi,
        signerApi,
        brainDb
      });

      res.status(200).send(deleteResponse);
    } catch (e) {
      logger.error(e);
      res.status(500).send({ message: "Internal server error" });
    }
  });

  keystoresRouter.get(keystoresEndpoint, async (_req, res) => {
    try {
      const getResponse = await signerApi.listRemoteKeys();

      res.status(200).send(getResponse);
    } catch (e) {
      logger.error(e);
      res.status(500).send({ message: "Internal server error" });
    }
  });

  return keystoresRouter;
};
