import axios from "axios";

export type RgsuTokens = { csrfToken: string; checkToken: string };

export const rgsuGetToken = async (): Promise<RgsuTokens> => {
  const { data } = await axios.get<string>(
    "https://rgsu.net/students/schedule/",
  );

  return extractTokens(data);
};

function extractTokens(htmlContent: string): RgsuTokens {
  // Находим форму по ID
  const formStart = htmlContent.indexOf('<form id="needform"');
  if (formStart === -1) throw new Error("Токен не найден");

  // Находим конец формы
  const formEnd = htmlContent.indexOf("</form>", formStart);
  if (formEnd === -1) throw new Error("Токен не найден");

  // Извлекаем только содержимое формы
  const formContent = htmlContent.substring(formStart, formEnd + 7);

  // Ищем токены в пределах формы
  const csrfRegex =
    /<input[^>]*name=["']csrf_token["'][^>]*value=["']([^"']*)["'][^>]*>/i;
  const checkRegex =
    /<input[^>]*name=["']check_token["'][^>]*value=["']([^"']*)["'][^>]*>/i;

  const csrfMatch = formContent.match(csrfRegex);
  const checkMatch = formContent.match(checkRegex);

  if (!checkMatch?.[1] || !csrfMatch?.[1]) throw new Error("Токен не найден");

  return {
    checkToken: checkMatch[1],
    csrfToken: csrfMatch[1],
  };
}
