import { Text, View } from "@tarojs/components";
import "./Avatar.css";

interface AvatarProps {
  name: string;
  size?: "small" | "medium" | "large";
}

export function Avatar({ name, size = "medium" }: AvatarProps) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "P";
  return (
    <View className={`avatar avatar--${size}`}>
      <Text>{initial}</Text>
    </View>
  );
}
