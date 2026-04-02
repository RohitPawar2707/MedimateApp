import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, StatusBar, Platform } from 'react-native';
import { router } from 'expo-router';
import { Colors, Radius, Gaps } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width, height } = Dimensions.get('window');

export default function Welcome() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            <LinearGradient
                colors={[theme.primary, colorScheme === 'dark' ? '#1E1B4B' : '#4338CA']}
                style={styles.upperContent}
            >
                <Animated.View entering={ZoomIn.delay(200).duration(1000)} style={styles.logoContainer}>
                    <View style={[styles.logoCircle, { ...theme.cardShadow }]}>
                        <Ionicons name="medkit" size={80} color={theme.primary} />
                    </View>
                    <View style={styles.logoBadge}>
                        <Ionicons name="sparkles" size={20} color="#FFF" />
                    </View>
                </Animated.View>
            </LinearGradient>

            <View style={[styles.lowerContent, { backgroundColor: theme.surface }]}>
                <Animated.View entering={FadeInDown.delay(400).duration(1000)} style={styles.textContent}>
                    <Text style={[styles.title, { color: theme.text }]}>Medimate</Text>
                    <Text style={[styles.subtitle, { color: theme.textDim }]}>
                        The most advanced personal health companion. Precision reminders for a healthier life.
                    </Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(600).duration(1000)} style={styles.buttonContainer}>
                    <TouchableOpacity 
                        style={[styles.getStartedBtn, { ...theme.cardShadow }]} 
                        onPress={() => router.push('/Signup')}
                    >
                        <LinearGradient
                            colors={[theme.primary, theme.secondary]}
                            style={styles.btnGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.getStartedText}>GET STARTED</Text>
                            <Ionicons name="rocket-outline" size={20} color="#FFF" style={{ marginLeft: 10 }} />
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.signInBtn, { borderColor: theme.border }]} 
                        onPress={() => router.push('/login')}
                    >
                        <Text style={[styles.signInText, { color: theme.textDim }]}>
                            I already have an account. <Text style={[styles.signInHighlight, { color: theme.primary }]}>Sign In</Text>
                        </Text>
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(800).duration(1000)} style={styles.footer}>
                    <Ionicons name="shield-checkmark" size={16} color={theme.textDim} />
                    <Text style={[styles.footerText, { color: theme.textDim }]}>Privacy First & Secure Data</Text>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    upperContent: {
        height: height * 0.52,
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomLeftRadius: 60,
        borderBottomRightRadius: 60,
    },
    logoContainer: {
        alignItems: 'center',
    },
    logoCircle: {
        width: 170,
        height: 170,
        borderRadius: 85,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F59E0B',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#FFF',
    },
    lowerContent: {
        flex: 1,
        marginTop: -60,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingHorizontal: 30,
        paddingTop: 60,
        alignItems: 'center',
    },
    textContent: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 48,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '600',
        paddingHorizontal: 15,
    },
    buttonContainer: {
        width: '100%',
        gap: 16,
    },
    getStartedBtn: {
        width: '100%',
        borderRadius: 20,
        overflow: 'hidden',
    },
    btnGradient: {
        height: 70,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    getStartedText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 1,
    },
    signInBtn: {
        width: '100%',
        height: 70,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    signInText: {
        fontSize: 15,
        fontWeight: '700',
    },
    signInHighlight: {
        fontWeight: '900',
    },
    footer: {
        marginTop: 'auto',
        marginBottom: 40,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    footerText: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
