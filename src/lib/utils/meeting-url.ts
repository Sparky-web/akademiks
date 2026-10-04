export const MEETING_URL_MAX_LENGTH = 500;

/**
 * Приводит ссылку на видеовстречу к безопасному виду.
 * Допускаются только https-ссылки, чтобы нельзя было подсунуть javascript: и подобное.
 * Пустая строка означает «убрать ссылку» и возвращает null.
 */
export function normalizeMeetingUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.length > MEETING_URL_MAX_LENGTH)
    throw new Error(`Ссылка длиннее ${MEETING_URL_MAX_LENGTH} символов`);

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Некорректная ссылка. Пример: https://telemost.yandex.ru/j/…");
  }

  if (url.protocol !== "https:")
    throw new Error("Ссылка должна начинаться с https://");
  if (url.username || url.password)
    throw new Error("Ссылка не должна содержать логин и пароль");

  return url.toString();
}
