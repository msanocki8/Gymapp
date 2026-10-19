import { useId } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';

import type { Exercise } from '@/constants/exercise-library';
import type { MuscleId, MuscleStatus, MuscleVolume } from '@/lib/muscle-volume';

type MuscleGroup =
  | 'chest'
  | 'upperChest'
  | 'upperBack'
  | 'adductors'
  | 'frontDelts'
  | 'lateralDelts'
  | 'rearDelts'
  | 'triceps'
  | 'biceps'
  | 'forearms'
  | 'traps'
  | 'lats'
  | 'lowerBack'
  | 'abs'
  | 'obliques'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves';
type MuscleRole = 'primary' | 'secondary' | 'inactive';
export type BodyView = 'front' | 'back';

type MuscleRegion = {
  group: MuscleGroup;
  path: string;
};

const matchers: Record<MuscleGroup, RegExp> = {
  chest: /klatka|piersi|pectoral/,
  upperChest: /gorna czesc klatki/,
  upperBack: /gorna czesc plecow|srodek plecow/,
  adductors: /przywodzic/,
  frontDelts: /przedni akton bark|przednia czesc bark|bark.*przod/,
  lateralDelts: /boczny akton bark/,
  rearDelts: /tylny akton bark|tylna czesc bark|bark.*tyl|rotator/,
  triceps: /triceps/,
  biceps: /biceps/,
  forearms: /przedramion/,
  traps: /czworobocz|trapezi|srodek plecow|gorna czesc plecow/,
  lats: /najszers|szeroki grzbiet|latissimus/,
  lowerBack: /prostownik.*grzbiet|prostowniki grzbiet|dolna czesc plecow/,
  abs: /brzuch|core|prosty brzucha/,
  obliques: /skosn/,
  glutes: /poslad/,
  quads: /czworoglow|czworoglowe|prostownik kolana|przod uda/,
  hamstrings: /dwuglow|tyl uda|tylna czesc uda|hamstring/,
  calves: /lydk|plaszczkowat/,
};

const colors: Record<MuscleRole, { start: string; end: string; glow: string }> = {
  primary: { start: '#E8FFAA', end: '#79DD20', glow: '#B7FF35' },
  secondary: { start: '#B8FCFF', end: '#28C5D9', glow: '#45E8F2' },
  inactive: { start: '#536159', end: '#303B34', glow: '#536159' },
};

const volumeColors: Record<MuscleStatus, { fill: string; glow: string }> = {
  'no-stimulus': { fill: '#303B34', glow: '#536159' },
  below: { fill: '#3979D6', glow: '#69A8FF' },
  'in-range': { fill: '#79DD20', glow: '#B7FF35' },
  'above-preferred': { fill: '#79DD20', glow: '#B7FF35' },
  warning: { fill: '#D94343', glow: '#FF7474' },
};

const frontRegions: MuscleRegion[] = [
  { group: 'lateralDelts', path: 'M87 92 C79 91 72 97 71 107 C71 115 77 121 85 124 L99 113 L106 101 Z' },
  { group: 'frontDelts', path: 'M98 88 C87 85 76 91 73 102 C70 112 76 123 87 127 L105 116 L116 101 Z' },
  { group: 'chest', path: 'M137 104 C127 96 111 95 99 101 C91 105 89 115 92 126 C96 139 111 148 133 150 C137 140 139 127 137 104 Z' },
  { group: 'upperChest', path: 'M136 105 C126 99 111 98 100 103 C96 106 95 110 95 115 C108 112 123 114 136 121 Z' },
  { group: 'biceps', path: 'M76 130 C68 135 65 147 68 159 L76 183 C79 190 87 192 92 187 L89 159 C88 150 91 142 97 136 Z' },
  { group: 'forearms', path: 'M68 190 C63 197 63 207 66 217 L78 247 C81 254 89 255 94 250 L83 215 C81 207 82 198 87 191 Z' },
  { group: 'abs', path: 'M117 153 C123 150 131 150 137 153 L137 226 C131 231 123 231 117 226 Z' },
  { group: 'obliques', path: 'M94 148 C103 152 109 154 113 155 L113 218 C105 216 97 211 93 203 Z' },
  { group: 'quads', path: 'M111 260 C119 255 130 255 137 260 L137 349 C132 358 120 361 111 354 C105 340 103 324 104 306 Z' },
  { group: 'adductors', path: 'M129 266 C134 268 137 275 137 286 L136 329 C132 326 129 318 128 307 Z' },
  { group: 'calves', path: 'M112 371 C120 366 131 367 137 373 L135 435 C133 451 129 465 124 477 L109 477 C111 458 106 442 105 427 C104 407 107 386 112 371 Z' },
];

