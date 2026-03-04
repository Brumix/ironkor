import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ReactNode } from 'react';

const SafeScreen = ({ children }: { children: ReactNode }) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        flex: 1,
      }}
    >
      {children}
    </View>
  );
};

export default SafeScreen;
