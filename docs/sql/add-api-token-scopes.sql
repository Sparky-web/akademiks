-- Права API-токенов на запись. Существующие токены получают пустой список
-- и остаются только для чтения.
ALTER TABLE "ApiToken" ADD COLUMN "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
