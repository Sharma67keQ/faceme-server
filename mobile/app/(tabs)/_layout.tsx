import { Slot } from "expo-router";
import { StyleSheet, View } from "react-native";
import { TopNavigation } from "@/components/top-navigation";
import { AuthGuard } from "@/hooks/use-auth-guard";
import { colors } from "@/utils/theme";

export default function TabsLayout() {
  return (
    <AuthGuard>
      <View style={styles.container}>
        <TopNavigation />
        <View style={styles.content}>
          <Slot />
        </View>
      </View>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
});
