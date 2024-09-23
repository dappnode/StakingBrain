import { getStartAndEndEpochs } from "./getStartAndEndEpochs.js";
import { Granularity } from "./types.js";

export function getIntervalsEpochs({
  startDate,
  endDate,
  granularity,
  minGenesisTime,
  secondsPerSlot
}: {
  startDate: Date;
  endDate: Date;
  granularity: Granularity;
  minGenesisTime: number;
  secondsPerSlot: number;
}): { startEpoch: number; endEpoch: number }[] {
  // Calculate the number of intervals based on the granularity
  const numberOfIntervals = getNumberOfIntervals({ startDate, endDate, granularity });
  return Array.from({ length: numberOfIntervals }, (_, idx) => {
    return getStartAndEndEpochs({
      minGenesisTime,
      secondsPerSlot,
      startDate: new Date(startDate.getTime() + idx * granularity),
      endDate: new Date(startDate.getTime() + (idx + 1) * granularity)
    });
  });
}

function getNumberOfIntervals({
  startDate,
  endDate,
  granularity
}: {
  startDate: Date;
  endDate: Date;
  granularity: Granularity;
}): number {
  // Calculate the total amount of time based on the granularity
  const totalAmountOfTime = endDate.getTime() - startDate.getTime();
  return Math.floor(totalAmountOfTime / granularity); // Use Math.floor for proper interval count
}
