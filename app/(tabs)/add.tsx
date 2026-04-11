import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguage } from '@/context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { addDoc, collection, updateDoc } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { auth, db, db_realtime } from '../../firebaseConfig';

export default function AddMedicine() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const { t } = useLanguage();

    const [name, setName] = useState('');
    const [notes, setNotes] = useState('');
    const [time, setTime] = useState(new Date());
    const [showTimePicker, setShowTimePicker] = useState(false);

    const [durationOption, setDurationOption] = useState<'today' | 'tomorrow' | 'custom'>('today');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);

    const [loading, setLoading] = useState(false);

    const notesRef = useRef<TextInput>(null);

    const scheduleNotification = async (medId: string, medNames: string, selectedTime: Date) => {
        const trigger = new Date(selectedTime);
        trigger.setSeconds(0);
        trigger.setMilliseconds(0);

        if (trigger < new Date()) {
            trigger.setDate(trigger.getDate() + 1);
        }

        const preTrigger = new Date(trigger);
        preTrigger.setMinutes(preTrigger.getMinutes() - 5);
        preTrigger.setSeconds(0);
        preTrigger.setMilliseconds(0);

        let notificationId = null;
        let preNotificationId = null;

        try {
            if (preTrigger > new Date()) {
                preNotificationId = await Notifications.scheduleNotificationAsync({
                    content: {
                        title: 'Upcoming Medicine ⏳',
                        body: `Reminder: You have ${medNames} in 5 minutes.`,
                        data: { medId, medName: medNames, isPre: 'true' },
                        categoryIdentifier: 'med_reminder',
                        priority: Notifications.AndroidNotificationPriority.HIGH,
                    },
                    trigger: { type: 'date', date: preTrigger, channelId: 'medication-alarm' } as any,
                });
            }

            notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Time for Medicine! 💊',
                    body: `It's time to take ${medNames}`,
                    data: {
                        medId,
                        medName: medNames,
                        time: trigger.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        isNag: 'false',
                    },
                    categoryIdentifier: 'med_reminder',
                    priority: Notifications.AndroidNotificationPriority.MAX,
                    sticky: true,
                    sound: true,
                },
                trigger: { 
                    type: 'date', 
                    date: trigger, 
                    channelId: 'medication-alarm',
                    precise: true // Ensures exact timing on Android
                } as any,
            });
        } catch (e) {
            console.log('Error scheduling notifications:', e);
        }

        return { trigger, notificationId, preNotificationId };
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Missing Name', 'Please enter the medicine name.');
            return;
        }

        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('Not logged in');

            const formattedTime = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            let finalStartDate = new Date(startDate);
            let finalEndDate = new Date(endDate);

            if (durationOption === 'today') {
                finalStartDate = new Date();
                finalEndDate = new Date();
            } else if (durationOption === 'tomorrow') {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                finalStartDate = tomorrow;
                finalEndDate = tomorrow;
            }

            finalStartDate.setHours(0, 0, 0, 0);
            const hours = time.getHours();
            const minutes = time.getMinutes();
            const time24 = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

            const docRef = await addDoc(collection(db, 'users', user.uid, 'medicines'), {
                name: name.trim(),
                time: formattedTime,
                time24: time24, // Added for hardware sync
                fullTime: time.toISOString(),
                notes: notes.trim(),
                imageUrl: null,
                startDate: finalStartDate.toISOString(),
                endDate: finalEndDate.toISOString(),
                history: {},
                createdAt: new Date().toISOString(),
            });

            const { trigger, notificationId, preNotificationId } = await scheduleNotification(docRef.id, name.trim(), time);
            await updateDoc(docRef, {
                nextAlarmTime: (trigger as Date).toISOString(),
                notificationId: notificationId || '',
                preNotificationId: preNotificationId || '',
            });

            // Dual-write to Realtime Database for ESP8266
            await set(ref(db_realtime, `medicines_hw/${user.uid}/${docRef.id}`), {
                name: name.trim(),
                time24: time24,
                status: 'pending',
                notes: notes.trim(),
                updatedAt: new Date().toISOString(),
            });

            router.replace('/(tabs)');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior="padding"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[styles.scrollContent, { flexGrow: 1, justifyContent: 'center' }]}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.formContainer}>
                        <Animated.View entering={FadeInDown.delay(200)} style={[styles.formCard, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                            <TouchableOpacity 
                                style={styles.cardCloseBtn} 
                                onPress={() => router.back()}
                            >
                                <Ionicons name="close" size={24} color={theme.textDim} />
                            </TouchableOpacity>

                            <Text style={[styles.cardTitle, { color: theme.text }]}>{t('add.title')}</Text>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.text }]}>{t('add.label.name')}</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.input, borderColor: theme.border }]}>
                                <Ionicons name="medkit-outline" size={20} color={theme.primary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    placeholder={t('add.placeholder.name')}
                                    placeholderTextColor={theme.textDim}
                                    value={name}
                                    onChangeText={setName}
                                    returnKeyType="next"
                                    onSubmitEditing={() => notesRef.current?.focus()}
                                    blurOnSubmit={false}
                                    autoCorrect={false}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.text }]}>{t('add.label.time')}</Text>
                            <TouchableOpacity
                                style={[styles.inputWrapper, styles.timeRow, { backgroundColor: theme.input, borderColor: theme.border }]}
                                onPress={() => setShowTimePicker(true)}
                            >
                                <Ionicons name="time-outline" size={20} color={theme.primary} style={styles.inputIcon} />
                                <Text style={[styles.input, { color: theme.text, lineHeight: 22 }]}>
                                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </Text>
                                <Ionicons name="chevron-down" size={18} color={theme.textDim} />
                            </TouchableOpacity>
                        </View>

                        {showTimePicker && (
                            <DateTimePicker
                                value={time}
                                mode="time"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                is24Hour={false}
                                minimumDate={new Date()}
                                onChange={(event, date) => {
                                    setShowTimePicker(false);
                                    if (date) setTime(date);
                                }}
                            />
                        )}

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.text }]}>{t('add.label.duration')}</Text>
                            <View style={styles.durationTabs}>
                                {(['today', 'tomorrow', 'custom'] as const).map((opt) => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[
                                            styles.tabBtn,
                                            { backgroundColor: durationOption === opt ? theme.primary : theme.input },
                                        ]}
                                        onPress={() => setDurationOption(opt)}
                                    >
                                        <Text style={[
                                            styles.tabText,
                                            { color: durationOption === opt ? '#FFF' : theme.textDim },
                                        ]}>
                                            {opt === 'today' ? t('add.duration.today') : opt === 'tomorrow' ? t('add.duration.tomorrow') : t('add.duration.custom')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {durationOption === 'custom' && (
                            <View style={styles.customDateRow}>
                                <View style={styles.dateCol}>
                                    <Text style={[styles.subLabel, { color: theme.textDim }]}>{t('add.label.start')}</Text>
                                    <TouchableOpacity
                                        style={[styles.smallInput, { backgroundColor: theme.input, borderColor: theme.border }]}
                                        onPress={() => setShowStartDatePicker(true)}
                                    >
                                        <Ionicons name="calendar-outline" size={16} color={theme.primary} />
                                        <Text style={[styles.smallInputText, { color: theme.text }]}>{startDate.toLocaleDateString()}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.dateCol}>
                                    <Text style={[styles.subLabel, { color: theme.textDim }]}>{t('add.label.end')}</Text>
                                    <TouchableOpacity
                                        style={[styles.smallInput, { backgroundColor: theme.input, borderColor: theme.border }]}
                                        onPress={() => setShowEndDatePicker(true)}
                                    >
                                        <Ionicons name="calendar-outline" size={16} color={theme.primary} />
                                        <Text style={[styles.smallInputText, { color: theme.text }]}>{endDate.toLocaleDateString()}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {showStartDatePicker && (
                            <DateTimePicker value={startDate} mode="date" minimumDate={new Date()} onChange={(e, d) => { setShowStartDatePicker(false); if (d) setStartDate(d); }} />
                        )}
                        {showEndDatePicker && (
                            <DateTimePicker value={endDate} mode="date" minimumDate={startDate} onChange={(e, d) => { setShowEndDatePicker(false); if (d) setEndDate(d); }} />
                        )}

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.text }]}>{t('add.label.notes')}</Text>
                            <View style={[styles.inputWrapper, styles.notesWrapper, { backgroundColor: theme.input, borderColor: theme.border }]}>
                                <TextInput
                                    ref={notesRef}
                                    style={[styles.input, styles.notesInput, { color: theme.text }]}
                                    placeholder={t('add.placeholder.notes')}
                                    placeholderTextColor={theme.textDim}
                                    multiline
                                    numberOfLines={3}
                                    value={notes}
                                    onChangeText={setNotes}
                                    returnKeyType="done"
                                    blurOnSubmit
                                />
                            </View>
                        </View>

                        <TouchableOpacity style={styles.saveContainer} onPress={handleSave} disabled={loading}>
                            <LinearGradient
                                colors={[theme.primary, theme.secondary]}
                                style={styles.saveBtn}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {loading ? <ActivityIndicator color="#FFF" size="large" /> : (
                                    <>
                                        <Ionicons name="save-outline" size={22} color="#FFF" />
                                        <Text style={styles.saveBtnText}>{t('add.btn.save')}</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingBottom: 60 },
    header: {
        paddingTop: Platform.OS === 'ios' ? 70 : 50,
        paddingBottom: 80,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backBtn: {
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#FFF', letterSpacing: 0.5 },
    formContainer: {
        paddingVertical: 40,
        paddingBottom: 100, // Extra space to clear the tab bar
    },
    formCard: {
        marginHorizontal: 20,
        borderRadius: 32,
        padding: 24,
        paddingTop: 30, // Space for close button
    },
    cardCloseBtn: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 24,
        textAlign: 'center',
    },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '800', marginBottom: 10, marginLeft: 2 },
    subLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6, marginLeft: 2 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1.5,
        paddingHorizontal: 14,
        minHeight: 56,
    },
    inputIcon: { marginRight: 10 },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        paddingVertical: 0,
    },
    timeRow: { justifyContent: 'space-between' },
    notesWrapper: {
        alignItems: 'flex-start',
        paddingVertical: 12,
    },
    notesInput: {
        minHeight: 80,
        textAlignVertical: 'top',
        lineHeight: 22,
    },
    durationTabs: { flexDirection: 'row', gap: 10 },
    tabBtn: {
        flex: 1, height: 50, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
    },
    tabText: { fontSize: 14, fontWeight: '800' },
    customDateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 12,
    },
    dateCol: { flex: 1 },
    smallInput: {
        height: 50, borderRadius: 14, borderWidth: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    smallInputText: { fontSize: 14, fontWeight: '700' },
    saveContainer: { marginTop: 10, borderRadius: 20, overflow: 'hidden' },
    saveBtn: {
        height: 68,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    saveBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
});
