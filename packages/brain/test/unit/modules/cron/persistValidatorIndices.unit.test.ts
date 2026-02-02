import { expect } from "chai";
import { describe, it, beforeEach } from "mocha";
import { BrainDataBase } from "../../../../src/modules/db/index.js";
import { BeaconchainApi } from "../../../../src/modules/apiClients/index.js";
import { persistValidatorIndices } from "../../../../src/modules/cron/reloadValidators/persistValidatorIndices.js";
import { ValidatorStatus } from "../../../../src/modules/apiClients/beaconchain/types.js";
import fs from "fs";

describe("persistValidatorIndices", () => {
  const testDbName = "test-persist-validator-indices.json";
  let brainDb: BrainDataBase;

  // Use valid BLS pubkeys from the integration tests
  const mockPubkey1 = "0xa2cc280ce811bb680cba309103e23dc3c9902f2a08541c6737e8adfe8198e796023b959fc8aadfad39499b56ec3dd184";
  const mockPubkey2 = "0x86d25af52627204ab822a20ac70da6767952841edbcb0b83c84a395205313661de5f7f76efa475a46f45fa89d95c1dd7";
  const mockPubkey3 = "0x821a80380122281580ba8a56cd21956933d43c62fdc8f5b4ec31b2c620e8534e80b6b816c9a2cc8d25568dc4ebcfd47a";

  beforeEach(() => {
    // Clean up test database
    if (fs.existsSync(testDbName)) {
      fs.unlinkSync(testDbName);
    }
    brainDb = new BrainDataBase(testDbName);
  });

  afterEach(() => {
    // Clean up test database
    if (fs.existsSync(testDbName)) {
      fs.unlinkSync(testDbName);
    }
  });

  it("should fetch and persist indices and statuses for all validators", async () => {
    // Add validators to database
    brainDb.addValidators({
      validators: {
        [mockPubkey1]: {
          tag: "solo",
          feeRecipient: "0x1111111111111111111111111111111111111111",
          automaticImport: true
        },
        [mockPubkey2]: {
          tag: "solo",
          feeRecipient: "0x2222222222222222222222222222222222222222",
          automaticImport: false
        }
      }
    });

    // Mock BeaconchainApi
    const mockBeaconchainApi = {
      postStateValidators: async ({ stateId, body }: any) => {
        expect(stateId).to.equal("head");
        expect(body.ids).to.deep.equal([mockPubkey1, mockPubkey2]);
        expect(body.statuses).to.deep.equal([]);

        return {
          execution_optimistic: false,
          finalized: true,
          data: [
            {
              index: "123456",
              balance: "32000000000",
              status: ValidatorStatus.ACTIVE_ONGOING,
              validator: {
                pubkey: mockPubkey1,
                withdrawal_credentials: "0x010000000000000000000000abcdef1234567890abcdef1234567890abcdef12",
                effective_balance: "32000000000",
                slashed: false,
                activation_eligibility_epoch: "0",
                activation_epoch: "100",
                exit_epoch: "9999999999",
                withdrawable_epoch: "9999999999"
              }
            },
            {
              index: "654321",
              balance: "32000000000",
              status: ValidatorStatus.PENDING_QUEUED,
              validator: {
                pubkey: mockPubkey2,
                withdrawal_credentials: "0x010000000000000000000000abcdef1234567890abcdef1234567890abcdef12",
                effective_balance: "32000000000",
                slashed: false,
                activation_eligibility_epoch: "0",
                activation_epoch: "9999999999",
                exit_epoch: "9999999999",
                withdrawable_epoch: "9999999999"
              }
            }
          ]
        };
      }
    } as any;

    // Call the function
    await persistValidatorIndices({
      beaconchainApi: mockBeaconchainApi,
      brainDb
    });

    // Verify the data was persisted
    const dbData = brainDb.getData();

    expect(dbData[mockPubkey1].index).to.equal(123456);
    expect(dbData[mockPubkey1].status).to.equal(ValidatorStatus.ACTIVE_ONGOING);
    expect(dbData[mockPubkey1].feeRecipient).to.equal("0x1111111111111111111111111111111111111111");

    expect(dbData[mockPubkey2].index).to.equal(654321);
    expect(dbData[mockPubkey2].status).to.equal(ValidatorStatus.PENDING_QUEUED);
    expect(dbData[mockPubkey2].feeRecipient).to.equal("0x2222222222222222222222222222222222222222");
  });

  it("should update existing indices and statuses", async () => {
    // Add validators with existing indices
    brainDb.addValidators({
      validators: {
        [mockPubkey1]: {
          tag: "solo",
          feeRecipient: "0x1111111111111111111111111111111111111111",
          automaticImport: true
        }
      }
    });

    // Manually set initial index and status
    brainDb.updateValidators({
      validators: {
        [mockPubkey1]: {
          feeRecipient: "0x1111111111111111111111111111111111111111",
          index: 123456,
          status: ValidatorStatus.PENDING_QUEUED
        }
      }
    });

    // Mock BeaconchainApi with updated status
    const mockBeaconchainApi = {
      postStateValidators: async () => ({
        execution_optimistic: false,
        finalized: true,
        data: [
          {
            index: "123456",
            balance: "32000000000",
            status: ValidatorStatus.ACTIVE_ONGOING, // Status changed from PENDING_QUEUED to ACTIVE_ONGOING
            validator: {
              pubkey: mockPubkey1,
              withdrawal_credentials: "0x010000000000000000000000abcdef1234567890abcdef1234567890abcdef12",
              effective_balance: "32000000000",
              slashed: false,
              activation_eligibility_epoch: "0",
              activation_epoch: "100",
              exit_epoch: "9999999999",
              withdrawable_epoch: "9999999999"
            }
          }
        ]
      })
    } as any;

    // Call the function
    await persistValidatorIndices({
      beaconchainApi: mockBeaconchainApi,
      brainDb
    });

    // Verify the status was updated
    const dbData = brainDb.getData();
    expect(dbData[mockPubkey1].index).to.equal(123456);
    expect(dbData[mockPubkey1].status).to.equal(ValidatorStatus.ACTIVE_ONGOING);
  });

  it("should handle validators not found on beacon chain", async () => {
    // Add validators to database
    brainDb.addValidators({
      validators: {
        [mockPubkey1]: {
          tag: "solo",
          feeRecipient: "0x1111111111111111111111111111111111111111",
          automaticImport: true
        },
        [mockPubkey2]: {
          tag: "solo",
          feeRecipient: "0x2222222222222222222222222222222222222222",
          automaticImport: false
        }
      }
    });

    // Mock BeaconchainApi - only returns one validator
    const mockBeaconchainApi = {
      postStateValidators: async () => ({
        execution_optimistic: false,
        finalized: true,
        data: [
          {
            index: "123456",
            balance: "32000000000",
            status: ValidatorStatus.ACTIVE_ONGOING,
            validator: {
              pubkey: mockPubkey1,
              withdrawal_credentials: "0x010000000000000000000000abcdef1234567890abcdef1234567890abcdef12",
              effective_balance: "32000000000",
              slashed: false,
              activation_eligibility_epoch: "0",
              activation_epoch: "100",
              exit_epoch: "9999999999",
              withdrawable_epoch: "9999999999"
            }
          }
          // mockPubkey2 not returned (not deposited yet)
        ]
      })
    } as any;

    // Call the function
    await persistValidatorIndices({
      beaconchainApi: mockBeaconchainApi,
      brainDb
    });

    // Verify only the found validator was updated
    const dbData = brainDb.getData();

    expect(dbData[mockPubkey1].index).to.equal(123456);
    expect(dbData[mockPubkey1].status).to.equal(ValidatorStatus.ACTIVE_ONGOING);

    // mockPubkey2 should have no index or status
    expect(dbData[mockPubkey2].index).to.be.undefined;
    expect(dbData[mockPubkey2].status).to.be.undefined;
  });

  it("should handle empty database gracefully", async () => {
    // Mock BeaconchainApi
    const mockBeaconchainApi = {
      postStateValidators: async () => {
        throw new Error("Should not be called with empty database");
      }
    } as any;

    // Call the function with empty database (should return early)
    await persistValidatorIndices({
      beaconchainApi: mockBeaconchainApi,
      brainDb
    });

    // Should complete without error
    expect(Object.keys(brainDb.getData()).length).to.equal(0);
  });

  it("should handle API errors gracefully", async () => {
    // Add validators to database
    brainDb.addValidators({
      validators: {
        [mockPubkey1]: {
          tag: "solo",
          feeRecipient: "0x1111111111111111111111111111111111111111",
          automaticImport: true
        }
      }
    });

    // Mock BeaconchainApi that throws an error
    const mockBeaconchainApi = {
      postStateValidators: async () => {
        throw new Error("Beacon API connection failed");
      }
    } as any;

    // Call the function (should not throw)
    await persistValidatorIndices({
      beaconchainApi: mockBeaconchainApi,
      brainDb
    });

    // Verify data is unchanged
    const dbData = brainDb.getData();
    expect(dbData[mockPubkey1].index).to.be.undefined;
    expect(dbData[mockPubkey1].status).to.be.undefined;
  });

  it("should handle response with unknown pubkeys gracefully", async () => {
    // Add validators to database
    brainDb.addValidators({
      validators: {
        [mockPubkey1]: {
          tag: "solo",
          feeRecipient: "0x1111111111111111111111111111111111111111",
          automaticImport: true
        }
      }
    });

    // Mock BeaconchainApi returns a different pubkey
    const mockBeaconchainApi = {
      postStateValidators: async () => ({
        execution_optimistic: false,
        finalized: true,
        data: [
          {
            index: "999999",
            balance: "32000000000",
            status: ValidatorStatus.ACTIVE_ONGOING,
            validator: {
              pubkey: mockPubkey3, // Different pubkey not in our database
              withdrawal_credentials: "0x010000000000000000000000abcdef1234567890abcdef1234567890abcdef12",
              effective_balance: "32000000000",
              slashed: false,
              activation_eligibility_epoch: "0",
              activation_epoch: "100",
              exit_epoch: "9999999999",
              withdrawable_epoch: "9999999999"
            }
          }
        ]
      })
    } as any;

    // Call the function
    await persistValidatorIndices({
      beaconchainApi: mockBeaconchainApi,
      brainDb
    });

    // Verify our validator was not updated (unknown pubkey ignored)
    const dbData = brainDb.getData();
    expect(dbData[mockPubkey1].index).to.be.undefined;
    expect(dbData[mockPubkey1].status).to.be.undefined;
    expect(dbData[mockPubkey3]).to.be.undefined; // Not added to database
  });
});
