import type { AnalysisPeriod, MuscleId, MuscleRange, MuscleStatus } from '@/lib/muscle-volume';

const weeklyRanges: Record<MuscleId, MuscleRange> = {
	chest: { preferredMin: 10, preferredMax: 17, warningFrom: 18 },
	upperChest: { preferredMin: 10, preferredMax: 17, warningFrom: 18 },
	lats: { preferredMin: 10, preferredMax: 19, warningFrom: 20 },
	upperBack: { preferredMin: 10, preferredMax: 19, warningFrom: 20 },
	traps: { preferredMin: 10, preferredMax: 19, warningFrom: 20 },
	lowerBack: { preferredMin: 10, preferredMax: 19, warningFrom: 20 },
	frontDelts: { preferredMin: 8, preferredMax: 17, warningFrom: 18 },
	lateralDelts: { preferredMin: 8, preferredMax: 17, warningFrom: 18 },
	rearDelts: { preferredMin: 6, preferredMax: 13, warningFrom: 14 },
	biceps: { preferredMin: 8, preferredMax: 17, warningFrom: 18 },
	triceps: { preferredMin: 8, preferredMax: 17, warningFrom: 18 },
	forearms: { preferredMin: 8, preferredMax: 17, warningFrom: 18 },
	quads: { preferredMin: 10, preferredMax: 21, warningFrom: 22 },
	hamstrings: { preferredMin: 10, preferredMax: 21, warningFrom: 22 },
	glutes: { preferredMin: 8, preferredMax: 17, warningFrom: 18 },
	adductors: { preferredMin: 10, preferredMax: 21, warningFrom: 22 },
	calves: { preferredMin: 6, preferredMax: 15, warningFrom: 16 },
	abs: { preferredMin: 4, preferredMax: 13, warningFrom: 14 },
	obliques: { preferredMin: 4, preferredMax: 13, warningFrom: 14 },
};

const sessionRanges: Record<MuscleId, MuscleRange> = {
	chest: { preferredMin: 4, preferredMax: 9, warningFrom: 10 },
	upperChest: { preferredMin: 4, preferredMax: 9, warningFrom: 10 },
	lats: { preferredMin: 4, preferredMax: 9, warningFrom: 10 },
	upperBack: { preferredMin: 4, preferredMax: 9, warningFrom: 10 },
	traps: { preferredMin: 4, preferredMax: 9, warningFrom: 10 },
	lowerBack: { preferredMin: 4, preferredMax: 9, warningFrom: 10 },
	frontDelts: { preferredMin: 3, preferredMax: 7, warningFrom: 8 },
	lateralDelts: { preferredMin: 3, preferredMax: 7, warningFrom: 8 },
	rearDelts: { preferredMin: 2, preferredMax: 5, warningFrom: 6 },
	biceps: { preferredMin: 3, preferredMax: 7, warningFrom: 8 },
	triceps: { preferredMin: 3, preferredMax: 7, warningFrom: 8 },
	forearms: { preferredMin: 3, preferredMax: 7, warningFrom: 8 },
	quads: { preferredMin: 4, preferredMax: 11, warningFrom: 12 },
	hamstrings: { preferredMin: 4, preferredMax: 11, warningFrom: 12 },
	glutes: { preferredMin: 4, preferredMax: 9, warningFrom: 10 },
	adductors: { preferredMin: 4, preferredMax: 11, warningFrom: 12 },
	calves: { preferredMin: 3, preferredMax: 7, warningFrom: 8 },
	abs: { preferredMin: 3, preferredMax: 7, warningFrom: 8 },
	obliques: { preferredMin: 3, preferredMax: 7, warningFrom: 8 },
};

export const muscleVolumeRanges: Record<AnalysisPeriod, Record<MuscleId, MuscleRange>> = {
	session: sessionRanges,
	week: weeklyRanges,
};

export const muscleVolumeColors: Record<MuscleStatus, string> = {
	'no-stimulus': '#6B7A72',
	below: '#69A8FF',
	'in-range': '#79DD20',
	warning: '#FF7474',
};

export const muscleVolumeMapColors: Record<MuscleStatus, { fill: string; glow: string; highlight: string }> = {
	'no-stimulus': { fill: '#6B7A72', glow: '#6B7A72', highlight: '#D5DDD8' },
	below: { fill: '#3979D6', glow: '#69A8FF', highlight: '#C2E4FF' },
	'in-range': { fill: '#79DD20', glow: '#B7FF35', highlight: '#E8FFAA' },
	warning: { fill: '#D94343', glow: '#FF7474', highlight: '#FFC0C0' },
};
