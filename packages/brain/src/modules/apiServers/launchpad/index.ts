import express from "express";
import { tags as availableTags, Tag, Web3signerDeleteRequest } from "@stakingbrain/common";
import cors from "cors";
import logger from "../../logger/index.js";
import http from "node:http";
import { params } from "../../../params.js";
import { importValidators } from "../../../calls/importValidators.js";
import { deleteValidators } from "../../../calls/deleteValidators.js";

export function startLaunchpadApi(): http.Server {
  const app = express();
  const server = new http.Server(app);
  app.use(express.json());
  app.use(
    cors({
      origin: [
        "http://rocketpool-testnet.public.dappnode", // TODO: deprecate after holesky published
        "http://rocketpool.dappnode", // Mainnet
        "http://stader-testnet.dappnode", // Testnet
        "http://stader.dappnode", // Mainnet
      ],
    })
  );
  app.post("/eth/v1/keystores", async (req, res) => {
    const { keystores, passwords, slashingProtection, tags, feeRecipients } =
      req.body;

    // Validate request body
    const errors = validateImportKeystoresRequestBody(
      keystores,
      passwords,
      tags,
      feeRecipients
    );
    if (errors.length > 0) {
      res.status(400).send({ message: `Bad request: ${errors.join(". ")}` });
      return;
    }

    try {
      const importResponse = await importValidators({
        importFrom: "api",
        validatorsImportRequest: keystores.map(
          (keystore: string, index: number) => ({
            keystore,
            password: passwords[index],
            tag: tags[index],
            feeRecipient: feeRecipients[index],
          })
        ),
        slashing_protection: slashingProtection,
      });

      res.status(200).send(importResponse);
    } catch (e) {
      logger.error(e);
      res.status(500).send({ message: "Internal server error" });
    }
  });

  // Following schema: https://ethereum.github.io/keymanager-APIs/#/Remote%20Key%20Manager/deleteRemoteKeys
  app.delete("/eth/v1/keystores", async (req, res) => {
    const deleteRequest = req.body as Web3signerDeleteRequest;

    // Validate request body
    const errors = validateDeleteRequestBody(deleteRequest);
    if (errors.length > 0) {
      res.status(400).send({ message: `Bad request: ${errors.join(". ")}` });
      return;
    }

    try {
      const deleteResponse = await deleteValidators(deleteRequest);

      res.status(200).send(deleteResponse);
    } catch (e) {
      logger.error(e);
      res.status(500).send({ message: "Internal server error" });
    }
  });

  server.listen(params.launchpadPort, () => {
    logger.info(`Launchpad API listening on port ${params.launchpadPort}`);
  });

  return server;
}

function validateImportKeystoresRequestBody(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keystores: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  passwords: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tags: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  feeRecipients: any
): string[] {
  const errors: string[] = [];

  if (!keystores) errors.push("keystores parameter is required. ");
  if (!passwords) errors.push("passwords parameter is required. ");
  if (!tags) errors.push("tags parameter is required. ");
  if (!feeRecipients) errors.push("feeRecipients parameter is required. ");

  if (keystores && !Array.isArray(keystores))
    errors.push("keystores must be an array of strings. ");
  if (passwords && !Array.isArray(passwords))
    errors.push("passwords must be an array of strings. ");
  if (tags && !Array.isArray(tags))
    errors.push("tags must be an array of strings. ");
  if (tags && !(tags as Tag[]).some((tag) => availableTags.includes(tag)))
    errors.push(
      "tags must be one of the following: " + availableTags.join(", ")
    );
  if (feeRecipients && !Array.isArray(feeRecipients))
    errors.push("feeRecipients must be an array of strings. ");

  if (
    (passwords && keystores.length !== passwords.length) ||
    (tags && keystores.length !== tags.length) ||
    (feeRecipients && keystores.length !== feeRecipients.length)
  )
    errors.push(
      "keystores, passwords, tags and feeRecipients must have the same length. "
    );

  return errors;
}

function validateDeleteRequestBody(deleteReq: Web3signerDeleteRequest): string[] {
  const errors: string[] = [];
  const { pubkeys } = deleteReq;

  if (!pubkeys) {
    errors.push("pubkeys parameter is required.");
  } else if (!Array.isArray(pubkeys)) {
    errors.push("pubkeys must be an array of strings.");
  } else {
    const hexPattern = /^0x[a-fA-F0-9]{96}$/;
    pubkeys.forEach(pubkey => {
      if (!hexPattern.test(pubkey)) {
        errors.push(`Invalid pubkey format: ${pubkey}. Expected format is 0x followed by 96 hexadecimal characters.`);
      }
    });
  }

  return errors;
}

