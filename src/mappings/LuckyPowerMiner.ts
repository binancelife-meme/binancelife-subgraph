import { Address, BigInt } from "@graphprotocol/graph-ts";

import { LockRecord, StakeRecord, UserLockStat, UserStake } from "../../generated/schema";
import { Claimed, Locked, Staked, Unlocked, Unstaked } from "../../generated/LuckyPowerMiner/LuckyPowerMiner";
import { ZERO_BIGINT, ensureToken, findOrCreateUser } from "../utils";

function userStakeId(user: string, token: Address): string {
  return `${user}_${token.toHexString()}`;
}

function lockRecordId(user: string, token: Address, lockIndex: BigInt): string {
  return `${user}_${token.toHexString()}_${lockIndex.toString()}`;
}

function userLockStatId(user: string, token: Address): string {
  return `${user}_${token.toHexString()}`;
}

export function handleLocked(event: Locked): void {

  const user = event.params.user.toHexString();
  const token = ensureToken(event.params.token);

  findOrCreateUser(user);

  const lrId = lockRecordId(user, event.params.token, event.params.lockIndex);
  let lr = LockRecord.load(lrId);
  if (!lr) lr = new LockRecord(lrId);
  lr.user = user;
  lr.token = token!.id;
  lr.amount = event.params.amount;
  lr.unlockTime = event.params.unlockTime;
  lr.powers = event.params.powers;
  lr.lockIndex = event.params.lockIndex;
  lr.txHash = event.transaction.hash;
  lr.timestamp = event.block.timestamp;
  lr.active = true;
  lr.save();

  const statId = userLockStatId(user, event.params.token);
  let stat = UserLockStat.load(statId);
  if (!stat) {
    stat = new UserLockStat(statId);
    stat.user = user;
    stat.token = token!.id;
    stat.locked = ZERO_BIGINT;
    stat.unlocked = ZERO_BIGINT;
    stat.locking = ZERO_BIGINT;
    stat.powers = ZERO_BIGINT;
  }
  stat.locked = stat.locked.plus(event.params.amount);
  stat.locking = stat.locking.plus(event.params.amount);
  stat.powers = stat.powers.plus(event.params.powers);
  stat.save();
}

export function handleUnlocked(event: Unlocked): void {

  const user = event.params.user.toHexString();
  const token = ensureToken(event.params.token);

  findOrCreateUser(user);

  const statId = userLockStatId(user, event.params.token);
  let stat = UserLockStat.load(statId);
  if (!stat) {
    stat = new UserLockStat(statId);
    stat.user = user;
    stat.token = token!.id;
    stat.locked = ZERO_BIGINT;
    stat.unlocked = ZERO_BIGINT;
    stat.locking = ZERO_BIGINT;
    stat.powers = ZERO_BIGINT;
  }
  stat.unlocked = stat.unlocked.plus(event.params.amount);
  stat.locking = stat.locking.minus(event.params.amount);
  stat.save();
}

export function handleStaked(event: Staked): void {

  const user = event.params.user.toHexString();
  const token = ensureToken(event.params.token);

  findOrCreateUser(user);

  const recId = `${event.transaction.hash.toHexString()}`;
  let rec = StakeRecord.load(recId);
  if (!rec) rec = new StakeRecord(recId);
  rec.user = user;
  rec.token = token!.id;
  rec.type = "STAKE";
  rec.amount = event.params.amount;
  rec.txHash = event.transaction.hash;
  rec.timestamp = event.block.timestamp;
  rec.save();

  const usId = userStakeId(user, event.params.token);
  let us = UserStake.load(usId);
  if (!us) {
    us = new UserStake(usId);
    us.user = user;
    us.token = token!.id;
    us.staked = ZERO_BIGINT;
    us.unstaked = ZERO_BIGINT;
    us.staking = ZERO_BIGINT;
    us.claimedPowers = ZERO_BIGINT;
  }
  us.staked = us.staked.plus(event.params.amount);
  us.staking = us.staking.plus(event.params.amount);
  us.save();
}

export function handleUnstaked(event: Unstaked): void {

  const user = event.params.user.toHexString();
  const token = ensureToken(event.params.token);

  findOrCreateUser(user);

  const recId = `${event.transaction.hash.toHexString()}`;
  let rec = StakeRecord.load(recId);
  if (!rec) rec = new StakeRecord(recId);
  rec.user = user;
  rec.token = token!.id;
  rec.type = "UNSTAKE";
  rec.amount = event.params.amount;
  rec.txHash = event.transaction.hash;
  rec.timestamp = event.block.timestamp;
  rec.save();

  const usId = userStakeId(user, event.params.token);
  let us = UserStake.load(usId);
  if (!us) {
    us = new UserStake(usId);
    us.user = user;
    us.token = token!.id;
    us.staked = ZERO_BIGINT;
    us.unstaked = ZERO_BIGINT;
    us.staking = ZERO_BIGINT;
    us.claimedPowers = ZERO_BIGINT;
  }
  us.unstaked = us.unstaked.plus(event.params.amount);
  us.staking = us.staking.minus(event.params.amount);
  us.save();
}

export function handleClaimed(event: Claimed): void {

  const user = event.params.user.toHexString();
  const token = ensureToken(event.params.token);

  findOrCreateUser(user);

  const usId = userStakeId(user, event.params.token);
  let us = UserStake.load(usId);
  if (!us) {
    us = new UserStake(usId);
    us.user = user;
    us.token = token!.id;
    us.staked = ZERO_BIGINT;
    us.unstaked = ZERO_BIGINT;
    us.staking = ZERO_BIGINT;
    us.claimedPowers = ZERO_BIGINT;
  }
  us.claimedPowers = us.claimedPowers.plus(event.params.powers);
  us.save();
}