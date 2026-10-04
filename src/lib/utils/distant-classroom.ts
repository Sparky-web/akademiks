export const DISTANT_CLASSROOM_NAME = "Дистант";

/**
 * Пара проходит дистанционно, если её кабинет называется «Дистант»
 * (так в базе УРТК). Регистр и пробелы по краям не важны.
 */
export function isDistantClassroom(name: string | null | undefined): boolean {
  return (
    !!name &&
    name.trim().toLocaleLowerCase("ru") ===
      DISTANT_CLASSROOM_NAME.toLocaleLowerCase("ru")
  );
}
