import { BigInt, Bytes } from "@graphprotocol/graph-ts";

import { ZERO_BIGINT, ensureToken, findOrCreateUser, formatWeiToNumber } from "../utils";

import {
  LuckypotCancelled,
  LuckypotClosed,
  LuckypotContract,
  LuckypotCreated,
  LuckypotEnded,
  SponsorAdded,
  SponsorRefunded,
  TicketCreated,
  TransferPrize
} from "../../generated/LuckypotContract/LuckypotContract";
import {
  ClaimPrizeRecord,
  Luckypot,
  LuckypotCancelEvent,
  LuckypotCloseEvent,
  LuckypotEndEvent,
  LuckypotParticipant,
  LuckypotSponsor,
  LuckypotSponsorRecord,
  LuckypotTicket,
  UserStat,
  UserTokenStat
} from "../../generated/schema";
import { ZERO_ADDRESS } from "../utils";

enum STATUS {
  PENDING, // luckypot created but not start
  OPEN, // the funder stakes the cryptos for the luckypot
  CLOSE, // luckypot close, and request VRF to redeem
  END, // the luckypot is finished, and funds were transferred
  CANCEL // operator asks to cancel the luckypot.
}

function findOrCreateUserStat(userId: string): UserStat {
  let us = UserStat.load(userId);
  if (!us) {
    us = new UserStat(userId);
    us.user = userId;
    us.createCount = 0;
    us.sponsorCount = 0;
    us.joinCount = 0;
    us.winCount = 0;
    us.totalTickets = ZERO_BIGINT;
    us.save();
  }
  return us;
}

function findOrCreateUserTokenStat(userId: string, tokenId: string): UserTokenStat {
  const id = `${userId}_${tokenId}`;
  let uts = UserTokenStat.load(id);
  if (!uts) {
    uts = new UserTokenStat(id);
    uts.user = userId;
    uts.token = tokenId;
    uts.createAmount = ZERO_BIGINT;
    uts.sponsorAmount = ZERO_BIGINT;
    uts.joinAmount = ZERO_BIGINT;
    uts.winAmount = ZERO_BIGINT;
    uts.save();
  }
  return uts;
}

export function handleLuckypotCreated(event: LuckypotCreated): void {

  const luckypotId = event.params.luckypotId;
  const funder = event.params.funder.toHexString();

  const key = `${luckypotId}`;

  findOrCreateUser(funder);
  const contract = LuckypotContract.bind(event.address);
  const data = contract.luckypots(luckypotId);

  let lp = Luckypot.load(key);
  if (!lp) lp = new Luckypot(key);
  lp.luckypotId = luckypotId;
  lp.status = data.getStatus();
  lp.prizeToken = data.getPrizeToken();
  lp.prizeAmount = data.getPrizeAmount();
  lp.powerToken = data.getPowerToken();
  lp.powerUnit = data.getPowerUnit();
  lp.sponsorAmount = data.getSponsorAmount();
  lp.startTime = data.getStartTime();
  lp.endTime = data.getEndTime();
  lp.maxPerUser = data.getMaxPerUser();
  lp.totalTickets = data.getTotalTickets();
  lp.useSqrtTickets = data.getUseSqrtTickets();
  lp.funder = funder;
  lp.note = data.getNote();
  lp.participants = lp.participants ? lp.participants : 0;
  const prizeInfo = ensureToken(lp.prizeToken);
  if (prizeInfo) {
    lp.prizeTokenInfo = prizeInfo.id;
    lp.title = formatWeiToNumber(lp.prizeAmount, 18) + ' ' + (prizeInfo.symbol!);
  }
  else {
    lp.title = formatWeiToNumber(lp.prizeAmount, 18) + ' BNB';
  }
  const powerInfo = ensureToken(lp.powerToken);
  if (powerInfo) lp.powerTokenInfo = powerInfo.id;
  lp.createdAt = event.block.timestamp;
  lp.txHash = event.transaction.hash;
  lp.save();

  const us = findOrCreateUserStat(funder);
  us.createCount = us.createCount + 1;
  us.save();

  ensureToken(lp.prizeToken);
  const uts = findOrCreateUserTokenStat(funder, lp.prizeToken.toHexString());
  uts.createAmount = uts.createAmount.plus(lp.prizeAmount);
  uts.save();
}

export function handleLuckypotCancelled(event: LuckypotCancelled): void {

  const luckypotId = event.params.luckypotId;

  const key = `${luckypotId}`;
  const caller = event.params.caller.toHexString();
  findOrCreateUser(caller);

  let lp = Luckypot.load(key);
  if (!lp) return;

  const evt = new LuckypotCancelEvent(`${key}_${event.transaction.hash.toHexString()}`);
  evt.luckypot = key;
  evt.caller = caller;
  evt.totalTickets = event.params.totalTickets;
  evt.createdAt = event.block.timestamp;
  evt.txHash = event.transaction.hash;
  evt.save();

  const contract = LuckypotContract.bind(event.address);
  const data = contract.luckypots(luckypotId);
  lp.status = data.getStatus();
  lp.totalTickets = data.getTotalTickets();
  lp.save();
}

