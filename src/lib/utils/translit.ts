import { env } from "~/env";

const translit = (name: string) => {
  // Преобразование имени на английский язык
  const matchTable = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "yo",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "c",
    ч: "ch",
    ш: "sh",
    щ: "shch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
    " ": "-",
  };

  if (env.NEXT_PUBLIC_UNIVERSITY === "RGSU") {
    return name
      .replace(/[а-яё]/gi, function (match) {
        return matchTable[match.toLowerCase()] || "";
      })
      .replace(/ /g, "-")
      .replace(/[^a-zA-Z\d\s-]/g, "");
  } else {
    return name
      .replace(/[а-яё]/gi, function (match) {
        return matchTable[match.toLowerCase()] || "";
      })
      .replace(/ /g, "-")
      .replace(/[^a-zA-Z\d\s-]/g, "");
  }
};

export default translit;
