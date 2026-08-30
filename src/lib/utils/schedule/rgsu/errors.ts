export class RgsuBotBlockedError extends Error {
  constructor() {
    super("РГСУ отклонил запрос как запрос бота");
    this.name = "RgsuBotBlockedError";
  }
}

export const isRgsuBotBlockedError = (error: unknown): boolean =>
  error instanceof RgsuBotBlockedError ||
  (error instanceof Error && error.message.includes("Возможно вы бот")) ||
  String(error).includes("Возможно вы бот");
