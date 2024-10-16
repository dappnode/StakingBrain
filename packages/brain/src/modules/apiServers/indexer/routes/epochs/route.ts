import express from "express";
import logger from "../../../../logger/index.js";
import { validateQueryParams } from "./validation.js";
import { RequestParsed } from "./types.js";
import { BrainDataBase } from "../../../../db/index.js";
import { PostgresClient } from "../../../../apiClients/index.js";
import { Tag } from "@stakingbrain/common";
import { ValidatorsDataPerEpochMap } from "../../../../apiClients/types.js";
import { StakingBrainDb } from "../../../../db/types.js";

export const createIndexerEpochsRouter = ({
  postgresClient,
  brainDb
}: {
  postgresClient: PostgresClient;
  brainDb: BrainDataBase;
}) => {
  const epochsRouter = express.Router();
  const epochsEndpoint = "/api/v0/indexer/epochs";

  epochsRouter.get(epochsEndpoint, validateQueryParams, async (req: RequestParsed, res) => {
    const { start, end, tag } = req.query;

    try {
      const brainDbData = brainDb.getData();
      const validatorsTagIndexesMap = getValidatorsTagsIndexesMap({ brainDbData, tag });

      // If validatorIndexes is empty, return empty object
      if (validatorsTagIndexesMap.size === 0) {
        res.send({});
        return;
      }

      const tagsEpochsMap = await getTagsEpochsMap({ postgresClient, validatorsTagIndexesMap, start, end });

      res.send(tagsEpochsMap);
    } catch (e) {
      logger.error(e);
      res.status(500).send({ message: "Internal server error" });
    }
  });

  return epochsRouter;
};

function getValidatorsTagsIndexesMap({
  brainDbData,
  tag
}: {
  brainDbData: StakingBrainDb;
  tag?: Tag[];
}): Map<Tag, number[]> {
  const validatorsTagIndexesMap = new Map<Tag, number[]>();
  if (tag) {
    for (const t of tag) {
      if (!brainDbData[t]) continue;
      const index = brainDbData[t].index;
      if (!index) continue;
      if (!validatorsTagIndexesMap.has(t)) validatorsTagIndexesMap.set(t, []);
      validatorsTagIndexesMap.get(t)!.push(index);
    }
  } else {
    for (const [_, details] of Object.entries(brainDbData)) {
      if (!details.index) continue;
      if (!validatorsTagIndexesMap.has(details.tag)) validatorsTagIndexesMap.set(details.tag, []);
      validatorsTagIndexesMap.get(details.tag)!.push(details.index);
    }
  }

  return validatorsTagIndexesMap;
}

async function getTagsEpochsMap({
  postgresClient,
  validatorsTagIndexesMap,
  start,
  end
}: {
  postgresClient: PostgresClient;
  validatorsTagIndexesMap: Map<Tag, number[]>;
  start: number;
  end: number;
}): Promise<Map<number, Map<Tag, ValidatorsDataPerEpochMap>>> {
  const tagsEpochsMap: Map<number, Map<Tag, ValidatorsDataPerEpochMap>> = new Map();

  // Get epochs data for each tag
  for (const [tag, indexes] of validatorsTagIndexesMap) {
    const epochsValidatorsMap = await postgresClient.getEpochsDataMapForEpochRange({
      validatorIndexes: indexes.map((index) => index.toString()),
      startEpoch: start,
      endEpoch: end
    });

    for (const [epoch, validatorsDataMap] of epochsValidatorsMap) {
      if (!tagsEpochsMap.has(epoch)) tagsEpochsMap.set(epoch, new Map());

      if (!tagsEpochsMap.get(epoch)!.has(tag)) tagsEpochsMap.get(epoch)!.set(tag, new Map());

      for (const [validatorIndex, data] of validatorsDataMap)
        tagsEpochsMap.get(epoch)!.get(tag)!.set(validatorIndex, data);
    }
  }

  return tagsEpochsMap;
}
