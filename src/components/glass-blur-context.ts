import { createContext, RefObject } from 'react';
import { View } from 'react-native';

export const GlassBlurTargetContext = createContext<RefObject<View | null> | null>(null);
