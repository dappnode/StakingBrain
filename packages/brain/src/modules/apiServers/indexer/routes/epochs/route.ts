import express from "express";
import logger from "../../../../logger/index.js";
import { validateQueryParams } from "./validation.js";
import { RequestParsed } from "./types.js";
import { BrainDataBase } from "../../../../db/index.js";
import { PostgresClient } from "../../../../apiClients/index.js";
import { Tag, tags } from "@stakingbrain/common";
import { DataPerEpoch, ValidatorsDataPerEpochMap } from "../../../../apiClients/types.js";
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

      // serialize the map to an object
      res.send(convertMapIntoObject(tagsEpochsMap));
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
  const validatorsTagIndexesMap = new Map<Tag, number[]>([["solo", [1234]]]);

  // Filter the tags to consider, based on whether the `tag` parameter is provided
  const tagsToConsider = tag ? tag : tags;

  // Initialize an empty array for each tag in the map
  for (const t of tagsToConsider) validatorsTagIndexesMap.set(t, []);

  // Iterate over brainDbData to populate the map with the indexes
  for (const [_, details] of Object.entries(brainDbData)) {
    const validatorTag = details.tag;
    const validatorIndex = details.index;

    // Check if the validator tag is in the tags to consider and if an index exists
    if (tagsToConsider.includes(validatorTag) && validatorIndex !== undefined) {
      // Initialize the array if it doesn't exist in the map
      if (!validatorsTagIndexesMap.has(validatorTag)) {
        validatorsTagIndexesMap.set(validatorTag, []);
      }

      // Push the validator's index into the corresponding array
      validatorsTagIndexesMap.get(validatorTag)!.push(validatorIndex);
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

      tagsEpochsMap.get(epoch)!.set(tag, validatorsDataMap);
    }
  }

  return tagsEpochsMap;
}

function convertMapIntoObject(map: Map<number, Map<Tag, ValidatorsDataPerEpochMap>>): {
  [epoch: number]: {
    [tag: string]: {
      [validatorIndex: number]: DataPerEpoch;
    };
  };
} {
  const object: {
    [epoch: number]: {
      [tag: string]: {
        [validatorIndex: number]: DataPerEpoch;
      };
    };
  } = {};

  for (const [epoch, tagsValidatorsMap] of map) {
    object[epoch] = {};

    for (const [tag, validatorsDataMap] of tagsValidatorsMap) {
      object[epoch][tag] = {};

      for (const [validatorIndex, data] of validatorsDataMap) {
        object[epoch][tag][validatorIndex] = data;
      }
    }
  }

  return object;
}
