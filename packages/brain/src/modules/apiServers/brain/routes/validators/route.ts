import { Tag } from "@stakingbrain/common";
import express from "express";
import logger from "../../../../logger/index.js";
import { brainDb } from "../../../../../index.js";
import { validateQueryParams } from "./validation.js";
import { RequestParsed } from "./types.js";

const validatorsRouter = express.Router();

const validatorsEndpoint = "/api/v0/brain/validators";

validatorsRouter.get(validatorsEndpoint, validateQueryParams, async (req: RequestParsed, res) => {
  const { format, tag } = req.query;

  try {
    const validators = brainDb.getData();

    const tagValidatorsMap = new Map<Tag, string[]>();

    for (const [pubkey, details] of Object.entries(validators)) {
      // if tag not provided, include all validators. If tag provided, include only validators with that tag
      if (tag && !tag.includes(details.tag)) continue;

      const tagList = tagValidatorsMap.get(details.tag) || [];

      if (format === "index") {
        if (!details.index) {
          res.status(404).send({
            message: `Validator index not found for validator ${pubkey}. It might be not active. Consider using format pubkey`
          });
          return;
        }
        tagList.push(details.index.toString());
      } else tagList.push(pubkey);

      tagValidatorsMap.set(details.tag, tagList);
    }

    logger.debug(`tagValidatorsMap ${tagValidatorsMap}`);
    res.send(Object.fromEntries(tagValidatorsMap));
  } catch (e) {
    logger.error(e);
    res.status(500).send({ message: "Internal server error" });
  }
});

export default validatorsRouter;
