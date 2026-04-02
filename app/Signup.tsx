import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert, Keyboard, StatusBar, Dimensions } from 'react-native';
import { useRef } from 'react';
import { router } from 'expo-router';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from '../firebaseConfig';
import { doc, setDoc } from "firebase/firestore";
import { Colors, Radius, Gaps } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { height } = Dimensions.get('window');

export default function Signup() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const emailRef = useRef<TextInput>(null);
    const passwordRef = useRef<TextInput>(null);

    const handleSignup = async () => {
        if (!name || !email || !password) {
            Alert.alert('Selection Error', 'Please complete all fields to create your medical profile.');
            return;
        }
        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, "users", userCredential.user.uid), {
                name: name,
                email: email,
                createdAt: new Date().toISOString()
            });
            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('Signup Error', error.message);
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
                        <Text style={styles.headerTitle}>Create Account</Text>
                        <Text style={styles.headerSubtitle}>Start your journey to better health</Text>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(600).duration(800)} style={[styles.formCard, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.text }]}>Full Name</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.input, borderColor: theme.border }]}>
                                <Ionicons name="person-outline" size={20} color={theme.primary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    placeholder="Enter your name"
                                    placeholderTextColor={theme.textDim}
                                    value={name}
                                    onChangeText={setName}
                                    returnKeyType="next"
                                    onSubmitEditing={() => emailRef.current?.focus()}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.input, borderColor: theme.border }]}>
                                <Ionicons name="mail-outline" size={20} color={theme.primary} style={styles.inputIcon} />
                                <TextInput
                                    ref={emailRef}
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
                                    onSubmitEditing={handleSignup}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                    <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={22} color={theme.textDim} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={styles.signupBtnContainer} 
                            onPress={handleSignup} 
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={[theme.primary, theme.secondary]}
                                style={styles.signupBtn}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {loading ? <ActivityIndicator color="#FFF" /> : (
                                    <>
                                        <Text style={styles.signupBtnText}>CREATE ACCOUNT</Text>
                                        <Ionicons name="rocket-outline" size={20} color="#FFF" />
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.footer}>
                            <Text style={[styles.footerText, { color: theme.textDim }]}>Already have an account?</Text>
                            <TouchableOpacity onPress={() => router.replace('/login')}>
                                <Text style={[styles.footerAction, { color: theme.primary }]}>Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.delay(1000).duration(800)} style={styles.disclaimer}>
                        <Ionicons name="shield-checkmark-outline" size={14} color={theme.textDim} />
                        <Text style={[styles.disclaimerText, { color: theme.textDim }]}>Secure medical-grade storage active</Text>
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
    signupBtnContainer: {
        marginTop: 10,
        borderRadius: 20,
        overflow: 'hidden',
    },
    signupBtn: {
        height: 65,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    signupBtnText: {
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