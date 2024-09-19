import {
  BeaconchainBlockHeaderGetResponse,
  BeaconchainValidatorFromStateGetResponse,
  BeaconchainPoolVoluntaryExitsPostRequest,
  BeaconchainForkFromStateGetResponse,
  BeaconchainGenesisGetResponse,
  BeaconchainStateFinalityCheckpointsPostResponse,
  BeaconchainBlockAttestationsGetResponse,
  BeaconchainAttestationRewardsPostResponse,
  BeaconchainValidatorStatePostResponse,
  ValidatorStatus,
  BeaconchainLivenessPostResponse,
  BeaconchainSyncingStatusGetResponse,
  BeaconchainSyncCommitteePostResponse,
  BeaconchainBlockRewardsGetResponse,
  BeaconchainProposerDutiesGetResponse
} from "./types.js";
import { StandardApi } from "../standard.js";
import path from "path";
import { ApiParams } from "../types.js";
import { Network } from "@stakingbrain/common";
import { BeaconchainApiError } from "./error.js";

// TODO: BlockId can also be a simple slot in the form of a string. Is this type still necessary?
type BlockId = "head" | "genesis" | "finalized" | string | `0x${string}`;

export class BeaconchainApi extends StandardApi {
  private SLOTS_PER_EPOCH: number;

  /**
   * Endpoints to query node related information
   * @see https://ethereum.github.io/beacon-APIs/#/Node
   */
  private nodeEndpoint = "/eth/v1/node";

  /**
   * Validator endpoint for beaconchain
   * @see https://ethereum.github.io/beacon-APIs/#/Beacon
   */
  private beaconchainEndpoint = "/eth/v1/beacon";

  /**
   * Validator endpoint
   * @see https://ethereum.github.io/beacon-APIs/#/Validator
   */
  private validatorEndpoint = "/eth/v1/validator";

  constructor(apiParams: ApiParams, network: Network) {
    super(apiParams, network);
    this.SLOTS_PER_EPOCH = network === "gnosis" ? 16 : 32;
  }

  /**
   * Submits SignedVoluntaryExit object to node's pool and if passes validation node MUST broadcast it to network.
   *
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
      throw new BeaconchainApiError({ ...e });
    }
  }

  /**
   * Retrieve details of the chain's genesis which can be used to identify chain.
   *
   * @see https://ethereum.github.io/beacon-APIs/#/Beacon/getGenesis
   */
  public async getGenesis(): Promise<BeaconchainGenesisGetResponse> {
    try {
      return await this.request({
        method: "GET",
        endpoint: path.join(this.beaconchainEndpoint, "genesis")
      });
    } catch (e) {
      e.message += `Error getting (GET) genesis from beaconchain. `;
      throw new BeaconchainApiError({ ...e });
    }
  }

  /**
   * Get Fork object from requested state.
   *
   * @see https://ethereum.github.io/beacon-APIs/#/Beacon/getStateFork
   * @param stateId - State identifier. Can be one of: "head" (canonical head in node's view), "genesis", "finalized", <slot>, <hex encoded stateRoot with 0x prefix>.
   */
  public async getForkFromState({
    stateId
  }: {
    stateId: "head" | "genesis" | "finalized";
  }): Promise<BeaconchainForkFromStateGetResponse> {
    try {
      return await this.request({
        method: "GET",
        endpoint: path.join(this.beaconchainEndpoint, "states", stateId, "fork")
      });
    } catch (e) {
      e.message += `Error getting (GET) fork from beaconchain. `;
      throw new BeaconchainApiError({ ...e });
    }
  }

