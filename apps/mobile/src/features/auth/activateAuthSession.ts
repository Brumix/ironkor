import type { Href } from "expo-router";

interface RouterLike {
  replace: (href: Href) => void;
}

interface SessionLike {
  currentTask?: {
    key: string;
  };
}

export type SetActiveLike = (params: {
  session: string;
  navigate: ({ session }: { session: SessionLike }) => void | Promise<void>;
}) => Promise<void>;

export async function activateAuthSession(
  setActive: SetActiveLike,
  sessionId: string,
  router: RouterLike,
) {
  await setActive({
    session: sessionId,
    navigate: ({ session }) => {
      if (session.currentTask) {
        router.replace("/auth-task");
        return;
      }

      router.replace("/(workout)/home");
    },
  });
}
