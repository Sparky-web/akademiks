export class RgsuBotBlockedError extends Error {
  constructor() {
    super("РГСУ отклонил запрос как запрос бота");
    this.name = "RgsuBotBlockedError";
  }
}

export class RgsuGroupGuidNotFoundError extends Error {
  constructor(public readonly groupId: string) {
    super(`РГСУ не нашёл GUID группы: ${groupId}`);
    this.name = "RgsuGroupGuidNotFoundError";
  }
}

export const isRgsuBotBlockedError = (error: unknown): boolean =>
  error instanceof RgsuBotBlockedError ||
  (error instanceof Error && error.message.includes("Возможно вы бот")) ||
  String(error).includes("Возможно вы бот");

export const isRgsuGroupGuidNotFoundError = (error: unknown): boolean =>
  error instanceof RgsuGroupGuidNotFoundError ||
  (error instanceof Error &&
    error.message.includes("Не удалось найти GUID группы")) ||
  String(error).includes("Не удалось найти GUID группы");