  /**
   * Returns finality checkpoints for state with given 'stateId'. In case finality is not yet achieved, checkpoint should return epoch 0 and ZERO_HASH as root.
   *
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
      throw new BeaconchainApiError({ ...e });
    }
  }

  /**
   * Retrieves validator from state and public key.
   *
   * @see https://ethereum.github.io/beacon-APIs/#/Beacon/getStateValidator
   * @param state - State identifier. Can be one of: "head" (canonical head in node's view), "genesis", "finalized", <slot>, <hex encoded stateRoot with 0x prefix>.
   * @param pubkey - The validator's BLS public key, uniquely identifying them. _48-bytes, hex encoded with 0x prefix, case insensitive._
   */
  public async getStateValidator({
    state,
    pubkey
  }: {
    state: BlockId;
    pubkey: string;
  }): Promise<BeaconchainValidatorFromStateGetResponse> {
    try {
      return await this.request({
        method: "GET",
        endpoint: path.join(this.beaconchainEndpoint, "states", state, "validators", pubkey)
      });
    } catch (e) {
      e.message += `Error getting (GET) validator from beaconchain. `;
      throw new BeaconchainApiError({ ...e });
    }
  }

  /**
   * Returns filterable list of validators with their balance, status and index.
   * Information will be returned for all indices or public key that match known validators. If an index or public key does not match any known validator, no information will be returned but this will not cause an error. There are no guarantees for the returned data in terms of ordering; both the index and public key are returned for each validator, and can be used to confirm for which inputs a response has been returned.
   * The POST variant of this endpoint has the same semantics as the GET endpoint but passes the lists of IDs and statuses via a POST body in order to enable larger requests.
   *
   * @see https://ethereum.github.io/beacon-APIs/#/Beacon/postStateValidators
   * @param stateId - State identifier. Can be one of: "head" (canonical head in node's view), "genesis", "finalized", <slot>, <hex encoded stateRoot with 0x prefix>.
   * @param body - The list of validator IDs and statuses to retrieve.
   */
  public async postStateValidators({
    stateId,
    body
  }: {
    stateId: BlockId;
    body: { ids: string[]; statuses: ValidatorStatus[] };
  }): Promise<BeaconchainValidatorStatePostResponse> {
    try {
      return await this.request({
        method: "POST",
        endpoint: path.join(this.beaconchainEndpoint, "states", stateId, "validators"),
        body: JSON.stringify(body)
      });
    } catch (e) {
      e.message += `Error getting (POST) state validators from beaconchain. `;
      throw new BeaconchainApiError({ ...e });
    }
  }

