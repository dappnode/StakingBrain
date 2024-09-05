import {
  BeaconchainBlockHeaderGetResponse,
  BeaconchainValidatorFromStateGetResponse,
  BeaconchainPoolVoluntaryExitsPostRequest,
  BeaconchainForkFromStateGetResponse,
  BeaconchainGenesisGetResponse,
  BeaconchainStateFinalityCheckpointsPostResponse,
  BeaconchainBlockAttestationsGetResponse,
  BeaconchainAttestationRewardsPostResponse,
  Network,
  ApiParams
} from "@stakingbrain/common";
import { StandardApi } from "./standard.js";
import path from "path";

export class Beaconchain extends StandardApi {
  private SLOTS_PER_EPOCH: number;
  private beaconchainEndpoint = "/eth/v1/beacon";

  constructor(apiParams: ApiParams, network: Network) {
    super(apiParams, network);
    this.SLOTS_PER_EPOCH = network === "gnosis" ? 16 : 32;
  }

  /**
   * Submits SignedVoluntaryExit object to node's pool and if passes validation node MUST broadcast it to network.
   * @see https://ethereum.github.io/beacon-APIs/#/Beacon/submitPoolVoluntaryExit
   * @param pubkeys - The public keys of the validators to exit.
   */
  public async postVoluntaryExits({
    postVoluntaryExitsRequest
  }: {
    postVoluntaryExitsRequest: BeaconchainPoolVoluntaryExitsPostRequest;
  }): Promise<void> {
    try {
      await this.request({
        method: "POST",
        endpoint: path.join(this.beaconchainEndpoint, "pool", "voluntary_exits"),
        body: JSON.stringify(postVoluntaryExitsRequest)
      });
    } catch (e) {
      e.message += `Error posting (POST) voluntary exits to beaconchain. `;
      throw e;
    }
  }

  /**
   * Retrieve details of the chain's genesis which can be used to identify chain.
   * @see https://ethereum.github.io/beacon-APIs/#/Beacon/getGenesis
   */
  public async getGenesis(): Promise<BeaconchainGenesisGetResponse> {
    try {
      return (await this.request({
        method: "GET",
        endpoint: path.join(this.beaconchainEndpoint, "genesis")
      })) as BeaconchainGenesisGetResponse;
    } catch (e) {
      e.message += `Error getting (GET) genesis from beaconchain. `;
      throw e;
    }
  }

  /**
   * Get Fork object from requested state.
   * @see https://ethereum.github.io/beacon-APIs/#/Beacon/getStateFork
   * @param stateId - State identifier. Can be one of: "head" (canonical head in node's view), "genesis", "finalized", <slot>, <hex encoded stateRoot with 0x prefix>.
   */
  public async getForkFromState({
    stateId
  }: {
    stateId: "head" | "genesis" | "finalized";
  }): Promise<BeaconchainForkFromStateGetResponse> {
    try {
      return (await this.request({
        method: "GET",
        endpoint: path.join(this.beaconchainEndpoint, "states", stateId, "fork")
      })) as BeaconchainForkFromStateGetResponse;
    } catch (e) {
      e.message += `Error getting (GET) fork from beaconchain. `;
      throw e;
    }
  }

  /**
   * Returns finality checkpoints for state with given 'stateId'. In case finality is not yet achieved, checkpoint should return epoch 0 and ZERO_HASH as root.
   * @see https://ethereum.github.io/beacon-APIs/#/Beacon/getStateFinalityCheckpoints
   * @param stateId - State identifier. Can be one of: "head" (canonical head in node's view), "genesis", "finalized", <slot>, <hex encoded stateRoot with 0x prefix>.
   */
  public async getStateFinalityCheckpoints({
    stateId
  }: {
    stateId: "head" | "genesis" | "finalized";
  }): Promise<BeaconchainStateFinalityCheckpointsPostResponse> {
    try {
      return await this.request({
        method: "GET",
        endpoint: path.join(this.beaconchainEndpoint, "states", stateId, "finality_checkpoints")
      });
    } catch (e) {
      e.message += `Error getting (GET) state finality checkpoints from beaconchain. `;
      throw e;
    }
  }

