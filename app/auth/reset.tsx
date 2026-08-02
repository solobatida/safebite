import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { supabase, supabaseEnabled } from '@/lib/supabase';
import { ensureCloudAccountSession, clearGuestSession, getSession } from '@/lib/storage';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { t } from '@/i18n/translations';
import { fonts } from '@/constants/fonts';
import { colors, spacing } from '@/constants/theme';
import type { UiLanguage } from '@/types';

/** After opening the reset link from email, user sets a new password here. */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const [lang, setLang] = useState<UiLanguage>('es');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    getSession().then((s) => {
      if (s?.uiLanguage) setLang(s.uiLanguage);
    });
  }, []);

  const submit = async () => {
    setMessage(null);
    setOk(false);
    if (password.length < 8) {
      setMessage(t(lang, 'passwordTooShort'));
      return;
    }
    if (password !== confirm) {
      setMessage(t(lang, 'passwordMismatch'));
      return;
    }
    if (!supabaseEnabled || !supabase) {
      setMessage(t(lang, 'authGeneric'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      clearGuestSession();
      await ensureCloudAccountSession();
      setOk(true);
      setMessage(t(lang, 'passwordUpdated'));
      setTimeout(() => router.replace('/preferences'), 800);
    } catch (e) {
      setMessage(getAuthErrorMessage(e, lang));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: t(lang, 'navResetPassword') }} />
      <View style={styles.container}>
        <Text style={styles.title}>{t(lang, 'resetTitle')}</Text>
        <Text style={styles.sub}>{t(lang, 'resetSub')}</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder={t(lang, 'newPassword')}
          placeholderTextColor={colors.textMuted}
        />
        <TextInput
          style={styles.input}
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          placeholder={t(lang, 'confirmPassword')}
          placeholderTextColor={colors.textMuted}
        />
        {message ? (
          <Text style={[styles.msg, ok && styles.msgOk]}>{message}</Text>
        ) : null}
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.88 }]}
          onPress={submit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.btnLabel}>{t(lang, 'save')}</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.loginBg },
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sub: {
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 16,
    fontFamily: fonts.regular,
  },
  msg: {
    color: colors.danger,
    marginBottom: spacing.md,
    fontFamily: fonts.regular,
  },
  msgOk: { color: colors.safe },
  btn: {
    backgroundColor: colors.primaryDark,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnLabel: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
});