  /**
   * Retrieves the epoch from a block header
   *
   * @param blockId - Block identifier. Can be one of: "head" (canonical head in node's view), "genesis", "finalized", <slot>, <hex encoded blockRoot with 0x prefix>.
   */
  public async getEpochHeader({ blockId }: { blockId: BlockId }): Promise<number> {
    const head = await this.getBlockHeader({ blockId });
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
      throw new BeaconchainApiError({ ...e });
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
        body: JSON.stringify(pubkeysOrIndexes)
      });
    } catch (e) {
      e.message += `Error getting (POST) attestation rewards from beaconchain. `;
      throw new BeaconchainApiError({ ...e });
    }
  }

  /**
   * Retrieves rewards info for sync committee members specified by array of public keys or validator index. If no array is provided, return reward info for every committee member.
   *
   * @param validatorIndexesOrPubkeys An array of either hex encoded public key (any bytes48 with 0x prefix) or validator index
   * @param blockId Block identifier. Can be one of: "head" (canonical head in node's view), "genesis", "finalized", <slot>, <hex encoded blockRoot with 0x prefix>
   * @see https://ethereum.github.io/beacon-APIs/#/Rewards/getSyncCommitteeRewards
   */
  public async getSyncCommitteeRewards({
    blockId,
    validatorIndexesOrPubkeys
  }: {
    blockId: BlockId;
    validatorIndexesOrPubkeys: string[];
  }): Promise<BeaconchainSyncCommitteePostResponse> {
    try {
      return await this.request({
        method: "POST",
        endpoint: path.join(this.beaconchainEndpoint, "rewards", "sync_committee", blockId),
        body: JSON.stringify(validatorIndexesOrPubkeys)
      });
    } catch (e) {
      e.message += `Error getting (POST) sync committee rewards from beaconchain. `;
      throw new BeaconchainApiError({ ...e });
    }
  }

  /**
   * Retrieve block proposal duties for the specified epoch. This will return a list of 32 elements, each element corresponding to a slot in the epoch.
   * If the epoch requested is not yet finalized, a chain reorg is possible and the duties may change.
   *
   * @param epoch The epoch to get the proposer duties from
   * @see https://ethereum.github.io/beacon-APIs/#/Validator/getProposerDuties
   */
  public async getProposerDuties({ epoch }: { epoch: string }): Promise<BeaconchainProposerDutiesGetResponse> {
    try {
      return await this.request({
        method: "GET",
        endpoint: path.join(this.validatorEndpoint, "duties", "proposer", epoch)
      });
    } catch (e) {
      e.message += `Error getting (GET) proposer duties from beaconchain. `;
      throw new BeaconchainApiError({ ...e });
    }
  }

  /**
   * Retrieve block reward info for a single block
   *
   * @param blockId Block identifier. Can be one of: "head" (canonical head in node's view), "genesis", "finalized", <slot>, <hex encoded blockRoot with 0x prefix>
   * @see https://ethereum.github.io/beacon-APIs/#/Rewards/getBlockRewards
   */
  public async getBlockRewards({ blockId }: { blockId: BlockId }): Promise<BeaconchainBlockRewardsGetResponse> {
    try {
      return await this.request({
        method: "GET",
        endpoint: path.join(this.beaconchainEndpoint, "rewards", "block", blockId)
      });
    } catch (e) {
      e.message += `Error getting (GET) block rewards from beaconchain. `;
      throw new BeaconchainApiError({ ...e });
    }
  }

  /**
   * Requests the beacon node to indicate if a validator has been observed to be live in a given epoch.
   * The beacon node might detect liveness by observing messages from the validator on the network,
   * in the beacon chain, from its API or from any other source. A beacon node SHOULD support
   * the current and previous epoch, however it MAY support earlier epoch. It is important to note that
   * the values returned by the beacon node are not canonical; they are best-effort and based upon a subjective
   * view of the network. A beacon node that was recently started or suffered a network partition may indicate
   * that a validator is not live when it actually is.
   *
   * @see https://ethereum.github.io/beacon-APIs/#/Validator/getLiveness
   */
  public async getLiveness({
    epoch,
    validatorIndexes
  }: {
    epoch: string;
    validatorIndexes: string[];
  }): Promise<BeaconchainLivenessPostResponse> {
    try {
      return await this.request({
        method: "POST",
        endpoint: path.join(this.validatorEndpoint, "liveness", epoch),
        body: JSON.stringify(validatorIndexes)
      });
    } catch (e) {
      e.message += `Error getting (POST) liveness from validator. `;
      throw new BeaconchainApiError({ ...e });
    }
  }

  /**
   * Requests the beacon node to describe if it's currently syncing or not, and if it is, what block it is up to.
   *
   * @see https://ethereum.github.io/beacon-APIs/#/Node/getSyncingStatus
   */
  public async getSyncingStatus(): Promise<BeaconchainSyncingStatusGetResponse> {
    try {
      return await this.request({
        method: "GET",
        endpoint: path.join(this.nodeEndpoint, "syncing")
      });
    } catch (e) {
      e.message += `Error getting (GET) syncing status from beaconchain. `;
      throw new BeaconchainApiError({ ...e });
    }
  }

  /**
   * Retrieves block header for given block id.
   *
   * @see https://ethereum.github.io/beacon-APIs/#/Beacon/getBlockHeader
   * @params blockId Block identifier. Can be one of: "head" (canonical head in node's view), "genesis", "finalized", <slot>, <hex encoded blockRoot with 0x prefix>.
   * @example head
   */
  public async getBlockHeader({ blockId }: { blockId: BlockId }): Promise<BeaconchainBlockHeaderGetResponse> {
    try {
      return await this.request({
        method: "GET",
        endpoint: path.join(this.beaconchainEndpoint, "headers", blockId)
      });
    } catch (e) {
      e.message += `Error getting (GET) block header from beaconchain. `;
      throw new BeaconchainApiError({ ...e });
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
