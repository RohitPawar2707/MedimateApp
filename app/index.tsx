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
    
    const logoScale = useSharedValue(0);
    const logoOpacity = useSharedValue(0);
    const logoRotate = useSharedValue(0);
    const textOpacity = useSharedValue(0);
    const textTranslateY = useSharedValue(30);
    const pulseValue = useSharedValue(1);

    useEffect(() => {
        // Entrance Animations
        logoScale.value = withSpring(1, { damping: 12, stiffness: 100 });
        logoOpacity.value = withTiming(1, { duration: 1000 });
        logoRotate.value = withSpring(1, { damping: 15, stiffness: 80 });

        textOpacity.value = withDelay(600, withTiming(1, { duration: 1000 }));
        textTranslateY.value = withDelay(600, withSpring(0, { damping: 12, stiffness: 90 }));

        // Subtle Pulse
        pulseValue.value = withDelay(1500, withRepeat(
            withSequence(
                withTiming(1.05, { duration: 1000 }),
                withTiming(1, { duration: 1000 })
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
            }, 3500); // Increased slightly for "wahhh" effect
            return () => clearTimeout(timer);
        });

        return () => unsubscribe();
    }, []);

    const logoAnimatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: logoScale.value * pulseValue.value },
            { rotate: `${interpolate(logoRotate.value, [0, 1], [0, 360], Extrapolate.CLAMP)}deg` }
        ],
        opacity: logoOpacity.value,
    }));

    const textAnimatedStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
        transform: [{ translateY: textTranslateY.value }],
    }));

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            <LinearGradient
                colors={[theme.primary, colorScheme === 'dark' ? '#1E1B4B' : '#4338CA', '#000']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Background Accent Circles */}
            <View style={[styles.accentCircle, { top: -100, left: -100, backgroundColor: 'rgba(255,255,255,0.05)' }]} />
            <View style={[styles.accentCircle, { bottom: -150, right: -150, backgroundColor: 'rgba(255,255,255,0.03)' }]} />

            <Animated.View style={[styles.logoWrapper, logoAnimatedStyle]}>
                <View style={[styles.logoCircle, { backgroundColor: '#FFF' }]}>
                    <Ionicons name="medkit" size={90} color={theme.primary} />
                </View>
                <View style={styles.logoRing} />
            </Animated.View>

            <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
                <Text style={styles.title}>Medimate</Text>
                <View style={styles.divider} />
                <Text style={styles.subtitle}>Smart Health Companion</Text>
            </Animated.View>

            <View style={styles.footer}>
                <Text style={styles.version}>v2.0 Premium</Text>
                <Text style={styles.footerText}>SECURE HEALTH ECOSYSTEM</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    accentCircle: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
    },
    logoWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
    },
    logoCircle: {
        width: 160,
        height: 160,
        borderRadius: 80,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    logoRing: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
        zIndex: 1,
    },
    textContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: 56,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 3,
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
    },
    divider: {
        width: 40,
        height: 4,
        backgroundColor: '#FFF',
        borderRadius: 2,
        marginVertical: 12,
    },
    subtitle: {
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    footer: {
        position: 'absolute',
        bottom: 60,
        alignItems: 'center',
    },
    version: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 8,
    },
    footerText: {
        color: 'rgba(255, 255, 255, 0.3)',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 3,
    }
});
