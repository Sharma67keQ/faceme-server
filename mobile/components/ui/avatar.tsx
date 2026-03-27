import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/utils/theme";

type AvatarProps = {
  name: string;
  size?: number;
};

export const Avatar = ({ name, size = 44 }: AvatarProps) => (
  <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
    <Text style={styles.initial}>{name.slice(0, 1).toUpperCase()}</Text>
  </View>
);

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: colors.brandCanvas,
    alignItems: "center",
    borderColor: colors.brandInk,
    borderWidth: 1,
    justifyContent: "center",
  },
  initial: {
    color: colors.brandInk,
    fontSize: 18,
    fontWeight: "800",
  },
});
