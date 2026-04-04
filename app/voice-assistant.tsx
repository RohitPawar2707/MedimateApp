import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Radius, Gaps } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguage } from '@/context/LanguageContext';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withSequence, 
  withTiming, 
  FadeInDown, 
  FadeInUp,
  interpolate,
  withSpring
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

export default function VoiceAssistant() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const { t, language: langCode } = useLanguage();

    const [isListening, setIsListening] = useState(false);
    const [statusText, setStatusText] = useState(t('voice.status.ready'));
    const [currentAction, setCurrentAction] = useState<string | null>(null);

    // Wave animations
    const pulse1 = useSharedValue(1);
    const pulse2 = useSharedValue(1);
    const pulse3 = useSharedValue(1);

    useEffect(() => {
        pulse1.value = withRepeat(withSequence(withTiming(1.5, { duration: 1000 }), withTiming(1, { duration: 1000 })), -1, true);
        pulse2.value = withRepeat(withSequence(withTiming(2, { duration: 1200 }), withTiming(1, { duration: 1200 })), -1, true);
        pulse3.value = withRepeat(withSequence(withTiming(2.5, { duration: 1500 }), withTiming(1, { duration: 1500 })), -1, true);
        
        return () => { Speech.stop(); };
    }, []);

    const animatedStyle1 = useAnimatedStyle(() => ({
        transform: [{ scale: pulse1.value }],
        opacity: interpolate(pulse1.value, [1, 2.5], [0.6, 0]),
    }));
    const animatedStyle2 = useAnimatedStyle(() => ({
        transform: [{ scale: pulse2.value }],
        opacity: interpolate(pulse2.value, [1, 2.5], [0.4, 0]),
    }));
    const animatedStyle3 = useAnimatedStyle(() => ({
        transform: [{ scale: pulse3.value }],
        opacity: interpolate(pulse3.value, [1, 2.5], [0.2, 0]),
    }));

    const handleAction = async (action: string) => {
        setCurrentAction(action);
        setIsListening(true);

        if (action === 'read_reminders') {
            setStatusText(t('voice.status.thinking'));
            const text = langCode === 'hi-IN' 
                ? "आपके पास कल सुबह १० बजे डॉक्टर शर्मा के साथ एक अपॉइंटमेंट है। अपनी रिपोर्ट ले जाना न भूलें।"
                : langCode === 'mr-IN'
                ? "तुमची उद्या सकाळी १० वाजता डॉक्टर शर्मा यांच्यासोबत अपॉइंटमेंट आहे. तुमचे रिपोर्ट सोबत नेण्यास विसरू नका."
                : "You have one appointment scheduled with Doctor Sharma tomorrow at 10 AM. Don't forget to carry your reports.";
                
            const voices = await Speech.getAvailableVoicesAsync();
            const voice = voices.find(v => v.language.toLowerCase().includes(langCode.toLowerCase())) || 
                          voices.find(v => v.language.startsWith(langCode.split('-')[0]));
                          
            Speech.speak(text, { 
                language: langCode,
                voice: voice?.identifier,
                onDone: () => {
                    setIsListening(false);
                    setCurrentAction(null);
                    setStatusText(t('voice.status.ready'));
                }
            });
        } else if (action === 'confirm_appt') {
            setStatusText(t('voice.status.thinking'));
            const text = langCode === 'hi-IN'
                ? "आपकी कल की अपॉइंटमेंट की पुष्टि हो गई है। हो गया। मैंने आपके डॉक्टर को पुष्टिकरण भेज दिया है।"
                : langCode === 'mr-IN'
                ? "तुमच्या उद्याच्या भेटीची पुष्टी झाली आहे. झाले. मी तुमच्या डॉक्टरांना पुष्टीकरण पाठवले आहे."
                : "Confirming your appointment for tomorrow. Done. I've sent a confirmation to your doctor.";
                
            Speech.speak(text, { 
                language: langCode,
                onDone: () => {
                    setIsListening(false);
                    setCurrentAction(null);
                    setStatusText(t('voice.status.ready'));
                }
            });
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
            <StatusBar barStyle="light-content" />
            
            <TouchableOpacity 
                style={styles.closeBtn}
                onPress={() => router.back()}
            >
                <Ionicons name="close" size={32} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.content}>
                <Animated.View entering={FadeInUp.duration(800)} style={styles.assistantHeader}>
                    <Text style={styles.assistantTitle}>Medimate Voice</Text>
                    <Text style={styles.statusText}>{statusText}</Text>
                </Animated.View>

                <View style={styles.waveContainer}>
                    <Animated.View style={[styles.wave, { backgroundColor: theme.primary }, animatedStyle3]} />
                    <Animated.View style={[styles.wave, { backgroundColor: theme.primary }, animatedStyle2]} />
                    <Animated.View style={[styles.wave, { backgroundColor: theme.primary }, animatedStyle1]} />
                    <View style={[styles.micCircle, { backgroundColor: theme.primary }]}>
                        <Ionicons name={isListening ? "mic" : "mic-outline"} size={48} color="#FFF" />
                    </View>
                </View>

                {!isListening && (
                    <Animated.View entering={FadeInDown.delay(400).duration(800)} style={styles.actionsGrid}>
                        <TouchableOpacity 
                            style={[styles.actionCard, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                            onPress={() => handleAction('read_reminders')}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: theme.primary }]}>
                                <Ionicons name="notifications" size={24} color="#FFF" />
                            </View>
                            <Text style={styles.actionText}>{t('voice.action.read')}</Text>
                        </TouchableOpacity>
 
                        <TouchableOpacity 
                            style={[styles.actionCard, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                            onPress={() => handleAction('confirm_appt')}
                        >
                            <View style={[styles.actionIcon, { backgroundColor: theme.secondary }]}>
                                <Ionicons name="checkmark-done" size={24} color="#FFF" />
                            </View>
                            <Text style={styles.actionText}>{t('voice.action.confirm')}</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>{t('voice.footer')}</Text>
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
    closeBtn: {
        position: 'absolute',
        top: 60,
        right: 30,
        zIndex: 10,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 40,
    },
    assistantHeader: {
        alignItems: 'center',
        marginBottom: 80,
    },
    assistantTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 3,
        textTransform: 'uppercase',
        marginBottom: 12,
    },
    statusText: {
        fontSize: 26,
        fontWeight: '700',
        color: '#FFF',
        textAlign: 'center',
        lineHeight: 34,
    },
    waveContainer: {
        height: 200,
        width: 200,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 60,
    },
    wave: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    micCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 20,
        shadowColor: '#3B6CF6',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    actionsGrid: {
        flexDirection: 'row',
        gap: 16,
        width: '100%',
    },
    actionCard: {
        flex: 1,
        padding: 24,
        borderRadius: 24,
        alignItems: 'center',
        gap: 12,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '800',
        textAlign: 'center',
    },
    footer: {
        position: 'absolute',
        bottom: 60,
    },
    footerText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 2,
    }
});
