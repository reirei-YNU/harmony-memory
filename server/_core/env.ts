import "dotenv/config";

export const PORT = Number(process.env.PORT ?? 3000);
export const BUILT_IN_FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY ?? "";
export const BUILT_IN_FORGE_API_URL =
  process.env.BUILT_IN_FORGE_API_URL ?? "https://api.openai.com";
