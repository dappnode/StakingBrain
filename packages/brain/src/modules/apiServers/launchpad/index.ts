import express from "express";
import { tags as availableTags, Tag } from "@stakingbrain/common";
import logger from "../../logger/index.js";
import { brainDb, signerApi, signerUrl, validatorApi } from "../../../index.js";

export function startLaunchpadApi(): void {
  const app = express();
  app.use(express.json());
  app.post("/eth/v1/keystores", async (req, res) => {
    const {
      keystores,
      passwords,
      slashingProtection,
      tags,
      feeRecipients,
      dvtPubkey,
    } = req.body;

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
      // Import keystores + passwords + slashingProtection onto the web3signer
      await signerApi.importKeystores({
        keystores,
        passwords,
        slashing_protection: slashingProtection,
      });

      const pubkeys = keystores.map(
        (keystore: string) => JSON.parse(keystore).pubkey
      );

      await validatorApi
        .postRemoteKeys({
          remote_keys: pubkeys.map((pubkey: string) => {
            return {
              pubkey,
              url: signerUrl,
            };
          }),
        })
        .catch((err) => {
          logger.error(err);
        });
      for (const [index, pubkey] of pubkeys.entries())
        await validatorApi
          .setFeeRecipient(feeRecipients[index], pubkey)
          .catch((err) => {
            logger.error(err);
            feeRecipients[index] = "";
          });

      // Write data on db
      brainDb.addPubkeys({ pubkeys, tags, feeRecipients });

      // TODO: research for 2.x.x proper http code to return and the message with the possible errors

      // Return response
      res.status(200).send({
        data: [{ status: "imported", message: "successfully imported" }],
      });
    } catch (e) {
      logger.error(e);
      res.status(500).send({ message: "Internal server error" });
    }
  });

  app.listen(3000, () => {
    logger.info("Launchpad API listening on port 3000");
  });
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

  // print everything
  logger.info(`keystores: ${keystores}`);
  logger.info(`passwords: ${passwords}`);
  logger.info(`tags: ${tags}`);
  logger.info(`feeRecipients: ${feeRecipients}`);

  if (!keystores) errors.push("keystores parameter is required");
  if (!passwords) errors.push("passwords parameter is required");
  if (!tags) errors.push("tags parameter is required");
  if (!feeRecipients) errors.push("feeRecipients parameter is required");

  if (keystores && !Array.isArray(keystores))
    errors.push("keystores must be an array of strings");
  if (passwords && !Array.isArray(passwords))
    errors.push("passwords must be an array of strings");
  if (tags && !Array.isArray(tags))
    errors.push("tags must be an array of strings");
  if (tags && !(tags as Tag[]).some((tag) => availableTags.includes(tag)))
    errors.push(
      "tags must be one of the following: " + availableTags.join(", ")
    );
  if (feeRecipients && !Array.isArray(feeRecipients))
    errors.push("feeRecipients must be an array of strings");

  if (
    (passwords && keystores.length !== passwords.length) ||
    (tags && keystores.length !== tags.length) ||
    (feeRecipients && keystores.length !== feeRecipients.length)
  )
    errors.push(
      "keystores, passwords, tags and feeRecipients must have the same length"
    );

  return errors;
}
