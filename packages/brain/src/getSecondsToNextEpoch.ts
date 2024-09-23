/**
 * Get the seconds to the start of the next epoch based on the current Unix time and the minimum genesis time of the chain.
 *
 * @param {number} minGenesisTime - Minimum genesis time of the chain.
 * @param {number} secondsPerSlot - Seconds per slot.
 * @returns {number} - Seconds to the start of the next epoch.
 */
export function getSecondsToNextEpoch({
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
