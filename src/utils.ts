import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts";
import { Token, User } from "../generated/schema";
import { TokenContract } from "../generated/templates/TokenMetadata/TokenContract";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const ZERO_BIGINT = BigInt.fromI32(0);
export const ONE_BIGINT = BigInt.fromI32(1);

/**
 * Find or Create a User entity with `id` and return it
 * @param id
 */
export function findOrCreateUser(id: string): User {
  let user = User.load(id);

  if (user == null) {
    user = new User(id);
    user.save();
  }

  return user;
}

export function ensureToken(addr: Bytes): Token | null {
  const hex = addr.toHexString();
  if (hex == "0x0000000000000000000000000000000000000000") return null;
  const id = `${hex}`;
  let token = Token.load(id);
  if (!token) {
    const c = TokenContract.bind(Address.fromBytes(addr));
    const name = c.try_name();
    const symbol = c.try_symbol();
    const decimals = c.try_decimals();
    token = new Token(id);
    token.address = hex;
    token.name = name.reverted ? "" : name.value;
    token.symbol = symbol.reverted ? "" : symbol.value;
    token.decimals = decimals.reverted ? 18 : decimals.value;
    token.save();
  }
  return token;
}

export function formatWeiToNumber(wei: BigInt, decimals: i32): string {
  let eth = wei.toBigDecimal().div(
    BigInt.fromI32(10)
      .pow(decimals as u8)
      .toBigDecimal()
  );
  return eth.toString();
}

export function formatEth(wei: BigInt): string {
  return formatWeiToNumber(wei, 18);
}

export function getIpfsCID(url: string): string {
  if (url.startsWith("ipfs://")) {
    return url.replace("ipfs://", "");
  } else if (url.indexOf("/ipfs/") > 0) {
    return url.substring(url.indexOf("/ipfs/") + 6, url.length);
  }
  return url;
}

export function getIpfsUrl(url: string): string {
  if (url.startsWith("ipfs://")) {
    return url.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  return url;
}