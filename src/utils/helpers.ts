import { v4 as uuidv4 } from "uuid";

export const sanitizeFileName = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export const generateS3Key = (fileName: string, customKey?: string): string => {
  if(customKey) {
    return customKey;
  }

    const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const uuid = uuidv4();
    const extension = fileName.split('.').pop();

    return `uploads/${timestamp}/${uuid}.${extension}`;
}