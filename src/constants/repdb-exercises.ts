export type RepDBIllustration = {
  slug: string;
  start?: string;
  peak?: string;
  main?: string;
};

const repDBAliases: Record<string, RepDBIllustration> = {
  'incline-dumbbell-press': { slug: 'incline-db-press', start: 'incline-db-press-start.webp', peak: 'incline-db-press-peak.webp' },
  'chest-supported-row': { slug: 'chest-supported-db-row', start: 'chest-supported-db-row-start.webp', peak: 'chest-supported-db-row-peak.webp' },
  'pec-deck-fly': { slug: 'pec-deck', start: 'pec-deck-start.webp', peak: 'pec-deck-peak.webp' },
  'overhead-press': { slug: 'dumbbell-shoulder-press', start: 'dumbbell-shoulder-press-start.webp', peak: 'dumbbell-shoulder-press-peak.webp' },
  'dumbbell-curl': { slug: 'bicep-curl', start: 'bicep-curl-start.webp', peak: 'bicep-curl-peak.webp' },
  'triceps-pushdown': { slug: 'tricep-pushdown', start: 'tricep-pushdown-start.webp', peak: 'tricep-pushdown-peak.webp' },
  'calf-raise': { slug: 'bodyweight-calf-raise', start: 'bodyweight-calf-raise-start.webp', peak: 'bodyweight-calf-raise-peak.webp' },
  'crunch': { slug: 'crunches', start: 'crunches-start.webp', peak: 'crunches-peak.webp' },
  'incline-smith-press': { slug: 'smith-machine-incline-bench-press', start: 'smith-machine-incline-bench-press-start.webp', peak: 'smith-machine-incline-bench-press-peak.webp' },
  'flat-dumbbell-press': { slug: 'db-bench-press', start: 'db-bench-press-start.webp', peak: 'db-bench-press-peak.webp' },
  'reverse-pec-deck': { slug: 'cable-reverse-fly', start: 'cable-reverse-fly-start.webp', peak: 'cable-reverse-fly-peak.webp' },
  'incline-dumbbell-curl': { slug: 'incline-db-curl', start: 'incline-db-curl-start.webp', peak: 'incline-db-curl-peak.webp' },
  'machine-chest-press': { slug: 'chest-press-machine', start: 'chest-press-machine-start.webp', peak: 'chest-press-machine-peak.webp' },
  'machine-incline-chest-press': { slug: 'smith-machine-incline-bench-press', start: 'smith-machine-incline-bench-press-start.webp', peak: 'smith-machine-incline-bench-press-peak.webp' },
  'machine-lateral-raise': { slug: 'plate-loaded-lateral-raise', start: 'plate-loaded-lateral-raise-start.webp', peak: 'plate-loaded-lateral-raise-peak.webp' },
  'cable-crossover': { slug: 'cable-fly', start: 'cable-fly-start.webp', peak: 'cable-fly-peak.webp' },
  'hip-adduction-machine': { slug: 'hip-adduction', start: 'hip-adduction-start.webp', peak: 'hip-adduction-peak.webp' },
  'hip-abduction-machine': { slug: 'hip-abduction', start: 'hip-abduction-start.webp', peak: 'hip-abduction-peak.webp' },
  'machine-glute-kickback': { slug: 'glute-kickback', start: 'glute-kickback-start.webp', peak: 'glute-kickback-peak.webp' },
  'machine-ab-crunch': { slug: 'machine-seated-crunch', start: 'machine-seated-crunch-start.webp', peak: 'machine-seated-crunch-peak.webp' },
  'roman-chair-back-extension': { slug: 'machine-back-extension', start: 'machine-back-extension-start.webp', peak: 'machine-back-extension-peak.webp' },
  'assisted-pull-up': { slug: 'assisted-pull-ups', start: 'assisted-pull-ups-start.webp', peak: 'assisted-pull-ups-peak.webp' },
  'assisted-dip': { slug: 'assisted-dips', start: 'assisted-dips-start.webp', peak: 'assisted-dips-peak.webp' },
  'rotary-torso': { slug: 'torso-twists', main: 'torso-twists-main.webp' },
  'machine-biceps-curl': { slug: 'machine-bicep-curl', start: 'machine-bicep-curl-start.webp', peak: 'machine-bicep-curl-peak.webp' },
  'machine-chest-dip': { slug: 'dips', start: 'dips-start.webp', peak: 'dips-peak.webp' },
  'incline-barbell-press': { slug: 'incline-bench-press', start: 'incline-bench-press-start.webp', peak: 'incline-bench-press-peak.webp' },
  'dumbbell-fly': { slug: 'db-fly', start: 'db-fly-start.webp', peak: 'db-fly-peak.webp' },
  'dumbbell-pullover': { slug: 'db-pullover', start: 'db-pullover-start.webp', peak: 'db-pullover-peak.webp' },
  'dumbbell-row': { slug: 'bent-over-db-row', start: 'bent-over-db-row-start.webp', peak: 'bent-over-db-row-peak.webp' },
  'single-arm-cable-row': { slug: 'one-arm-seated-cable-row', start: 'one-arm-seated-cable-row-start.webp', peak: 'one-arm-seated-cable-row-peak.webp' },
  'chin-up': { slug: 'chin-ups', start: 'chin-ups-start.webp', peak: 'chin-ups-peak.webp' },
  'barbell-shrug': { slug: 'shrug', start: 'shrug-start.webp', peak: 'shrug-peak.webp' },
  'barbell-hip-thrust': { slug: 'hip-thrust', start: 'hip-thrust-start.webp', peak: 'hip-thrust-peak.webp' },
  'step-up': { slug: 'step-ups', start: 'step-ups-start.webp', peak: 'step-ups-peak.webp' },
  'lying-triceps-extension': { slug: 'lying-tricep-extension', start: 'lying-tricep-extension-start.webp', peak: 'lying-tricep-extension-peak.webp' },
  'dumbbell-overhead-triceps-extension': { slug: 'single-arm-dumbbell-overhead-tricep-extension', start: 'single-arm-dumbbell-overhead-tricep-extension-start.webp', peak: 'single-arm-dumbbell-overhead-tricep-extension-peak.webp' },
  'cable-biceps-curl': { slug: 'cable-curl', start: 'cable-curl-start.webp', peak: 'cable-curl-peak.webp' },
  'pallof-press': { slug: 'cable-pallof-press', start: 'cable-pallof-press-start.webp', peak: 'cable-pallof-press-peak.webp' },
  'cable-woodchop': { slug: 'cable-bent-over-row', start: 'cable-bent-over-row-start.webp', peak: 'cable-bent-over-row-peak.webp' },
  'plank': { slug: 'plank', main: 'plank-main.webp' },
};

export function getRepDBIllustration(exerciseId: string): RepDBIllustration | null {
  if (repDBAliases[exerciseId]) return repDBAliases[exerciseId];
  return {
    slug: exerciseId,
    start: `${exerciseId}-start.webp`,
    peak: `${exerciseId}-peak.webp`,
  };
}
