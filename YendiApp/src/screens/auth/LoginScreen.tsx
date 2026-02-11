import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, BorderRadius, FontSize, Spacing } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const isValidEmail = (text: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);

  const validate = (): boolean => {
    let valid = true;
    setEmailError('');
    setPasswordError('');

    if (!email.trim()) {
      setEmailError('L\'email est requis.');
      valid = false;
    } else if (!isValidEmail(email.trim())) {
      setEmailError('Format d\'email invalide (ex: nom@email.com).');
      valid = false;
    }

    if (!password) {
      setPasswordError('Le mot de passe est requis.');
      valid = false;
    } else if (password.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères.');
      valid = false;
    }

    return valid;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);

    if (error) {
      let message = 'Une erreur est survenue.';
      if (error.message?.includes('Invalid login')) {
        message = 'Email ou mot de passe incorrect.';
      } else if (error.message?.includes('Email not confirmed')) {
        message = 'Veuillez confirmer votre email avant de vous connecter.';
      }
      Alert.alert('Connexion échouée', message);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header violet avec gradient arrondi */}
          <LinearGradient
            colors={['#4F46E5', '#6C63FF', '#818CF8']}
            style={[styles.header, { paddingTop: insets.top + 50 }]}
          >
            <Image
              source={require('../../../yendilogo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.headerSubtitle}>
              Connectez-vous pour voir vos billets.
            </Text>
          </LinearGradient>

          {/* Carte de formulaire */}
          <View style={styles.formCard}>
            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputContainer, emailError ? styles.inputError : null]}>
              <Ionicons name="mail-outline" size={20} color={emailError ? Colors.danger : Colors.gray400} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="votre@email.com"
                placeholderTextColor={Colors.gray400}
                value={email}
                onChangeText={(t) => { setEmail(t); if (emailError) setEmailError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

            {/* Mot de passe */}
            <Text style={styles.label}>Mot de passe</Text>
            <View style={[styles.inputContainer, passwordError ? styles.inputError : null]}>
              <Ionicons name="lock-closed-outline" size={20} color={passwordError ? Colors.danger : Colors.gray400} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={Colors.gray400}
                value={password}
                onChangeText={(t) => { setPassword(t); if (passwordError) setPasswordError(''); }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.gray400}
                />
              </TouchableOpacity>
            </View>
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

            {/* Mot de passe oublié */}
            <TouchableOpacity style={styles.forgotRow}>
              <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            {/* Bouton Se connecter */}
            <TouchableOpacity onPress={handleLogin} activeOpacity={0.85} disabled={loading}>
              <LinearGradient
                colors={['#6C63FF', '#5A52D5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButton}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.loginButtonText}>Se connecter</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Ou continuer avec */}
          <Text style={styles.orText}>Ou continuer avec</Text>

          {/* Boutons sociaux */}
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialButton}>
              <Text style={styles.socialIcon}>G</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Ionicons name="logo-apple" size={24} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Ionicons name="logo-facebook" size={24} color="#1877F2" />
            </TouchableOpacity>
          </View>

          {/* Créer un compte */}
          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Nouveau ici ? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.signupLink}>Créer un compte</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  // Header gradient arrondi en bas
  header: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 70,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 60,
    marginBottom: Spacing.md,
  },
  headerSubtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  // Carte formulaire
  formCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.xxl,
    marginTop: -30,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    height: 52,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  inputError: {
    borderColor: Colors.danger,
    borderWidth: 1.5,
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  errorText: {
    fontSize: FontSize.xs,
    color: Colors.danger,
    marginTop: 4,
    marginLeft: 4,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  forgotText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: BorderRadius.xxl,
    marginTop: Spacing.lg,
  },
  loginButtonText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
  },
  // Social
  orText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  socialIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#EA4335',
  },
  // Signup
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  signupText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  signupLink: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.primary,
  },
});
