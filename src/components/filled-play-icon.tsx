import Svg, { Path } from 'react-native-svg';

export function FilledPlayIcon({
  size = 18,
  color = '#06210D',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 4.8L19.2 12L8 19.2V4.8Z" fill={color} />
    </Svg>
  );
}
