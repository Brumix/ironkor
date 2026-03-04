import SafeScreen from "@/components/ui/SafeScreen";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SafeScreen>
        <Stack />
      </SafeScreen>
    </SafeAreaProvider>
  );
}