  /**
   * Retrieves validator from state and public key.
   * @see https://ethereum.github.io/beacon-APIs/#/Beacon/getStateValidator
   * @param state - State identifier. Can be one of: "head" (canonical head in node's view), "genesis", "finalized", <slot>, <hex encoded stateRoot with 0x prefix>.
   * @param pubkey - The validator's BLS public key, uniquely identifying them. _48-bytes, hex encoded with 0x prefix, case insensitive._
   */
  public async getValidatorFromState({
    state,
    pubkey
  }: {
    state: string;
    pubkey: string;
  }): Promise<BeaconchainValidatorFromStateGetResponse> {
    try {
      return (await this.request({
        method: "GET",
        endpoint: path.join(this.beaconchainEndpoint, "states", state, "validators", pubkey)
      })) as BeaconchainValidatorFromStateGetResponse;
    } catch (e) {
      e.message += `Error getting (GET) validator from beaconchain. `;
      throw e;
    }
  }

  /**
   * Retrieves current epoch based on the head chain block
   */
  public async getCurrentEpoch(): Promise<number> {
    const head = await this.getBlockHeader({ block_id: "head" });
    return this.getEpochFromSlot(parseInt(head.data.header.message.slot));
  }

  /**
   * Retrieves attestation included in requested block.
   *
   * @param blockId - Block identifier. Can be one of: "head" (canonical head in node's view), "genesis", "finalized", <slot>, <hex encoded blockRoot with 0x prefix>.
   * @see https://ethereum.github.io/beacon-APIs/#/Beacon/getBlockAttestations
   */
  public async getBlockAttestations({
    blockId
  }: {
    blockId: string;
  }): Promise<BeaconchainBlockAttestationsGetResponse> {
    try {
      return await this.request({
        method: "GET",
        endpoint: path.join(this.beaconchainEndpoint, "blocks", blockId, "attestations")
      });
    } catch (e) {
      e.message += `Error getting (GET) block attestations from beaconchain. `;
      throw e;
    }
  }

  /**
   * Retrieve attestation reward info for validators specified by array of public keys or validator index. If no array is provided, return reward info for every validator.
   *
   * @param epoch The epoch to get rewards info from
   * @param pubkeysOrIndexes An array of either hex encoded public key (any bytes48 with 0x prefix) or validator index
   * @see https://ethereum.github.io/beacon-APIs/#/Beacon/getAttestationsRewards
   */
  public async getAttestationsRewards({
    epoch,
    pubkeysOrIndexes
  }: {
    epoch: string;
    pubkeysOrIndexes: string[];
  }): Promise<BeaconchainAttestationRewardsPostResponse> {
    try {
      return await this.request({
        method: "POST",
        endpoint: path.join(this.beaconchainEndpoint, "rewards", "attestations", epoch),
        body: pubkeysOrIndexes
      });
    } catch (e) {
      e.message += `Error getting (POST) attestation rewards from beaconchain. `;
      throw e;
    }
  }

  /**
   * Retrieves block header for given block id.
   * @see https://ethereum.github.io/beacon-APIs/#/Beacon/getBlockHeader
   * @params block_id Block identifier. Can be one of: "head" (canonical head in node's view), "genesis", "finalized", <slot>, <hex encoded blockRoot with 0x prefix>.
   * @example head
   */
  private async getBlockHeader({ block_id }: { block_id: string }): Promise<BeaconchainBlockHeaderGetResponse> {
    try {
      return (await this.request({
        method: "GET",
        endpoint: path.join(this.beaconchainEndpoint, "headers", block_id)
      })) as BeaconchainBlockHeaderGetResponse;
    } catch (e) {
      e.message += `Error getting (GET) block header from beaconchain. `;
      throw e;
    }
  }

  // UTILS

  /**
   * Returns the epoch number for a given slot.
   * @param slot - The slot number.
   */
  private getEpochFromSlot(slot: number): number {
    return Math.floor(slot / this.SLOTS_PER_EPOCH);
  }
}
