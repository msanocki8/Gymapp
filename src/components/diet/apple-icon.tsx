import Svg, { Path } from 'react-native-svg';

const BODY = 'M12 7.2c-1.1-.9-2.4-1.3-3.6-1.2C5.6 6.2 4 8.6 4 11.6c0 4.3 3 8.9 5.3 8.9.9 0 1.6-.5 2.7-.5s1.8.5 2.7.5C17 20.5 20 15.9 20 11.6c0-3-1.6-5.4-4.4-5.6-1.2-.1-2.5.3-3.6 1.2z';
const LEAF = 'M12.2 6.6c.2-2 1.6-3.4 3.4-3.6-.1 1.9-1.5 3.4-3.4 3.6z';

/** Jabłko konturowe – ikona zakładki Dieta (wariant A). */
export function AppleOutlineIcon({ size = 23, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={BODY} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d={LEAF} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

/** Pełne jabłko (limonka + zielony listek) – do kafelka w nagłówku ekranu Dieta. */
export function AppleFilledIcon({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={BODY} fill="#A3E635" stroke="#06210D" strokeWidth={1.2} strokeLinejoin="round" />
      <Path d={LEAF} fill="#4ADE80" stroke="#06210D" strokeWidth={1.2} strokeLinejoin="round" />
    </Svg>
  );
}
