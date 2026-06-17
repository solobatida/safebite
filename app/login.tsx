import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ensureCloudAccountSession, ensureLocalAccountSession, hasLocalAccount } from '@/lib/storage';
import { colors, spacing } from '@/constants/theme';
import { supabase, supabaseEnabled } from '@/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  // const submit = async () => {
  //   if (isRegister && nickname.trim().length < 2) {
  //     Alert.alert('Error', 'Enter your name or nickname (min 2 characters).');
  //     return;
  //   }
  //   setLoading(true);
  //   try {
  //     if (isRegister) {
  //       await registerLocalUser(email, password, nickname);
  //     } else {
  //       await loginLocalUser(email, password, nickname || undefined);
  //     }
  //     const session = await getSession();
  //     if (session?.uiLanguage) {
  //       router.replace('/preferences');
  //     } else {
  //       router.replace('/language');
  //     }
  //   } catch (e) {
  //     Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const submit = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email and password are required')
      return
    }
  
    if (isRegister && nickname.trim().length < 2) {
      Alert.alert('Error', 'Enter your nickname')
      return
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.')
      return
    }
  
    setLoading(true)
  
    try {
      const localAccountNickname = nickname.trim().length >= 2 ? nickname : email.split('@')[0]

      if (supabaseEnabled && supabase) {
        if (isRegister) {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                account_nickname: localAccountNickname,
                ui_language: 'en',
              },
            },
          });
          if (error) throw error;
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
        }

        // Build SafeBite session from DB (profiles + family_profiles).
        await ensureCloudAccountSession();
        router.replace('/language');
        return;
      }

      // No Supabase configured → local demo mode
      if (isRegister) {
        await ensureLocalAccountSession(email, password, localAccountNickname, 'en');
        Alert.alert('Success', 'Account created successfully (local).');
      } else {
        const isLocal = await hasLocalAccount(email);
        if (!isLocal) {
          Alert.alert('Error', 'Supabase is not configured and no local account exists for this email.');
          return;
        }
        await ensureLocalAccountSession(email, password, localAccountNickname, 'en');
      }

      router.replace('/language');
    } catch (e) {
      Alert.alert(
        'Error',
        e instanceof Error ? e.message : 'Something went wrong'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{isRegister ? 'Create account' : 'Sign in'}</Text>
        <Text style={styles.hint}>
          {isRegister
            ? 'Create your account with a name or nickname.'
            : 'Local demo auth (saved on your device). Connect Supabase for cloud sync — see README.'}
        </Text>

        <Text style={styles.label}>{isRegister ? 'Your name or nickname' : 'Name (if first sign-in)'}</Text>
        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={setNickname}
          autoCapitalize="words"
          placeholder={isRegister ? 'e.g. Carlos, Dad' : 'Optional — e.g. Carlos'}
        />
        {!isRegister && (
          <Text style={styles.fieldHint}>
            Only needed once for older accounts without a name saved.
          </Text>
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
        <Text style={styles.label}>Password (min 8)</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />
        <PrimaryButton
          label={loading ? '...' : isRegister ? 'Register' : 'Sign in'}
          onPress={submit}
          style={{ marginTop: spacing.lg }}
        />
        <PrimaryButton
          label={isRegister ? 'Already have an account?' : 'Create account'}
          variant="secondary"
          onPress={() => setIsRegister(!isRegister)}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: spacing.lg },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  hint: { fontSize: 13, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.lg },
  label: { fontWeight: '600', marginBottom: spacing.xs, color: colors.text },
  fieldHint: { fontSize: 12, color: colors.textMuted, marginTop: -spacing.sm, marginBottom: spacing.md },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 16,
  },
});
