// src/index.ts
export { scanAndProcessNotes } from "./core/scanAndProcessNotes";
export type {
  ScanOptions,
  ScanResult,
  ProcessedNode,
  SEOData,
  LLMConfigOptions,
} from "./core/types";

export { filenameToSlug } from "./core/utils/slugify";
