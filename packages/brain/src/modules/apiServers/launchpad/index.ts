import express from "express";
import { tags as availableTags, Tag } from "@stakingbrain/common";
import logger from "../../logger/index.js";
import http from "node:http";
import { params } from "../../../params.js";
import { importValidators } from "../../../calls/importValidators.js";

export function startLaunchpadApi(): http.Server {
  const app = express();
  const server = new http.Server(app);
  app.use(express.json());
  app.post("/eth/v1/keystores", async (req, res) => {
    const { keystores, passwords, slashingProtection, tags, feeRecipients } =
      req.body;

    // Validate request body
    const errors = validateRequestBody(
      keystores,
      passwords,
      tags,
      feeRecipients
    );
    if (errors.length > 0)
      res.status(400).send({ message: `Bad request: ${errors.join(". ")}` });

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

  server.listen(params.launchpadPort, () => {
    logger.info(`Launchpad API listening on port ${params.launchpadPort}`);
  });

  return server;
}

function validateRequestBody(
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
