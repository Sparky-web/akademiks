import { createHash, randomBytes } from "node:crypto";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function issueToken() {
  const token = `ak_${randomBytes(32).toString("hex")}`;
  return { token, tokenHash: hashToken(token), prefix: token.slice(0, 11) };
}

export function readBearer(header: string | null) {
  const match = /^Bearer (ak_[a-f0-9]{64})$/i.exec(header ?? "");
  return match?.[1] ?? null;
}
