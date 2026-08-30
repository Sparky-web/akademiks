import { timingSafeEqual } from "node:crypto";

import { env } from "~/env";

export const isCronAuthorized = (request: Request): boolean => {
  const secret = env.CRON_SECRET ?? env.NEXTAUTH_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || !authorization?.startsWith("Bearer ")) return false;

  const provided = authorization.slice("Bearer ".length);
  const expectedBuffer = Buffer.from(secret);
  const providedBuffer = Buffer.from(provided);
  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
};
