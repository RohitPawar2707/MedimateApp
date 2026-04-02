import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert, Keyboard, StatusBar, Dimensions } from 'react-native';
import { useRef } from 'react';
import { router } from 'expo-router';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from '../firebaseConfig';
import { Colors, Radius, Gaps } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { height } = Dimensions.get('window');

export default function Login() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const passwordRef = useRef<TextInput>(null);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Selection Error', 'Please enter both your email and password to proceed.');
            return;
        }
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('Login Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" />
            
            <LinearGradient
                colors={[theme.primary, colorScheme === 'dark' ? '#1E1B4B' : '#4338CA']}
                style={styles.upperBackground}
            />
            
            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView 
                    contentContainerStyle={styles.scrollContent} 
                    showsVerticalScrollIndicator={false} 
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View entering={FadeInUp.delay(200).duration(800)} style={styles.header}>
                        <Animated.View entering={ZoomIn.delay(400).duration(800)} style={[styles.logoCircle, { ...theme.cardShadow }]}>
                            <Ionicons name="medkit" size={60} color={theme.primary} />
                        </Animated.View>
                        <Text style={styles.headerTitle}>Welcome Back</Text>
                        <Text style={styles.headerSubtitle}>Your health companion is ready</Text>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(600).duration(800)} style={[styles.formCard, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                        
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.input, borderColor: theme.border }]}>
                                <Ionicons name="mail-outline" size={20} color={theme.primary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    placeholder="your@email.com"
                                    placeholderTextColor={theme.textDim}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={setEmail}
                                    returnKeyType="next"
                                    onSubmitEditing={() => passwordRef.current?.focus()}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.text }]}>Password</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.input, borderColor: theme.border }]}>
                                <Ionicons name="lock-closed-outline" size={20} color={theme.primary} style={styles.inputIcon} />
                                <TextInput
                                    ref={passwordRef}
                                    style={[styles.input, { color: theme.text }]}
                                    placeholder="••••••••"
                                    placeholderTextColor={theme.textDim}
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                    returnKeyType="done"
                                    onSubmitEditing={handleLogin}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                    <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={22} color={theme.textDim} />
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity style={styles.forgotBtn}>
                                <Text style={[styles.forgotText, { color: theme.primary }]}>Forgot password?</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity 
                            style={styles.loginBtnContainer} 
                            onPress={handleLogin} 
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={[theme.primary, theme.secondary]}
                                style={styles.loginBtn}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {loading ? <ActivityIndicator color="#FFF" /> : (
                                    <>
                                        <Text style={styles.loginBtnText}>SIGN IN</Text>
                                        <Ionicons name="arrow-forward" size={20} color="#FFF" />
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.footer}>
                            <Text style={[styles.footerText, { color: theme.textDim }]}>Don't have an account?</Text>
                            <TouchableOpacity onPress={() => router.push('/Signup')}>
                                <Text style={[styles.footerAction, { color: theme.primary }]}>Create Account</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(1000).duration(800)} style={styles.disclaimer}>
                        <Ionicons name="shield-checkmark-outline" size={14} color={theme.textDim} />
                        <Text style={[styles.disclaimerText, { color: theme.textDim }]}>Secure medical-grade encryption active</Text>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    upperBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: height * 0.45,
        borderBottomLeftRadius: 60,
        borderBottomRightRadius: 60,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'ios' ? 80 : 60,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoCircle: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 34,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.85)',
        marginTop: 6,
        fontWeight: '600',
    },
    formCard: {
        borderRadius: 32,
        padding: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 15,
        fontWeight: '900',
        marginBottom: 10,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        paddingHorizontal: 16,
        height: 64,
        borderWidth: 1.5,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
    },
    eyeBtn: {
        padding: 8,
    },
    forgotBtn: {
        alignSelf: 'flex-end',
        marginTop: 10,
        marginRight: 4,
    },
    forgotText: {
        fontSize: 14,
        fontWeight: '700',
    },
    loginBtnContainer: {
        marginTop: 10,
        borderRadius: 20,
        overflow: 'hidden',
    },
    loginBtn: {
        height: 65,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    loginBtnText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '900',
        letterSpacing: 1,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 30,
        gap: 6,
    },
    footerText: {
        fontSize: 15,
        fontWeight: '600',
    },
    footerAction: {
        fontSize: 15,
        fontWeight: '900',
    },
    disclaimer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
        gap: 6,
    },
    disclaimerText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});