import { expect } from "chai";
import { getIntervalsEpochs } from "../../../../src/modules/validatorsDataIngest/getIntervalsEpochs.js";
import { Granularity } from "../../../../src/modules/validatorsDataIngest/types.js";

describe("validatorsDataIngest - getIntervalsEpochs", () => {
  const minGenesisTime = 1695902100; // Min genesis time Holesky
  const secondsPerSlot = 12; // Seconds per slot

  it("should return correct intervals for daily granularity", () => {
    const startDate = new Date("2024-09-22T00:00:00Z");
    const endDate = new Date("2024-09-23T00:00:00Z");
    const granularity = Granularity.Daily;

    const intervals = getIntervalsEpochs({
      startDate,
      endDate,
      granularity,
      minGenesisTime,
      secondsPerSlot
    });

    expect(intervals.length).to.equal(1);
    expect(intervals[0]).to.deep.equal({
      startEpoch: 80888,
      endEpoch: 81113
    });
  });

  it("should return correct intervals for hourly granularity", () => {
    const startDate = new Date("2024-09-22T00:00:00Z");
    const endDate = new Date("2024-09-22T02:00:00Z");
    const granularity = Granularity.Hourly;

    const intervals = getIntervalsEpochs({
      startDate,
      endDate,
      granularity,
      minGenesisTime,
      secondsPerSlot
    });

    expect(intervals.length).to.equal(2);
    expect(intervals[0]).to.deep.equal({
      startEpoch: 80888,
      endEpoch: 80897
    });
    expect(intervals[1]).to.deep.equal({
      startEpoch: 80897,
      endEpoch: 80907
    });
  });

  it("should return correct intervals for weekly granularity", () => {
    const startDate = new Date("2024-08-01T00:00:00Z");
    const endDate = new Date("2024-08-15T00:00:00Z");
    const granularity = Granularity.Weekly;

    const intervals = getIntervalsEpochs({
      startDate,
      endDate,
      granularity,
      minGenesisTime,
      secondsPerSlot
    });

    expect(intervals.length).to.equal(2);
    expect(intervals[0]).to.deep.equal({
      startEpoch: 69188,
      endEpoch: 70763
    });
    expect(intervals[1]).to.deep.equal({
      startEpoch: 70763,
      endEpoch: 72338
    });
  });

  it("should handle cases where endDate is the same as startDate", () => {
    const startDate = new Date("2023-01-01T00:00:00Z");
    const endDate = new Date("2023-01-01T00:00:00Z");
    const granularity = Granularity.Hourly;

    const intervals = getIntervalsEpochs({
      startDate,
      endDate,
      granularity,
      minGenesisTime,
      secondsPerSlot
    });

    expect(intervals.length).to.equal(0);
  });

  it("should return an empty array for invalid date ranges", () => {
    const startDate = new Date("2023-01-02T00:00:00Z");
    const endDate = new Date("2023-01-01T00:00:00Z");
    const granularity = Granularity.Hourly;

    const intervals = getIntervalsEpochs({
      startDate,
      endDate,
      granularity,
      minGenesisTime,
      secondsPerSlot
    });

    expect(intervals.length).to.equal(0);
  });
});
