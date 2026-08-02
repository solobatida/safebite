import { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { supabase, supabaseEnabled } from '@/lib/supabase';
import { ensureCloudAccountSession, clearGuestSession } from '@/lib/storage';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { fonts } from '@/constants/fonts';
import { colors, spacing } from '@/constants/theme';

/** After opening the reset link from email, user sets a new password here. */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const submit = async () => {
    setMessage(null);
    setOk(false);
    if (password.length < 8) {
      setMessage('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setMessage('Las contraseñas no coinciden.');
      return;
    }
    if (!supabaseEnabled || !supabase) {
      setMessage('Supabase no está configurado.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      clearGuestSession();
      await ensureCloudAccountSession();
      setOk(true);
      setMessage('Contraseña actualizada. Ya puedes usar la app.');
      setTimeout(() => router.replace('/preferences'), 800);
    } catch (e) {
      setMessage(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Nueva contraseña</Text>
        <Text style={styles.sub}>Elige una contraseña nueva (mín. 8 caracteres).</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          placeholder="Nueva contraseña"
          placeholderTextColor={colors.textMuted}
        />
        <TextInput
          style={styles.input}
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Repetir contraseña"
          placeholderTextColor={colors.textMuted}
        />
        {message ? (
          <Text style={[styles.msg, ok && styles.msgOk]}>{message}</Text>
        ) : null}
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}
          onPress={submit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.btnLabel}>Guardar</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.loginBg },
  container: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 24, color: colors.text, marginBottom: spacing.sm },
  sub: { fontFamily: fonts.regular, color: colors.textMuted, marginBottom: spacing.lg },
  input: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E6E2',
    padding: 16,
    marginBottom: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  msg: { fontFamily: fonts.regular, color: colors.danger, marginBottom: spacing.md },
  msgOk: { color: colors.safe },
  btn: {
    backgroundColor: colors.primaryDark,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  btnLabel: { color: colors.white, fontFamily: fonts.bold, fontSize: 16 },
});
