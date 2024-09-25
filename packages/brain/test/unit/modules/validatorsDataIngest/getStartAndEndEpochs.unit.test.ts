import { getStartAndEndEpochs } from "../../../../dist/modules/validatorsDataIngest/getStartAndEndEpochs.js";
import { expect } from "chai";

describe("validatorsDataIngest - getStartAndEndEpochs", () => {
  it("should return correct start and end epochs for the given date range in Holesky", () => {
    // Define constants
    const minGenesisTime = 1695902100; // Use the provided minGenesisTime
    const secondsPerSlot = 12; // Use the provided secondsPerSlot

    // Define date range for testing
    const startDate = new Date("2024-09-24T06:40:00.000Z");
    const endDate = new Date("2024-09-24T07:05:36.000Z");

    // Calculate expected epochs
    const expectedStartEpoch = 81400;
    const expectedEndEpoch = 81404;

    // Call the function
    const result = getStartAndEndEpochs({
      minGenesisTime,
      secondsPerSlot,
      startDate,
      endDate
    });

    // Assert the results
    expect(result).to.deep.equal({
      startEpoch: expectedStartEpoch,
      endEpoch: expectedEndEpoch
    });
  });

  it("should return correct start and end epochs for the given date range in Holesky", () => {
    // Define constants
    const minGenesisTime = 1606824000; // Min genesis time ethereum
    const secondsPerSlot = 12; // Use the provided secondsPerSlot

    // Define date range for testing
    const startDate = new Date("Sep-25-2024 16:46:47 UTC+2");
    const endDate = new Date("Sep-25-2024 17:57:11 UTC+2");

    // Call the function
    const result = getStartAndEndEpochs({
      minGenesisTime,
      secondsPerSlot,
      startDate,
      endDate
    });

    // Assert the results
    expect(result).to.deep.equal({
      startEpoch: 313676,
      endEpoch: 313687
    });
  });
});
