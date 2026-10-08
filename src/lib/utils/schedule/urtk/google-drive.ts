import { Readable } from "node:stream";
import { google } from "googleapis";

import { env } from "~/env";

const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const SPREADSHEET_MIME_TYPE = "application/vnd.google-apps.spreadsheet";

export type SpreadsheetStore = {
  /** ID Google-таблиц в папке по названию. */
  list: (folderId: string) => Promise<Map<string, string>>;
  create: (name: string, folderId: string, xlsx: Buffer) => Promise<string>;
  update: (fileId: string, xlsx: Buffer) => Promise<void>;
};

/** Google-таблицы в папке Диска. XLSX конвертируется в Google Таблицу при загрузке. */
export function createDriveSpreadsheetStore(): SpreadsheetStore {
  const auth = new google.auth.JWT(
    env.GOOGLE_API_EMAIL,
    undefined,
    env.GOOGLE_API_KEY,
    ["https://www.googleapis.com/auth/drive"],
  );
  const drive = google.drive({ version: "v3", auth });
  const media = (xlsx: Buffer) => ({
    mimeType: XLSX_MIME_TYPE,
    body: Readable.from(xlsx),
  });

  return {
    async list(folderId) {
      const files = new Map<string, string>();
      let pageToken: string | undefined;
      do {
        const { data } = await drive.files.list({
          q: `'${folderId}' in parents and mimeType = '${SPREADSHEET_MIME_TYPE}' and trashed = false`,
          fields: "nextPageToken, files(id, name)",
          pageSize: 1000,
          pageToken,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });
        for (const file of data.files ?? []) {
          if (file.id && file.name && !files.has(file.name)) {
            files.set(file.name, file.id);
          }
        }
        pageToken = data.nextPageToken ?? undefined;
      } while (pageToken);
      return files;
    },

    async create(name, folderId, xlsx) {
      const { data } = await drive.files.create({
        requestBody: {
          name,
          mimeType: SPREADSHEET_MIME_TYPE,
          parents: [folderId],
        },
        media: media(xlsx),
        fields: "id",
        supportsAllDrives: true,
      });
      if (!data.id) throw new Error(`Google Диск не вернул ID таблицы ${name}`);
      return data.id;
    },

    async update(fileId, xlsx) {
      await drive.files.update({
        fileId,
        media: media(xlsx),
        supportsAllDrives: true,
      });
    },
  };
}
