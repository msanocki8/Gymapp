import { createContext } from 'react';
import type { ComponentRef, RefObject } from 'react';
import { View } from 'react-native';

export const GlassBlurTargetContext = createContext<RefObject<ComponentRef<typeof View> | null> | null>(null);
