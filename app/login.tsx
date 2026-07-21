import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PrimaryButton } from '@/components/PrimaryButton';
import {
  ensureCloudAccountSession,
  registerLocalUser,
  loginLocalUser,
  hasLocalAccount,
  clearGuestSession,
} from '@/lib/storage';
import { LANGUAGES } from '@/constants/languages';
import { colors, spacing } from '@/constants/theme';
import { supabase, supabaseEnabled } from '@/lib/supabase';
import { getAuthErrorMessage, isEmailNotConfirmedError } from '@/lib/authErrors';
import type { UiLanguage } from '@/types';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>('es');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendOk, setResendOk] = useState(false);

  // Leaving guest mode when opening login/register
  useEffect(() => {
    clearGuestSession();
  }, []);

  const clearFeedback = () => {
    setFormError(null);
    setNeedsEmailConfirm(false);
    setResendOk(false);
  };

  const switchMode = (register: boolean) => {
    setIsRegister(register);
    clearFeedback();
  };

  const resendConfirmation = async () => {
    if (!supabase || !email.trim()) {
      setFormError('Introduce tu email arriba para reenviar la confirmación.');
      return;
    }

    setResendBusy(true);
    setResendOk(false);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });
      if (error) throw error;
      setFormError('Email de confirmación reenviado. Revisa tu bandeja de entrada y spam.');
      setResendOk(true);
    } catch (e) {
      setFormError(getAuthErrorMessage(e));
    } finally {
      setResendBusy(false);
    }
  };

  const submit = async () => {
    clearFeedback();

    if (!email || !password) {
      setFormError('Email y contraseña son obligatorios');
      return;
    }

    if (isRegister && nickname.trim().length < 2) {
      setFormError('Introduce un nickname (mín. 2 caracteres)');
      return;
    }

    if (password.length < 8) {
      setFormError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);

    try {
      if (supabaseEnabled && supabase) {
        if (isRegister) {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                account_nickname: nickname.trim(),
                ui_language: uiLanguage,
              },
            },
          });
          if (error) throw error;

          if (!data.session) {
            setFormError(
              'Cuenta creada. Te hemos enviado un enlace de confirmación — ábrelo y luego inicia sesión con Login.'
            );
            setNeedsEmailConfirm(true);
            setIsRegister(false);
            return;
          }

          if (data.user) {
            await supabase
              .from('profiles')
              .update({ ui_language: uiLanguage, account_nickname: nickname.trim() })
              .eq('id', data.user.id);
          }

          clearGuestSession();
          await ensureCloudAccountSession();
          router.replace('/preferences');
          return;
        }

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;

        const userId = authData.user?.id;
        if (!userId) throw new Error('No se pudo iniciar sesión');

        const { data: profile, error: profErr } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
        if (profErr) throw profErr;
        if (!profile) {
          await supabase.auth.signOut();
          throw new Error('Usuario no registrado. Crea una cuenta primero.');
        }

        clearGuestSession();
        await ensureCloudAccountSession();
        router.replace('/preferences');
        return;
      }

      clearGuestSession();
      if (isRegister) {
        await registerLocalUser(email, password, nickname.trim(), uiLanguage);
      } else {
        const isLocal = await hasLocalAccount(email);
        if (!isLocal) {
          setFormError('No hay cuenta local con este email. Regístrate primero.');
          return;
        }
        await loginLocalUser(email, password);
      }
      router.replace('/preferences');
    } catch (e) {
      setFormError(getAuthErrorMessage(e));
      if (isEmailNotConfirmedError(e)) {
        setNeedsEmailConfirm(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleBtn, !isRegister && styles.toggleBtnActive]}
            onPress={() => switchMode(false)}
          >
            <Text style={[styles.toggleText, !isRegister && styles.toggleTextActive]}>Login</Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, isRegister && styles.toggleBtnActive]}
            onPress={() => switchMode(true)}
          >
            <Text style={[styles.toggleText, isRegister && styles.toggleTextActive]}>Regístrate</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>{isRegister ? 'Crear cuenta' : 'Iniciar sesión'}</Text>
        <Text style={styles.hint}>
          {isRegister
            ? 'Nickname, email, contraseña e idioma. Los datos se guardan en Supabase cuando está configurado.'
            : 'Email y contraseña. Solo campos de login — sin nickname.'}
        </Text>

        {isRegister && (
          <>
            <Text style={styles.label}>Nickname</Text>
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
              autoCapitalize="words"
              placeholder="e.g. Carlos"
            />

            <Text style={styles.label}>Idioma</Text>
            <View style={styles.langGrid}>
              {LANGUAGES.map((l) => (
                <Pressable
                  key={l.code}
                  style={[styles.langChip, uiLanguage === l.code && styles.langChipSelected]}
                  onPress={() => setUiLanguage(l.code)}
                >
                  <Text style={styles.langChipText}>{l.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="you@example.com"
        />
        <Text style={styles.label}>Contraseña (mín. 8)</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />

        {formError ? (
          <View style={[styles.feedbackBox, resendOk && styles.feedbackBoxOk]}>
            <Text style={[styles.feedbackText, resendOk && styles.feedbackTextOk]}>{formError}</Text>
            {needsEmailConfirm ? (
              <PrimaryButton
                label={resendBusy ? 'Enviando...' : 'Reenviar email de confirmación'}
                variant="secondary"
                onPress={resendConfirmation}
                style={{ marginTop: spacing.sm }}
              />
            ) : null}
          </View>
        ) : null}

        <PrimaryButton
          label={loading ? '...' : isRegister ? 'Registrarse' : 'Entrar'}
          onPress={submit}
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: spacing.lg },
  toggleRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  toggleBtnActive: { backgroundColor: colors.primary },
  toggleText: { fontWeight: '600', color: colors.textMuted },
  toggleTextActive: { color: colors.white },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  hint: { fontSize: 13, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.lg },
  label: { fontWeight: '600', marginBottom: spacing.xs, color: colors.text },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 16,
  },
  feedbackBox: {
    backgroundColor: colors.dangerBg,
    borderRadius: 10,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  feedbackBoxOk: {
    backgroundColor: colors.safeBg,
    borderColor: '#A5D6A7',
  },
  feedbackText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  feedbackTextOk: {
    color: colors.safe,
  },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  langChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langChipSelected: { borderColor: colors.primary, backgroundColor: '#E8F5EE' },
  langChipText: { fontSize: 14 },
});
