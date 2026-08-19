/**
 * Node / tests / scripts: load curated setup copy from disk.
 * Metro native and web resolve the `.native.ts` / `.web.ts` stubs instead, so the
 * 2.2MB catalog is not part of the app download.
 */
import curated from "../data/exerciseDescriptions.curated.json";

export async function loadCuratedDescriptionsModule(): Promise<unknown> {
  return curated;
}
