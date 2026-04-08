import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>FaceMe</Text>
      <Text style={styles.body}>
        The mobile app source in this workspace is incomplete. This starter screen restores a valid Expo Router
        entrypoint so the app can boot while the remaining feature screens are added.
      </Text>
      <Link href="/(auth)" style={styles.link}>
        Open app routes
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f4f1ea",
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    marginBottom: 12,
    color: "#1e293b",
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: "#334155",
    marginBottom: 20,
  },
  link: {
    fontSize: 16,
    color: "#0f766e",
  },
});
