import express from "express";
import { tags as availableTags, Tag } from "@stakingbrain/common";
import logger from "../../logger/index.js";
import { brainDb, signerApi } from "../../../index.js";

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
      pubkeys,
    } = req.body;

    // Validate request body
    const errors = validateRequestBody(
      keystores,
      passwords,
      slashingProtection,
      tags,
      feeRecipients,
      pubkeys
    );
    if (errors.length > 0)
      res.status(400).send({ message: `Bad request: ${errors.join(". ")}` });

    // Import keystores + passwords + slashingProtection onto the web3signer
    await signerApi
      .importKeystores({
        keystores,
        passwords,
        slashingProtection,
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).send({ message: "Internal server error" });
      });

    // TODO: Load pubkeys and feeRecipients into validator

    // 4. Write data on db (even if 3 fails)
    // TODO: create the array of objects of pubkeys + feeRecipients + tags
    brainDb.addPubkeys(pubkeys);

    // 5. Return response
    res.status(200).send({
      data: [{ status: "imported", message: "successfully imported" }],
    });
  });

  app.listen(3000, () => {
    logger.info("Launchpad API listening on port 3000");
  });
}

function validateRequestBody(
  keystores: any,
  passwords: any,
  slashing_protection: any,
  tags: any,
  feeRecipients: any,
  pubkeys: any
): string[] {
  const errors: string[] = [];

  if (!keystores) errors.push("keystores parameter is required");
  if (!passwords) errors.push("passwords parameter is required");
  if (!slashing_protection)
    errors.push("slashing_protection parameter is required");
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
    keystores.length !== passwords.length ||
    keystores.length !== tags.length ||
    keystores.length !== feeRecipients.length
  )
    errors.push(
      "keystores, passwords, tags and feeRecipients must have the same length"
    );

  return errors;
}
