import { useId } from 'react';
import { useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

const FONT_SIZE = 38;
const LINE_HEIGHT = 43;
const MAX_CONTENT_WIDTH = 520;

export function GradientText({ children }: { children: string }) {
  const { width: windowWidth } = useWindowDimensions();
  const id = `green-text-${useId().replace(/:/g, '')}`;
  const contentWidth = Math.max(1, Math.min(windowWidth - 40, MAX_CONTENT_WIDTH));

  return (
    <Svg width="100%" height={LINE_HEIGHT} viewBox={`0 0 ${contentWidth} ${LINE_HEIGHT}`}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2={contentWidth} y2="0" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#A3E635" />
          <Stop offset="0.55" stopColor="#22C55E" />
          <Stop offset="1" stopColor="#83F3C0" />
        </LinearGradient>
      </Defs>
      <SvgText
        x={0}
        y={36}
        fill={`url(#${id})`}
        fontFamily="sans-serif"
        fontSize={FONT_SIZE}
        fontWeight="900"
        letterSpacing={-1.2}
        textLength={Math.min(children.length * FONT_SIZE * 0.58, contentWidth)}
        lengthAdjust="spacingAndGlyphs"
      >
        {children}
      </SvgText>
    </Svg>
  );
}