export function handleLuckypotColsed(event: LuckypotClosed): void {

  const luckypotId = event.params.luckypotId;

  const key = `${luckypotId}`;
  const caller = event.params.caller.toHexString();
  findOrCreateUser(caller);

  let lp = Luckypot.load(key);
  if (!lp) return;

  const evt = new LuckypotCloseEvent(`${key}_${event.transaction.hash.toHexString()}`);
  evt.luckypot = key;
  evt.caller = caller;
  evt.totalTickets = event.params.totalTickets;
  evt.createdAt = event.block.timestamp;
  evt.txHash = event.transaction.hash;
  evt.save();

  const contract = LuckypotContract.bind(event.address);
  const data = contract.luckypots(luckypotId);
  lp.status = data.getStatus();
  lp.totalTickets = data.getTotalTickets();
  lp.save();
}

export function handleTicketCreated(event: TicketCreated): void {

  const luckypotId = event.params.luckypotId;
  const user = event.params.user.toHexString();

  const key = `${luckypotId}`;
  const ticketKey = `${key}_${event.params.ticketId}`;

  findOrCreateUser(user);
  let lp = Luckypot.load(key);
  if (!lp) return;

  let tk = LuckypotTicket.load(ticketKey);
  if (!tk) tk = new LuckypotTicket(ticketKey);
  tk.luckypot = key;
  tk.user = user;
  tk.ticketId = event.params.ticketId;
  tk.totalTickets = event.params.num;
  tk.currentSize = event.params.currentSize;
  tk.usePowers = event.params.usePowers;
  tk.note = event.params.note;
  tk.createdAt = event.block.timestamp;
  tk.txHash = event.transaction.hash;
  tk.save();

  lp.totalTickets = event.params.currentSize;
  const participantKey = `${key}_${user}`;
  let part = LuckypotParticipant.load(participantKey);
  if (!part) {
    part = new LuckypotParticipant(participantKey);
    part.luckypot = key;
    part.user = user;
    part.totalTickets = ZERO_BIGINT;
    part.stakeAmount = ZERO_BIGINT;
    lp.participants = lp.participants + 1;
  }
  part.totalTickets = part.totalTickets.plus(event.params.num);
  part.save();
  lp.save();

  const us = findOrCreateUserStat(user);
  us.joinCount = us.joinCount + 1;
  us.totalTickets = us.totalTickets.plus(event.params.num);
  us.save();

  const pInfo = ensureToken(lp.powerToken);
  if (pInfo) {
    const uts = findOrCreateUserTokenStat(user, pInfo.id);
    uts.joinAmount = uts.joinAmount.plus(event.params.usePowers);
    uts.save();
  }
}

export function handleLuckypotEnded(event: LuckypotEnded): void {

  const luckypotId = event.params.luckypotId;

  const key = `${luckypotId}`;
  const caller = event.params.caller.toHexString();
  findOrCreateUser(caller);

  let lp = Luckypot.load(key);
  if (!lp) return;

  const evt = new LuckypotEndEvent(`${key}_${event.transaction.hash.toHexString()}`);
  evt.luckypot = key;
  evt.caller = caller;
  const draws = new Array<i32>();
  for (let i = 0; i < event.params.drawNumbers.length; i++) {
    draws.push((event.params.drawNumbers[i] as BigInt).toI32());
  }
  evt.drawNumbers = draws;
  evt.amounts = event.params.amounts;
  evt.createdAt = event.block.timestamp;
  evt.txHash = event.transaction.hash;
  evt.save();

  lp.status = STATUS.END;
  const ps = LuckypotContract.bind(event.address).getPrizeStates(luckypotId);
  lp.prizeAmounts = ps.value0;
  lp.prizeClaims = ps.value1;
  lp.drawNumbers = draws;
  let winnersOpt = lp.winners;
  if (winnersOpt == null || (winnersOpt as Array<Bytes>).length < 4) {
    const w = new Array<Bytes>(4);
    for (let i = 0; i < 4; i++) w[i] = Bytes.fromHexString(ZERO_ADDRESS);
    lp.winners = w;
  }
  lp.save();
}

