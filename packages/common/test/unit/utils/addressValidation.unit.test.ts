import { isValidNonWithdrawableBlsAddress, isValidWithdrawableBlsAddress } from "../../../src/utils/index.js";
import { expect } from "chai";

describe("isValidWithdrawableBlsAddress", () => {
  it("should return true for a valid address", () => {
    const validAddress = "0x010000000000000000000000900f3310573f1675ae865119e2007b32971ef64b";
    const result = isValidWithdrawableBlsAddress(validAddress);
    expect(result).to.be.true;
  });

  it("should return false for a valid address with invalid characters", () => {
    const invalidAddress = "0x0100000000000000000000000000000000000000000000000000000000000000000000g";
    const result = isValidWithdrawableBlsAddress(invalidAddress);
    expect(result).to.be.false;
  });

  it("should return false for a valid non withdrawable address", () => {
    const invalidAddress = "0x000000000000000000000000900f3310573f1675ae865119e2007b32971ef64b";
    const result = isValidWithdrawableBlsAddress(invalidAddress);
    expect(result).to.be.false;
  });

  it("should return false for a valid address with an incorrect length", () => {
    const invalidAddress = "0x01000000000000000000000000000000000000000000000000000000000000000000000";
    const result = isValidWithdrawableBlsAddress(invalidAddress);
    expect(result).to.be.false;
  });
});

describe("isValidNonWithdrawableBlsAddress", () => {
  it("should return true for a valid non-withdrawable address", () => {
    const validAddress = "0x002ae50437bd418124f7efe1af38cf0e6e8655555e28f18e2c8722239407d11b";
    const result = isValidNonWithdrawableBlsAddress(validAddress);
    expect(result).to.be.true;
  });

  it("should return false for a non-withdrawable address with invalid characters", () => {
    const invalidAddress = "0x0011111111111111111111111111111111111111111111111111111111111111111111g";
    const result = isValidNonWithdrawableBlsAddress(invalidAddress);
    expect(result).to.be.false;
  });

  it("should return false for a withdrawable address", () => {
    const invalidAddress = "0x010000000000000000000000900f3310573f1675ae865119e2007b32971ef64b";
    const result = isValidNonWithdrawableBlsAddress(invalidAddress);
    expect(result).to.be.false;
  });

  it("should return false for a non-withdrawable address with an incorrect length", () => {
    const invalidAddress = "0x002ae50437bd418124f7efe1af38cf0e6e8655555e28f18e2c8722239407d1";
    const result = isValidNonWithdrawableBlsAddress(invalidAddress);
    expect(result).to.be.false;
  });
});
