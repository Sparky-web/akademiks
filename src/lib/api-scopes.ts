// Права API-токенов. Чтение доступно любому действующему токену,
// поэтому отдельного права на чтение нет. Токены без прав — только чтение.
export const API_SCOPES = [
  "schedule:write",
  "teachers:write",
  "groups:write",
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

export const API_SCOPE_LABELS: Record<ApiScope, string> = {
  "schedule:write": "Добавление, изменение и удаление пар",
  "teachers:write": "Добавление, изменение и удаление преподавателей",
  "groups:write": "Добавление, изменение и удаление групп",
};

export function isApiScope(value: string): value is ApiScope {
  return (API_SCOPES as readonly string[]).includes(value);
}
