import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { addDoc, collection, updateDoc } from 'firebase/firestore';
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
import { auth, db } from '../../firebaseConfig';

export default function AddMedicine() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

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
                },
                trigger: { type: 'date', date: trigger, channelId: 'medication-alarm' } as any,
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
            finalEndDate.setHours(23, 59, 59, 999);

            const docRef = await addDoc(collection(db, 'users', user.uid, 'medicines'), {
                name: name.trim(),
                time: formattedTime,
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
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <LinearGradient
                        colors={[theme.primary, colorScheme === 'dark' ? '#1E1B4B' : '#4338CA']}
                        style={styles.header}
                    >
                        <Animated.View entering={FadeInUp.duration(600)} style={styles.headerTop}>
                            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                                <Ionicons name="arrow-back" size={24} color="#FFF" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Add Medicine</Text>
                            <View style={{ width: 44 }} />
                        </Animated.View>
                    </LinearGradient>

                    <Animated.View entering={FadeInDown.delay(200)} style={[styles.formCard, { backgroundColor: theme.surface, ...theme.cardShadow }]}>

                        {/* Medicine Name */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.text }]}>Medicine Name *</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.input, borderColor: theme.border }]}>
                                <Ionicons name="medkit-outline" size={20} color={theme.primary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    placeholder="e.g. Vitamin D3, Paracetamol"
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

                        {/* Schedule Time */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.text }]}>Schedule Time</Text>
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
                                onChange={(event, date) => {
                                    setShowTimePicker(false);
                                    if (date) setTime(date);
                                }}
                            />
                        )}

                        {/* Duration */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.text }]}>Duration</Text>
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
                                            {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {durationOption === 'custom' && (
                            <View style={styles.customDateRow}>
                                <View style={styles.dateCol}>
                                    <Text style={[styles.subLabel, { color: theme.textDim }]}>Start Date</Text>
                                    <TouchableOpacity
                                        style={[styles.smallInput, { backgroundColor: theme.input, borderColor: theme.border }]}
                                        onPress={() => setShowStartDatePicker(true)}
                                    >
                                        <Ionicons name="calendar-outline" size={16} color={theme.primary} />
                                        <Text style={[styles.smallInputText, { color: theme.text }]}>{startDate.toLocaleDateString()}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.dateCol}>
                                    <Text style={[styles.subLabel, { color: theme.textDim }]}>End Date</Text>
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
                            <DateTimePicker value={startDate} mode="date" onChange={(e, d) => { setShowStartDatePicker(false); if (d) setStartDate(d); }} />
                        )}
                        {showEndDatePicker && (
                            <DateTimePicker value={endDate} mode="date" onChange={(e, d) => { setShowEndDatePicker(false); if (d) setEndDate(d); }} />
                        )}

                        {/* Notes */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.text }]}>Notes (Optional)</Text>
                            <View style={[styles.inputWrapper, styles.notesWrapper, { backgroundColor: theme.input, borderColor: theme.border }]}>
                                <TextInput
                                    ref={notesRef}
                                    style={[styles.input, styles.notesInput, { color: theme.text }]}
                                    placeholder="e.g. Take after food, with water..."
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

                        {/* Save Button */}
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
                                        <Text style={styles.saveBtnText}>SAVE MEDICINE</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
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
    formCard: {
        marginHorizontal: 20,
        marginTop: -55,
        borderRadius: 32,
        padding: 24,
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
