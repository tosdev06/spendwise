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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function AuthScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async () => {
    // Input validation
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isLogin && !name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    // Email validation
    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Password validation
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // SIGN IN
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (error) throw error;

        navigation.replace('Main');
      } else {
        // SIGN UP - Using exact email without modification
        console.log('Signing up with email:', trimmedEmail);

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: { name: name.trim() }
          }
        });

        if (authError) {
          // Handle specific errors
          if (authError.message.includes('rate limit')) {
            throw new Error('Too many sign-up attempts. Please wait 10-15 minutes.');
          } else if (authError.message.includes('already registered')) {
            throw new Error('This email is already registered. Please sign in instead.');
          } else if (authError.message.includes('Invalid email')) {
            throw new Error('Please enter a valid email address.');
          }
          throw authError;
        }

        if (authData.user) {
          console.log('✅ User created in auth system:', authData.user.email);

          // Create user profile in your custom users table
          try {
            const { error: profileError } = await supabase
              .from('users')
              .insert([{
                id: authData.user.id,
                email: trimmedEmail,
                name: name.trim(),
                monthly_budget: 0,
              }]);

            if (profileError) {
              console.log('Profile creation note:', profileError.message);
              // Don't fail if profile creation has issues
            }
          } catch (profileError) {
            console.log('Profile error caught:', profileError);
          }

          // Immediately sign in the user
          try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: trimmedEmail,
              password,
            });

            if (signInError) {
              // If auto sign-in fails, ask user to sign in manually
              Alert.alert(
                'Success!',
                'Account created successfully! Please sign in with your credentials.',
                [{
                  text: 'OK',
                  onPress: () => {
                    setIsLogin(true);
                    // Keep email filled for convenience
                  }
                }]
              );
            } else {
              // Success! Navigate to main app
              navigation.replace('Main');
            }
          } catch (signInError) {
            Alert.alert('Success', 'Account created! Please sign in.');
            setIsLogin(true);
          }
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      Alert.alert(
        'Error',
        error.message || 'Authentication failed. Please check your details and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Student Expense Manager</Text>
          <Text style={styles.subtitle}>Track. Save. Succeed.</Text>
        </View>

        <View style={styles.form}>
          {!isLogin && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                value={name}
                onChangeText={setName}
                autoCapitalize="none"
                editable={loading === false}
                placeholderTextColor="#94A3B8"
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email-address"
              editable={loading === false}
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="At least 6 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.passwordHint}>
              Must be at least 6 characters long
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => {
              if (!loading) {
                setIsLogin(!isLogin);
                // Clear password when switching modes
                setPassword('');
              }
            }}
            disabled={loading}
          >
            <Text style={styles.switchText}>
              {isLogin
                ? "Don't have an account? Sign Up"
                : 'Already have an account? Sign In'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Securely track and manage your student expenses
          </Text>
          <Text style={styles.tipText}>
            {isLogin
              ? 'Enter your registered email and password'
              : 'Use a valid email you can access'
            }
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#F8FAFC',
    color: '#1E293B',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
  },
  eyeIcon: {
    padding: 16,
  },
  passwordHint: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
    marginLeft: 4,
  },
  button: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    alignItems: 'center',
    padding: 12,
  },
  switchText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  tipText: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});