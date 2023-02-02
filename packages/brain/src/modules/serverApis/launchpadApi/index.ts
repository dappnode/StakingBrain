import express from "express";
import {
  tags as availableTags,
  PubkeyDetails,
  StakingBrainDb,
  Tag,
} from "@stakingbrain/common";
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

    // Import keystores + passwords + slashingProtection onto the web3signer
    await signerApi
      .importKeystores({
        keystores,
        passwords,
        slashing_protection: slashingProtection,
      })
      .catch((err) => {
        logger.error(err);
        res.status(500).send({ message: "Internal server error" });
      });

    const pubkeysDetails = buildPubkeysDetails(keystores, tags, feeRecipients);

    // TODO: Load pubkeys and feeRecipients into validator
    for (const pubkey in pubkeysDetails) {
      await postValidator().catch((err) => {
        pubkeysDetails[pubkey].feeRecipientValidator = "";
      });
    }

    // Write data on db
    brainDb.addPubkeys(pubkeysDetails);

    // Return response
    res.status(200).send({
      data: [{ status: "imported", message: "successfully imported" }],
    });
  });

  app.listen(3000, () => {
    logger.info("Launchpad API listening on port 3000");
  });
}

async function postValidator(): Promise<void> {}

function buildPubkeysDetails(
  keystores: string[],
  tags: Tag[],
  feeRecipients: string[]
): StakingBrainDb {
  const pubkeys = keystores.map((keystore: string) => {
    const keystoreJson = JSON.parse(keystore);
    return keystoreJson.pubkey;
  });

  // Create an object where each key is the pubkey and the value is an object with the tag and feeRecipient
  const pubkeysDetails: StakingBrainDb = pubkeys.reduce(
    (
      acc: {
        [x: string]: {
          tag: Tag;
          feeRecipient: string;
          feeRecipientValidator: string;
          automaticImport: boolean;
        };
      },
      pubkey: string
    ) => {
      acc[pubkey] = {
        tag: tags[pubkeys.indexOf(pubkey)],
        feeRecipient: feeRecipients[pubkeys.indexOf(pubkey)],
        feeRecipientValidator: feeRecipients[pubkeys.indexOf(pubkey)],
        automaticImport: true,
      };
      return acc;
    },
    {} as { [pubkey: string]: PubkeyDetails }
  );
  return pubkeysDetails;
}

function validateRequestBody(
  keystores: any,
  passwords: any,
  tags: any,
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
