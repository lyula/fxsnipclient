import SHA256 from "crypto-js/sha256";

export function hashId(id) {
  return SHA256(id.toString()).toString();
}