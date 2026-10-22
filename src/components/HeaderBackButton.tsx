import { Pressable, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/** Same back chevron on Preferences, Account, and Scan. */
export function HeaderBackButton({
  onPress,
  accessibilityLabel,
}: {
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.headerBack}
    >
      <Ionicons name="chevron-back" size={28} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerBack: {
    paddingHorizontal: Platform.OS === 'web' ? 8 : 0,
    marginLeft: Platform.OS === 'ios' ? 0 : 4,
    justifyContent: 'center',
  },
});
