import { Tag } from "@stakingbrain/common";
import express from "express";
import { getAndValidateQueryParameters } from "./validation.js";
import logger from "../../../../logger/index.js";
import { brainDb } from "../../../../../index.js";

const validatorsRouter = express.Router();

const validatorsEndpoint = "/api/v0/brain/validators";

validatorsRouter.get(validatorsEndpoint, async (req, res) => {
  const result = getAndValidateQueryParameters(req.query);
  if (result instanceof Error) {
    res.status(400).send({ message: `Bad request: ${result}` });
    return;
  }

  const { format, tag } = result;

  try {
    const validators = brainDb.getData();

    const tagValidatorsMap = new Map<Tag, string[]>();

    for (const [pubkey, details] of Object.entries(validators)) {
      if (!tag?.includes(details.tag)) continue;

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

    res.send(Object.fromEntries(tagValidatorsMap));
  } catch (e) {
    logger.error(e);
    res.status(500).send({ message: "Internal server error" });
  }
});

export default validatorsRouter;
