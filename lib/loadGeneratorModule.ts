/**
 * Cached dynamic import for the manual workout generator stack (lib/generator + dailyGenerator + lazy exercise chunks).
 * Keeps the initial tab shell bundle smaller; the chunk loads on first generate (Build My Workout / sport prep).
 */
let generatorModule: Promise<typeof import("./generator")> | null = null;

export function loadGeneratorModule(): Promise<typeof import("./generator")> {
  if (!generatorModule) {
    generatorModule = import("./generator");
  }
  return generatorModule;
}
