import { CronJob } from "../cron";

/**
 * Start a cron job within the first 10% of the epoch.
 * if we are in the first 10% of the epoch we start the cron job if not we wait until the next epoch with a timeout.
 * - gnosis chain 80 seconds per epoch -> 8 seconds
 * - ethereum 384 seconds per epoch -> 38.4 seconds
 *
 * @param minGenesisTime - Minimum genesis time of the chain.
 * @param secondsPerSlot - Seconds per slot.
 * @param jobFunction - Cron job function.
 */
export function startWithinTenFirstPercentageOfEpoch({
  minGenesisTime,
  secondsPerSlot,
  slotsPerEpoch,
  jobFunction
}: {
  minGenesisTime: number;
  secondsPerSlot: number;
  slotsPerEpoch: number;
  jobFunction: CronJob;
}): void {
  const secondsToNextEpoch = getSecondsToNextEpoch({ minGenesisTime, secondsPerSlot });
  if (secondsToNextEpoch <= slotsPerEpoch * secondsPerSlot * 0.1) jobFunction.start();
  else setTimeout(() => jobFunction.start(), (secondsToNextEpoch + 3) * 1000);
}

/**
 * Get the seconds to the start of the next epoch based on the current Unix time and the minimum genesis time of the chain.
 *
 * @param {number} minGenesisTime - Minimum genesis time of the chain.
 * @param {number} secondsPerSlot - Seconds per slot.
 * @returns {number} - Seconds to the start of the next epoch.
 */
function getSecondsToNextEpoch({
  minGenesisTime,
  secondsPerSlot
}: {
  minGenesisTime: number;
  secondsPerSlot: number;
}): number {
  const currentUnixTime = Math.floor(Date.now() / 1000);
  const timeDifference = currentUnixTime - minGenesisTime; // Time difference in seconds
  const stlotsSinceGenesis = timeDifference / secondsPerSlot; // Slots since genesis
  const currentEpoch = Math.floor(stlotsSinceGenesis / 32); // Current epoch
  const nextEpochStartSlot = (currentEpoch + 1) * 32; // Slot at the start of the next epoch
  const nextEpochStartTime = nextEpochStartSlot * secondsPerSlot + minGenesisTime; // Time at the start of the next epoch in seconds
  return nextEpochStartTime - currentUnixTime; // Return the difference in seconds
}
