import { Pressable, Text, StyleSheet, type ViewStyle } from 'react-native';
import { colors, spacing } from '@/constants/theme';

export function PrimaryButton({
  label,
  onPress,
  variant = 'primary',
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: ViewStyle;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.danger,
        pressed && styles.pressed,
        style,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.label,
          variant === 'secondary' && styles.labelSecondary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primaryDark,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  pressed: { opacity: 0.85 },
  label: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  labelSecondary: {
    color: colors.primaryDark,
  },
});
