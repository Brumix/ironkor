import { Redirect, useLocalSearchParams } from "expo-router";

import OnboardingFlow from "@/features/onboarding/OnboardingFlow";

export default function OnboardingRoute() {
  const params = useLocalSearchParams();

  if (params.mode === "edit") {
    return <Redirect href="/(workout)/settings" />;
  }

  return <OnboardingFlow />;
}
