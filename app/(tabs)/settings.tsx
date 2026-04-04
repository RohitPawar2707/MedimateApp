import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import { signOut } from 'firebase/auth';
import { router } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View, StatusBar, Platform } from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';

export default function Settings() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const { t, setLanguage, language: ttsLanguage } = useLanguage();
    const { theme: themeMode, setTheme } = useTheme();
    
    const [userName, setUserName] = useState('User');
    const [userEmail, setUserEmail] = useState('');
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            const user = auth.currentUser;
            if (user) {
                setUserEmail(user.email || '');
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        setUserName(userDoc.data().name);
                    }
                } catch (error: any) {
                    console.log("User Fetch Error:", error);
                }
            }
        };
        fetchUser();
    }, []);

    const handleLanguageSelect = async (langCode: string) => {
        await setLanguage(langCode as any);
        
        try {
            const voices = await Speech.getAvailableVoicesAsync();
            const selectedVoice = voices.find(v => v.language.toLowerCase().includes(langCode.toLowerCase())) || 
                                 voices.find(v => v.language.startsWith(langCode.split('-')[0]));
            
            const feedback = t('settings.lang_updated');
            Speech.speak(feedback, { 
                language: langCode,
                voice: selectedVoice?.identifier 
            });
        } catch (e) {
            // Fallback if voice selection fails
            Speech.speak(t('settings.lang_updated'), { language: langCode });
        }
    };

    const handleThemeChange = async (mode: 'light' | 'dark' | 'system') => {
        await setTheme(mode);
    };

    const handleLogout = async () => {
        Alert.alert(t('settings.logout'), t('settings.logout_confirm'), [
            { text: t('settings.cancel'), style: 'cancel' },
            { 
                text: t('settings.logout'), 
                style: 'destructive',
                onPress: async () => {
                    await signOut(auth);
                    router.replace('/login');
                }
            }
        ]);
    };

    const SettingRow = ({ icon, label, children, last }: any) => (
        <View>
            <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                    <View style={[styles.iconBox, { backgroundColor: theme.input }]}>
                        <Ionicons name={icon} size={22} color={theme.primary} />
                    </View>
                    <Text style={[styles.settingLabel, { color: theme.text }]}>{label}</Text>
                </View>
                {children}
            </View>
            {!last && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                <LinearGradient 
                    colors={[theme.primary, colorScheme === 'dark' ? '#1E1B4B' : '#4338CA']} 
                    style={styles.header}
                >
                    <Animated.View entering={FadeInUp.duration(600)} style={styles.headerContent}>
                        <View style={[styles.avatar, { ...theme.cardShadow }]}>
                            <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
                        </View>
                        <Text style={styles.headerTitle}>{userName}</Text>
                        <Text style={styles.headerSubtitle}>{userEmail}</Text>
                    </Animated.View>
                </LinearGradient>

                <Animated.View entering={FadeInDown.delay(200).duration(800)} style={styles.content}>
                    
                    {/* Theme Preference */}
                    <Text style={[styles.sectionTitle, { color: theme.textDim }]}>{t('settings.appearance')}</Text>
                    <View style={[styles.card, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                        <View style={styles.themeToggleContainer}>
                            {[
                                { id: 'light', icon: 'sunny-outline', label: t('settings.theme.light') },
                                { id: 'dark', icon: 'moon-outline', label: t('settings.theme.dark') },
                                { id: 'system', icon: 'desktop-outline', label: t('settings.theme.system') }
                            ].map((mode) => (
                                <TouchableOpacity 
                                    key={mode.id}
                                    style={[
                                        styles.themeOption, 
                                        themeMode === mode.id && { backgroundColor: theme.primary }
                                    ]}
                                    onPress={() => handleThemeChange(mode.id as any)}
                                >
                                    <Ionicons 
                                        name={mode.icon as any} 
                                        size={20} 
                                        color={themeMode === mode.id ? '#FFF' : theme.textDim} 
                                    />
                                    <Text style={[
                                        styles.themeOptionLabel, 
                                        { color: themeMode === mode.id ? '#FFF' : theme.textDim }
                                    ]}>{mode.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Notification Settings */}
                    <Text style={[styles.sectionTitle, { color: theme.textDim }]}>{t('settings.notifications')}</Text>
                    <View style={[styles.card, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                        <SettingRow icon="notifications-outline" label={t('settings.notif_label')} last>
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={setNotificationsEnabled}
                                trackColor={{ false: theme.border, true: theme.success }}
                                thumbColor="#FFF"
                            />
                        </SettingRow>
                    </View>

                    {/* Language Settings */}
                    <Text style={[styles.sectionTitle, { color: theme.textDim }]}>{t('settings.language')}</Text>
                    <View style={[styles.card, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                        {[
                            { code: 'en-IN', label: 'English (India)', flag: '🇮🇳' },
                            { code: 'hi-IN', label: 'Hindi (हिंदी)', flag: '🇮🇳' },
                            { code: 'mr-IN', label: 'Marathi (मराठी)', flag: '🇮🇳' }
                        ].map((lang, idx) => (
                            <TouchableOpacity 
                                key={lang.code} 
                                style={styles.settingRow} 
                                onPress={() => handleLanguageSelect(lang.code)}
                            >
                                <View style={styles.settingLeft}>
                                    <Text style={styles.flagIcon}>{lang.flag}</Text>
                                    <Text style={[styles.settingLabel, { color: theme.text }]}>{lang.label}</Text>
                                </View>
                                {ttsLanguage === lang.code && (
                                    <Ionicons name="checkmark-circle" size={24} color={theme.success} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Account Actions */}
                    <Text style={[styles.sectionTitle, { color: theme.textDim }]}>{t('settings.account')}</Text>
                    <View style={[styles.card, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                        <TouchableOpacity style={styles.settingRow} onPress={handleLogout}>
                            <View style={styles.settingLeft}>
                                <View style={[styles.iconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                    <Ionicons name="log-out-outline" size={22} color={theme.error} />
                                </View>
                                <Text style={[styles.settingLabel, { color: theme.error }]}>{t('settings.logout')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={theme.textDim} />
                        </TouchableOpacity>
                    </View>
 
                    <Text style={[styles.versionText, { color: theme.textDim }]}>{t('settings.version')}</Text>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 100,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 70 : 50,
        paddingBottom: 60,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        alignItems: 'center',
    },
    headerContent: {
        alignItems: 'center',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatarText: {
        fontSize: 40,
        fontWeight: '900',
        color: Colors.light.primary,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: '#FFF',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '600',
    },
    content: {
        paddingHorizontal: 24,
        marginTop: 30,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1.5,
        marginBottom: 12,
        marginLeft: 8,
        textTransform: 'uppercase',
    },
    card: {
        borderRadius: 24,
        padding: 8,
        marginBottom: 24,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    flagIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        marginHorizontal: 16,
    },
    themeToggleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 4,
    },
    themeOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 16,
        gap: 8,
    },
    themeOptionLabel: {
        fontSize: 14,
        fontWeight: '800',
    },
    versionText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 1,
    },
});

