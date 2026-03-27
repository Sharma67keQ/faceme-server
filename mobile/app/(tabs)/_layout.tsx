import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { AuthGuard } from "@/hooks/use-auth-guard";
import { colors, radius } from "@/utils/theme";

type TabIconProps = {
  color: string;
  size: number;
};

export default function TabsLayout() {
  return (
    <AuthGuard>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSoft,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "700",
            marginBottom: 4,
          },
          tabBarStyle: {
            height: 84,
            paddingTop: 10,
            paddingBottom: 10,
            backgroundColor: colors.surfaceRaised,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Feed",
            tabBarIcon: ({ color, size }: TabIconProps) => (
              <Ionicons name="newspaper-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="chats"
          options={{
            title: "Chats",
            tabBarIcon: ({ color, size }: TabIconProps) => (
              <Ionicons name="chatbubble-ellipses-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="create"
          options={{
            title: "Studio",
            tabBarIcon: ({ color, size }: TabIconProps) => (
              <Ionicons name="add-circle" color={color} size={size + 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: "Alerts",
            tabBarIcon: ({ color, size }: TabIconProps) => (
              <Ionicons name="notifications-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }: TabIconProps) => (
              <Ionicons name="person-outline" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </AuthGuard>
  );
}