export function handleSponsorAdded(event: SponsorAdded): void {
  const key = `${event.params.luckypotId}`;
  const user = event.params.user.toHexString();
  findOrCreateUser(user);

  let lp = Luckypot.load(key);
  if (!lp) return;

  const evt = new LuckypotSponsorRecord(`${key}_${event.transaction.hash.toHexString()}`);
  evt.luckypot = key;
  evt.user = user;
  evt.prizeToken = event.params.prizeToken;
  evt.sponsorAmount = event.params.sponsorAmount;
  evt.note = event.params.note;
  evt.createdAt = event.block.timestamp;
  evt.txHash = event.transaction.hash;
  evt.save();

  lp.sponsorAmount = lp.sponsorAmount.plus(event.params.sponsorAmount);
  lp.save();

  const us = findOrCreateUserStat(user);
  us.sponsorCount = us.sponsorCount + 1;
  us.save();

  const sponsorId = `${key}_${user}`;
  let sponsor = LuckypotSponsor.load(sponsorId);
  if (!sponsor) {
    sponsor = new LuckypotSponsor(sponsorId);
    sponsor.luckypot = key;
    sponsor.user = user;
    sponsor.sponsorAmount = ZERO_BIGINT;
  }
  sponsor.sponsorAmount = sponsor.sponsorAmount.plus(event.params.sponsorAmount);
  sponsor.save();

  ensureToken(event.params.prizeToken);
  const uts = findOrCreateUserTokenStat(user, event.params.prizeToken.toHexString());
  uts.sponsorAmount = uts.sponsorAmount.plus(event.params.sponsorAmount);
  uts.save();

}

export function handleSponsorRefunded(event: SponsorRefunded): void {
  const key = `${event.params.luckypotId}`;
  const user = event.params.sponsor.toHexString();
  findOrCreateUser(user);

  let lp = Luckypot.load(key);
  if (!lp) return;

  const refundAmt = event.params.amount;

  let lpAmt = lp.sponsorAmount.minus(refundAmt);
  lp.sponsorAmount = lpAmt.lt(ZERO_BIGINT) ? ZERO_BIGINT : lpAmt;
  lp.save();

  const sponsorId = `${key}_${user}`;
  let sponsor = LuckypotSponsor.load(sponsorId);
  if (!sponsor) {
    sponsor = new LuckypotSponsor(sponsorId);
    sponsor.luckypot = key;
    sponsor.user = user;
    sponsor.sponsorAmount = ZERO_BIGINT;
  }
  let sAmt = sponsor.sponsorAmount.minus(refundAmt);
  sponsor.sponsorAmount = sAmt.lt(ZERO_BIGINT) ? ZERO_BIGINT : sAmt;
  sponsor.save();

  ensureToken(event.params.prizeToken);
  const uts = findOrCreateUserTokenStat(user, event.params.prizeToken.toHexString());
  let uAmt = uts.sponsorAmount.minus(refundAmt);
  uts.sponsorAmount = uAmt.lt(ZERO_BIGINT) ? ZERO_BIGINT : uAmt;
  uts.save();
}

export function handleTransferPrize(event: TransferPrize): void {
  const key = `${event.params.luckypotId}`;
  const userHex = event.params.to.toHexString();
  findOrCreateUser(userHex);

  let lp = Luckypot.load(key);
  if (!lp) return;

  if (lp.status != STATUS.END) return;

  const idx = event.params.winPlace - 1;
  let winners = lp.winners as Array<Bytes> | null;
  if (winners == null || winners.length < 4) {
    const w = new Array<Bytes>(4);
    for (let i = 0; i < 4; i++) w[i] = Bytes.fromHexString(ZERO_ADDRESS);
    winners = w;
  }

  let claims = lp.prizeClaims as Array<boolean> | null;
  if (claims == null || claims.length < 4) {
    const c = new Array<boolean>(4);
    for (let i = 0; i < 4; i++) c[i] = false;
    claims = c;
  }

  if (idx >= 0 && idx < 4) {
    winners[idx] = Bytes.fromHexString(userHex);
    claims[idx] = true;
  }

  lp.winners = winners as Array<Bytes>;
  lp.prizeClaims = claims as Array<boolean>;
  lp.save();

  const evt = new ClaimPrizeRecord(`${key}_${event.transaction.hash.toHexString()}`);
  evt.luckypot = key;
  evt.user = userHex;
  evt.prizeToken = event.params.prizeToken;
  evt.prizeAmount = event.params.prizeAmount;
  evt.winPlace = event.params.winPlace;
  evt.createdAt = event.block.timestamp;
  evt.txHash = event.transaction.hash;
  evt.save();

  const us = findOrCreateUserStat(userHex);
  us.winCount = us.winCount + 1;
  us.save();

  ensureToken(event.params.prizeToken);
  const uts = findOrCreateUserTokenStat(userHex, event.params.prizeToken.toHexString());
  uts.winAmount = uts.winAmount.plus(event.params.prizeAmount);
  uts.save();
}
