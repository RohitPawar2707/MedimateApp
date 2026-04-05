import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, StatusBar, Platform } from 'react-native';
import { router } from 'expo-router';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withDelay, 
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    
    const logoScale = useSharedValue(0.3);
    const logoOpacity = useSharedValue(0);
    const logoRotate = useSharedValue(0);
    const textOpacity = useSharedValue(0);
    const textTranslateY = useSharedValue(40);
    const pulseValue = useSharedValue(1);
    const backgroundOpacity = useSharedValue(0);

    useEffect(() => {
        // Entrance Animations
        backgroundOpacity.value = withTiming(1, { duration: 1500 });
        logoScale.value = withSpring(1, { damping: 10, stiffness: 80 });
        logoOpacity.value = withTiming(1, { duration: 1200 });
        logoRotate.value = withSpring(1, { damping: 12, stiffness: 70 });

        textOpacity.value = withDelay(800, withTiming(1, { duration: 1200 }));
        textTranslateY.value = withDelay(800, withSpring(0, { damping: 10, stiffness: 80 }));

        // Subtle Continuous Pulse
        pulseValue.value = withDelay(1800, withRepeat(
            withSequence(
                withTiming(1.08, { duration: 1200 }),
                withTiming(1, { duration: 1200 })
            ),
            -1,
            true
        ));

        // Auth Check & Navigation
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            const timer = setTimeout(() => {
                if (user) {
                    router.replace('/(tabs)');
                } else {
                    router.replace('/welcome');
                }
            }, 4000); // 4 seconds for maximum impact
            return () => clearTimeout(timer);
        });

        return () => unsubscribe();
    }, []);

    const logoAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: logoScale.value * pulseValue.value },
            { rotate: `${interpolate(logoRotate.value, [0, 1], [0, 360])}deg` }
        ],
        opacity: logoOpacity.value,
    }));

    const textAnimatedStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
        transform: [{ translateY: textTranslateY.value }],
    }));

    const bgAnimatedStyle = useAnimatedStyle(() => ({
        opacity: backgroundOpacity.value,
    }));

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            <Animated.View style={[StyleSheet.absoluteFill, bgAnimatedStyle]}>
                <LinearGradient
                    colors={[
                        theme.primary, 
                        colorScheme === 'dark' ? '#1E1B4B' : '#4F46E5', 
                        colorScheme === 'dark' ? '#000000' : '#312E81'
                    ]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0.1, y: 0.1 }}
                    end={{ x: 0.9, y: 0.9 }}
                />
                
                {/* Visual Depth Patterns */}
                <View style={[styles.patternCircle, { top: -50, right: -50, width: 300, height: 300, backgroundColor: 'rgba(255,255,255,0.06)' }]} />
                <View style={[styles.patternCircle, { bottom: -100, left: -100, width: 400, height: 400, backgroundColor: 'rgba(255,255,255,0.04)' }]} />
                <View style={[styles.patternCircle, { top: height * 0.4, right: -150, width: 250, height: 250, backgroundColor: 'rgba(255,255,255,0.03)' }]} />
            </Animated.View>

            <View style={styles.content}>
                <Animated.View style={[styles.logoWrapper, logoAnimatedStyle]}>
                    <View style={styles.logoGlow} />
                    <View style={styles.logoCircle}>
                        <Ionicons name="medkit" size={85} color={theme.primary} />
                    </View>
                    <View style={styles.logoRing} />
                </Animated.View>

                <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
                    <Text style={styles.title}>Medimate</Text>
                    <View style={styles.divider} />
                    <Text style={styles.subtitle}>ELEVATING HEALTHCARE</Text>
                </Animated.View>
            </View>

            <View style={styles.footer}>
                <Text style={styles.version}>PREMIUM v2.0</Text>
                <View style={styles.secureLine}>
                    <Ionicons name="shield-checkmark" size={14} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.footerText}>ENTERPRISE GRADE SECURITY</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    patternCircle: {
        position: 'absolute',
        borderRadius: 999,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    logoWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    logoGlow: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(255,255,255,0.15)',
        filter: Platform.OS === 'ios' ? 'blur(30px)' : undefined, // blur doesn't work on android View directly yet without wrapper
    },
    logoCircle: {
        width: 170,
        height: 170,
        borderRadius: 85,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
        elevation: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.4,
        shadowRadius: 25,
    },
    logoRing: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        zIndex: 1,
    },
    textContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 62,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 4,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 6 },
        textShadowRadius: 15,
    },
    divider: {
        width: 50,
        height: 5,
        backgroundColor: '#FFF',
        borderRadius: 3,
        marginVertical: 15,
        opacity: 0.8,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.85)',
        fontWeight: '800',
        letterSpacing: 4,
        textTransform: 'uppercase',
    },
    footer: {
        position: 'absolute',
        bottom: 60,
        width: '100%',
        alignItems: 'center',
    },
    version: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 10,
    },
    secureLine: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    footerText: {
        color: 'rgba(255, 255, 255, 0.25)',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 3,
    }
});
