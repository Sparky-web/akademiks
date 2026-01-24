import _ from "lodash";
import fileToArrayBuffer from "../../add-schedule/_lib/utils/file-to-array-buffer";
import * as XLSX from "xlsx";

export default async function parseGroups(file: File) {
  if (
    file.type !==
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" &&
    file.type !== "application/vnd.ms-excel"
  ) {
    throw new Error("неверный тип файла, файл должен быть в формате xlsx");
  }

  const data = await fileToArrayBuffer(file);

  const workbook = XLSX.read(data, { type: "array" });

  if (
    file.type ===
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) throw new Error("Не обнаружены листы в файле");

    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) throw new Error("Не обнаружены листы в файле");

    const arrayData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    return _.uniqBy(
      arrayData.slice(1).map((row: any) => ({
        id: row[0].toString(),
        title: row[1].trim(),
      })),
      "title",
    );
  }

  throw new Error("Файл должен быть в формате XLSX");
}
