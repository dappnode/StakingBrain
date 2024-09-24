/**
 * Get the start and end epochs for the given date range
 *
 * @param minGenesisTime - The minimum genesis time of the chain
 * @param secondsPerSlot - The number of seconds per slot in the chain
 * @param startDate - The start date of the date range
 * @param endDate - The end date of the date range
 * @returns the start and end epochs for the given date range
 */
export function getStartAndEndEpochs({
  minGenesisTime,
  secondsPerSlot,
  startDate,
  endDate
}: {
  minGenesisTime: number;
  secondsPerSlot: number;
  startDate: Date;
  endDate: Date;
}): { startEpoch: number; endEpoch: number } {
  return {
    startEpoch: getEpochFromDate(startDate, minGenesisTime, secondsPerSlot),
    endEpoch: getEpochFromDate(endDate, minGenesisTime, secondsPerSlot)
  };
}

function getEpochFromDate(date: Date, minGenesisTime: number, secondsPerSlot: number): number {
  const currentUnixTime = Math.floor(date.getTime() / 1000);
  const timeDifference = currentUnixTime - minGenesisTime; // Time difference in seconds
  const slotsSinceGenesis = timeDifference / secondsPerSlot; // Slots since genesis
  return Math.floor(slotsSinceGenesis / 32); // Current epoch
}