const backRegions: MuscleRegion[] = [
  { group: 'lateralDelts', path: 'M87 92 C79 91 72 97 71 107 C71 115 77 121 85 124 L99 113 L106 101 Z' },
  { group: 'rearDelts', path: 'M98 88 C87 85 76 91 73 102 C70 112 76 123 87 127 L105 116 L116 101 Z' },
  { group: 'traps', path: 'M140 82 C129 82 117 91 108 103 L124 123 L138 141 Z' },
  { group: 'upperBack', path: 'M139 119 C130 123 124 133 121 146 L124 165 L138 159 Z' },
  { group: 'triceps', path: 'M76 130 C68 135 65 147 68 159 L76 183 C79 190 87 192 92 187 L89 159 C88 150 91 142 97 136 Z' },
  { group: 'forearms', path: 'M68 190 C63 197 63 207 66 217 L78 247 C81 254 89 255 94 250 L83 215 C81 207 82 198 87 191 Z' },
  { group: 'lats', path: 'M99 119 C107 126 112 135 114 146 L117 205 C109 217 98 225 89 220 C84 203 81 185 83 167 C84 147 89 131 99 119 Z' },
  { group: 'lowerBack', path: 'M118 153 C124 150 132 150 138 153 L138 229 C132 236 124 236 118 229 Z' },
  { group: 'glutes', path: 'M101 237 C111 229 126 231 138 237 L138 276 C129 287 116 290 104 282 C97 272 96 252 101 237 Z' },
  { group: 'hamstrings', path: 'M108 291 C117 285 129 287 138 293 L137 355 C132 366 121 371 111 364 C105 348 103 329 104 313 Z' },
  { group: 'adductors', path: 'M130 295 C135 299 137 307 137 321 L136 347 C132 343 129 334 128 324 Z' },
  { group: 'calves', path: 'M111 374 C117 367 130 367 137 374 L136 411 C134 423 125 431 115 425 C108 416 106 399 108 386 Z' },
];

