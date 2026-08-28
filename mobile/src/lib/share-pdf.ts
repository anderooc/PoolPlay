/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { ApiClientError } from "~/api/client";

export async function shareDownloadedPdf(
  download: () => Promise<{
    bytes: ArrayBuffer;
    filename: string | null;
  }>,
  fallbackName: string
): Promise<void> {
  const file = await download();
  const filename = (file.filename ?? fallbackName).replace(/[^\w.\-]+/g, "_");
  const target = new File(Paths.cache, filename);
  target.create({ overwrite: true });
  target.write(new Uint8Array(file.bytes));

  if (!(await Sharing.isAvailableAsync())) {
    throw new ApiClientError(
      "malformed_response",
      "Sharing is not available on this device.",
      0
    );
  }

  await Sharing.shareAsync(target.uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: filename,
  });
}
