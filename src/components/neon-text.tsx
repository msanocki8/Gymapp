import { PropsWithChildren } from 'react';
import { Platform, StyleProp, Text, TextStyle } from 'react-native';

type NeonTextStyle = TextStyle & {
  textShadow?: string;
};

type NeonTextProps = PropsWithChildren<{
  className?: string;
  style?: StyleProp<TextStyle>;
  color?: string;
}>;

export function NeonText({ children, className, style, color = '#D7FF82' }: NeonTextProps) {
  const glowStyle: NeonTextStyle = Platform.OS === 'web'
    ? { textShadow: `0px 0px 16px ${color}AA` }
    : {
        textShadowColor: `${color}AA`,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 16,
      };

  return (
    <Text
      className={className}
      style={[
        { color },
        glowStyle,
        style,
      ]}>
      {children}
    </Text>
  );
}