function normalizeMuscle(value: string) {
  return value.toLocaleLowerCase('pl-PL').replace(/ł/g, 'l').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getMuscleRoles(exercise: Exercise): Record<MuscleGroup, MuscleRole> {
  const roles = Object.fromEntries(
    (Object.keys(matchers) as MuscleGroup[]).map((group) => [group, 'inactive']),
  ) as Record<MuscleGroup, MuscleRole>;

  const classify = (muscles: string[], role: Exclude<MuscleRole, 'inactive'>) => {
    for (const muscle of muscles) {
      const normalized = normalizeMuscle(muscle);
      if (/^barki?$/.test(normalized)) {
        for (const group of ['frontDelts', 'lateralDelts', 'rearDelts'] as const) {
          if (role === 'primary' || roles[group] !== 'primary') roles[group] = role;
        }
      }
      for (const group of Object.keys(matchers) as MuscleGroup[]) {
        if (matchers[group].test(normalized) && (role === 'primary' || roles[group] !== 'primary')) {
          roles[group] = role;
        }
      }
    }
  };

  classify(exercise.secondaryMuscles ?? [], 'secondary');
  classify(exercise.primaryMuscles ?? [exercise.category], 'primary');
  if (exercise.category === 'Barki' && !exercise.primaryMuscles?.length) {
    roles.frontDelts = 'primary';
    roles.rearDelts = 'primary';
  }
  return roles;
}

export function getBodyView(exercise: Exercise): BodyView {
  const primary = (exercise.primaryMuscles ?? []).map(normalizeMuscle).join(' ');
  if (/czworoglow|prostownik kolana|przod uda/.test(primary)) return 'front';
  if (/dwuglow|tyl uda|hamstring|prostownik.*grzbiet|poslad|lydk|plaszczkowat/.test(primary)) return 'back';
  if (/triceps|najszers|szeroki grzbiet|latissimus|czworobocz|tylny akton bark/.test(primary)) return 'back';
  if (/klatka|piersi|pectoral|biceps|prosty brzucha|skosn/.test(primary)) return 'front';
  if (exercise.category === 'Plecy') return 'back';
  if (exercise.category === 'Ramiona') return /triceps/.test(primary) ? 'back' : 'front';
  if (exercise.category === 'Barki') return /tylny akton|czworobocz/.test(primary) ? 'back' : 'front';
  return 'front';
}

function gradientId(prefix: string, role: MuscleRole) {
  return `${prefix}-${role}`;
}

function MuscleShape({
  region,
  roles,
  id,
  mirrored = false,
  volume,
  selected,
  onMuscleSelect,
}: {
  region: MuscleRegion;
  roles: Record<MuscleGroup, MuscleRole>;
  id: string;
  mirrored?: boolean;
  volume?: MuscleVolume;
  selected?: boolean;
  onMuscleSelect?: (muscleId: MuscleId) => void;
}) {
  const role = roles[region.group];
  const aggregateColor = volumeColors[volume?.status ?? 'no-stimulus'];
  const strokeColor = volume ? aggregateColor.glow : colors[role].glow;
  const transform = mirrored ? 'translate(280 0) scale(-1 1)' : undefined;
  return (
    <>
      {(volume ? volume.status !== 'no-stimulus' : role !== 'inactive') && (
        <Path
          d={region.path}
          transform={transform}
          fill="none"
          stroke={strokeColor}
          strokeOpacity={0.3}
          strokeWidth={10}
          strokeLinecap="round"
          strokeLinejoin="round"
          onPress={onMuscleSelect ? () => onMuscleSelect(region.group) : undefined}
        />
      )}
      <Path
        d={region.path}
        transform={transform}
        fill={volume ? aggregateColor.fill : `url(#${gradientId(id, role)})`}
        stroke={strokeColor}
        strokeOpacity={volume ? (selected ? 1 : 0.9) : role === 'inactive' ? 0.62 : 0.96}
        strokeWidth={volume ? (selected ? 2.6 : 1.5) : role === 'inactive' ? 1.1 : 1.5}
        strokeLinejoin="round"
        accessibilityLabel={volume ? `${volume.name}: ${volume.effectiveSets.toFixed(1)} serii efektywnych` : undefined}
        onPress={onMuscleSelect ? () => onMuscleSelect(region.group) : undefined}
      />
    </>
  );
}

export function MuscleEngagementMap({
  exercise,
  view,
  onViewChange,
  volumes,
  selectedMuscleId,
  onMuscleSelect,
}: {
  exercise?: Exercise;
  view: BodyView;
  onViewChange: (view: BodyView) => void;
  volumes?: MuscleVolume[];
  selectedMuscleId?: MuscleId;
  onMuscleSelect?: (muscleId: MuscleId) => void;
}) {
  const id = useId().replace(/:/g, '');
  const regions = view === 'front' ? frontRegions : backRegions;
  const roles = exercise
    ? getMuscleRoles(exercise)
    : Object.fromEntries((Object.keys(matchers) as MuscleGroup[]).map((group) => [group, 'inactive'])) as Record<MuscleGroup, MuscleRole>;
  const volumesById = new Map(volumes?.map((volume) => [volume.muscleId, volume]));
  const arm = 'M82 91 C70 91 62 98 59 111 C56 123 62 139 66 152 L73 182 C75 190 82 194 89 190 L87 159 C86 147 90 137 101 126 L111 108 Z M73 188 C66 191 62 198 64 207 L76 246 C79 254 87 257 94 251 L84 215 C82 205 84 198 89 190 Z';
  const leg = 'M109 249 C98 254 94 269 96 287 L103 346 C105 362 112 372 123 373 C133 371 138 362 139 349 L139 267 C131 255 120 249 109 249 Z M113 374 C105 382 104 396 106 412 L111 449 C112 460 109 471 105 481 L139 481 C135 468 136 452 137 439 L139 376 C130 369 121 369 113 374 Z';
  const torso = 'M116 69 L116 81 C106 83 96 87 86 94 C75 94 68 100 65 110 C62 122 70 134 81 140 L92 151 L91 218 C92 232 101 241 111 247 L169 247 C179 241 188 232 189 218 L188 151 L199 140 C210 134 218 122 215 110 C212 100 205 94 194 94 C184 87 174 83 164 81 L164 69 Z';
  const halfRegions = regions.filter((region) => region.group !== 'chest' || view === 'front');

  const gradient = (role: MuscleRole) => (
    <LinearGradient id={gradientId(id, role)} x1="0" y1="0" x2="0.8" y2="1">
      <Stop offset="0" stopColor={colors[role].start} />
      <Stop offset="1" stopColor={colors[role].end} />
    </LinearGradient>
  );

  return (
    <View
      style={{ alignItems: 'center', justifyContent: 'center', height: 318, width: '100%', marginTop: 10, position: 'relative' }}
    >
      <View
        accessibilityRole="toolbar"
        style={{ position: 'absolute', top: 6, left: 6, right: 6, zIndex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
      >
        <View style={{ borderRadius: 999, borderWidth: 1, borderColor: 'rgba(183,255,53,0.22)', backgroundColor: 'rgba(7,12,9,0.86)', paddingHorizontal: 9, paddingVertical: 6 }}>
          <Text style={{ color: '#D8E6D8', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 }}>
            PERSPEKTYWA: {view === 'front' ? 'PRZÓD (FRONT)' : 'TYŁ (BACK)'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(183,255,53,0.24)', backgroundColor: 'rgba(7,12,9,0.9)', padding: 3 }}>
          {(['front', 'back'] as const).map((perspective) => {
            const selected = view === perspective;
            return (
              <Pressable
                key={perspective}
                accessibilityRole="button"
                accessibilityLabel={`Pokaż widok ${perspective === 'front' ? 'z przodu' : 'z tyłu'}`}
                accessibilityState={{ selected }}
                onPress={() => onViewChange(perspective)}
                style={{ minHeight: 34, justifyContent: 'center', borderRadius: 999, paddingHorizontal: 8, backgroundColor: selected ? 'rgba(183,255,53,0.16)' : 'transparent' }}
              >
                <Text style={{ color: selected ? '#B7FF35' : '#9BA89C', fontSize: 8, fontWeight: '900', letterSpacing: 0.55 }}>
                  {perspective === 'front' ? 'PRZÓD' : 'TYŁ'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View
        accessible
        accessibilityLabel={volumes
          ? `Mapa skumulowanej objętości mięśni, widok ${view === 'front' ? 'z przodu' : 'z tyłu'}`
          : `Mapa mięśni dla ćwiczenia ${exercise?.name ?? 'ćwiczenia'}, widok ${view === 'front' ? 'z przodu' : 'z tyłu'}`}
        accessibilityRole="image"
        style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 280 500" preserveAspectRatio="xMidYMid meet">
        <Defs>
          {gradient('primary')}
          {gradient('secondary')}
          {gradient('inactive')}
        </Defs>
        <Ellipse cx="140" cy="489" rx="58" ry="5" fill="#6DEB59" opacity={0.09} />

        <Path d={leg} fill="#252F29" stroke="#66736A" strokeWidth={1.5} strokeLinejoin="round" />
        <Path d={leg} transform="translate(280 0) scale(-1 1)" fill="#252F29" stroke="#66736A" strokeWidth={1.5} strokeLinejoin="round" />
        <Path d={arm} fill="#29342D" stroke="#66736A" strokeWidth={1.5} strokeLinejoin="round" />
        <Path d={arm} transform="translate(280 0) scale(-1 1)" fill="#29342D" stroke="#66736A" strokeWidth={1.5} strokeLinejoin="round" />
        <Path d={torso} fill="#29342D" stroke="#768379" strokeWidth={1.8} strokeLinejoin="round" />

        {halfRegions.map((region) => (
          <MuscleShape
            key={`left-${region.group}`}
            region={region}
            roles={roles}
            id={id}
            volume={volumesById.get(region.group)}
            selected={selectedMuscleId === region.group}
            onMuscleSelect={volumes ? onMuscleSelect : undefined}
          />
        ))}
        {halfRegions.map((region) => (
          <MuscleShape
            key={`right-${region.group}`}
            region={region}
            roles={roles}
            id={id}
            mirrored
            volume={volumesById.get(region.group)}
            selected={selectedMuscleId === region.group}
            onMuscleSelect={volumes ? onMuscleSelect : undefined}
          />
        ))}

        <Circle cx="140" cy="40" r="22" fill="#303B34" stroke="#768379" strokeWidth={1.6} />
        <Path d="M126 60 C129 73 125 79 116 83 L164 83 C155 79 151 73 154 60 Z" fill="#303B34" stroke="#66736A" strokeWidth={1.2} />
        {view === 'front' ? (
          <Path d="M140 30 L140 48 M135 53 C138 55 142 55 145 53" fill="none" stroke="#89968C" strokeOpacity={0.42} strokeWidth={1.2} strokeLinecap="round" />
        ) : (
          <Path d="M130 34 C135 28 145 28 150 34 M133 50 C137 54 143 54 147 50" fill="none" stroke="#89968C" strokeOpacity={0.42} strokeWidth={1.2} strokeLinecap="round" />
        )}

        {view === 'front' ? (
          <Path d="M140 104 L140 231 M94 143 C106 151 119 155 134 157 M186 143 C174 151 161 155 146 157 M100 101 C111 91 126 89 140 96 C154 89 169 91 180 101 M99 205 C110 212 121 215 134 216 M181 205 C170 212 159 215 146 216 M105 326 C114 335 126 337 137 332 M175 326 C166 335 154 337 143 332 M120 395 C127 390 133 390 138 394 M160 395 C153 390 147 390 142 394" fill="none" stroke="#A5B0A7" strokeOpacity={0.4} strokeWidth={1.2} />
        ) : (
          <Path d="M140 83 L140 230 M116 99 C124 117 130 132 137 145 M164 99 C156 117 150 132 143 145 M100 172 C110 184 121 190 135 192 M180 172 C170 184 159 190 145 192 M108 261 C118 270 129 272 138 270 M172 261 C162 270 151 272 142 270 M113 324 C121 333 130 335 138 331 M167 324 C159 333 150 335 142 331 M121 401 C127 394 133 393 138 398 M159 401 C153 394 147 393 142 398" fill="none" stroke="#A5B0A7" strokeOpacity={0.34} strokeWidth={1.2} />
        )}
        <Path d="M70 144 L80 178 M210 144 L200 178 M116 475 L138 475 M164 475 L142 475" fill="none" stroke="#859188" strokeOpacity={0.48} strokeWidth={1.1} strokeLinecap="round" />
        </Svg>
      </View>
    </View>
  );
}
