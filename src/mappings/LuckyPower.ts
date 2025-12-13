import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";

import { UserPower } from "../../generated/schema";
import { PowersCredited, PowersDebited, LuckyPower as LuckyPowerContract } from "../../generated/LuckyPower/LuckyPower";
import { findOrCreateUser, ZERO_BIGINT, ensureToken } from "../utils";

function upsertUserPower(userHex: string, token: Bytes, bal: BigInt, creditDelta: BigInt, debitDelta: BigInt): void {
  const id = `${userHex}_${token.toHexString()}`;
  let up = UserPower.load(id);
  if (up == null) {
    up = new UserPower(id);
    up.user = userHex;
    const t = ensureToken(Address.fromBytes(token));
    up.token = t ? t.id : token.toHexString();
    up.balance = ZERO_BIGINT;
    up.totalCredit = ZERO_BIGINT;
    up.totalDebit = ZERO_BIGINT;
  }
  if (creditDelta.gt(ZERO_BIGINT)) {
    up.totalCredit = up.totalCredit.plus(creditDelta);
  }
  if (debitDelta.gt(ZERO_BIGINT)) {
    up.totalDebit = up.totalDebit.plus(debitDelta);
  }
  up.balance = bal;
  up.save();
}

export function handlePowersCredited(event: PowersCredited): void {
  const userHex = event.params.user.toHexString();
  const token = event.params.token;
  findOrCreateUser(userHex);

  const contract = LuckyPowerContract.bind(event.address);
  const bal = contract.balanceOf(Address.fromString(userHex), Address.fromBytes(token));
  upsertUserPower(userHex, token, bal, event.params.amount, ZERO_BIGINT);
}

export function handlePowersDebited(event: PowersDebited): void {
  const userHex = event.params.user.toHexString();
  const token = event.params.token;
  findOrCreateUser(userHex);

  const contract = LuckyPowerContract.bind(event.address);
  const bal = contract.balanceOf(Address.fromString(userHex), Address.fromBytes(token));
  upsertUserPower(userHex, token, bal, ZERO_BIGINT, event.params.amount);
}
