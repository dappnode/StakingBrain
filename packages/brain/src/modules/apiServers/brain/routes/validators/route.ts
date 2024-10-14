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
      if (tag && !tag.includes(details.tag)) continue;

      const tagList = tagValidatorsMap.get(details.tag) || [];

      if (format === "index") {
        if (!details.index) {
          logger.warn(
            `Validator ${pubkey} does not have an index, a possible cause is that the deposit has not been processed yet`
          );
          continue;
        }
        tagList.push(details.index.toString());
      } else tagList.push(pubkey);

      tagValidatorsMap.set(details.tag, tagList);
    }

    res.send(Object.fromEntries(tagValidatorsMap));
  } catch (e) {
    logger.error(e);
    res.status(500).send({ message: "Internal server error" });
  }
});

export default validatorsRouter;
