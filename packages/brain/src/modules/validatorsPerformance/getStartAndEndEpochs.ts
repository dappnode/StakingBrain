export function getStartAndEndEpochs(
  minGenesisTime: number,
  secondsPerSlot: number,
  dateRange?: { startDate: Date; endDate: Date }
): { startEpoch: number; endEpoch: number } {
  if (dateRange)
    return {
      startEpoch: getEpochFromDate(dateRange.startDate, minGenesisTime, secondsPerSlot),
      endEpoch: getEpochFromDate(dateRange.endDate, minGenesisTime, secondsPerSlot)
    };
  else {
    // calculate the date from 7 days ago and its epoch
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return {
      startEpoch: getEpochFromDate(sevenDaysAgo, minGenesisTime, secondsPerSlot),
      endEpoch: getEpochFromDate(new Date(), minGenesisTime, secondsPerSlot)
    };
  }
}

function getEpochFromDate(date: Date, minGenesisTime: number, secondsPerSlot: number): number {
  const currentUnixTime = Math.floor(date.getTime() / 1000);
  const timeDifference = currentUnixTime - minGenesisTime; // Time difference in seconds
  const slotsSinceGenesis = timeDifference / secondsPerSlot; // Slots since genesis
  return Math.floor(slotsSinceGenesis / 32); // Current epoch
}
