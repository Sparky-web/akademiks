import { Prisma } from "@prisma/client";
import { db } from "~/server/db";
import { type ApiScope, isApiScope } from "~/lib/api-scopes";
import { RestError } from "./http";
import { hashToken, readBearer } from "./token";

export interface ApiClient {
  id: string;
  name: string;
  scopes: ApiScope[];
}

export async function authenticate(request: Request): Promise<ApiClient> {
  const token = readBearer(request.headers.get("authorization"));
  if (!token)
    throw new RestError(401, "UNAUTHORIZED", "Требуется Bearer-токен");
  try {
    // Одна атомарная операция проверяет отзыв, считает запрос и читает права.
    const client = await db.apiToken.update({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { requestCount: { increment: 1 }, lastUsedAt: new Date() },
      select: { id: true, name: true, scopes: true },
    });
    return { ...client, scopes: client.scopes.filter(isApiScope) };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    )
      throw new RestError(
        401,
        "UNAUTHORIZED",
        "Токен недействителен или отозван",
      );
    throw error;
  }
}

export function requireScope(client: ApiClient, scope: ApiScope) {
  if (!client.scopes.includes(scope))
    throw new RestError(
      403,
      "FORBIDDEN",
      `Токену не выдано право ${scope}. Выпустите новый токен с этим правом.`,
    );
}
