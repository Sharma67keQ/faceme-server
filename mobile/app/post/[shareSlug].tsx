import { Redirect, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native";
import { PostCard } from "@/components/post-card";
import { Screen } from "@/components/ui/screen";
import { postService } from "@/services/posts";
import { useAuthStore } from "@/store/auth-store";
import { colors } from "@/utils/theme";

export default function SharedPostScreen() {
  const { shareSlug } = useLocalSearchParams<{ shareSlug: string }>();
  const accessToken = useAuthStore((state) => state.accessToken);

  const { data, isLoading } = useQuery({
    queryKey: ["shared-post", shareSlug],
    queryFn: () => postService.getSharedPost(shareSlug),
    enabled: Boolean(accessToken && shareSlug),
  });

  if (!accessToken) {
    return <Redirect href="/(auth)/register" />;
  }

  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: "800" }}>Shared post</Text>
      {isLoading ? <Text style={{ color: colors.textMuted }}>Loading post...</Text> : null}
      {data ? <PostCard post={data} /> : null}
    </Screen>
  );
}
