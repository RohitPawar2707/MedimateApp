import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Alert, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Radius, Gaps } from '@/constants/theme';
import { auth, db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLanguage } from '@/context/LanguageContext';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function AddAppointment() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const { t } = useLanguage();

    const [loading, setLoading] = useState(false);
    const [patientName, setPatientName] = useState('');
    const [patientAge, setPatientAge] = useState('');
    const [doctorName, setDoctorName] = useState('');
    const [speciality, setSpeciality] = useState('');
    const [hospitalName, setHospitalName] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    
    const [remindersEnabled, setRemindersEnabled] = useState(true);
    const [remind24h, setRemind24h] = useState(true);
    const [remind2h, setRemind2h] = useState(true);

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) setDate(selectedDate);
    };

    const onTimeChange = (event: any, selectedTime?: Date) => {
        setShowTimePicker(false);
        if (selectedTime) {
            const newDate = new Date(date);
            newDate.setHours(selectedTime.getHours());
            newDate.setMinutes(selectedTime.getMinutes());
            setDate(newDate);
        }
    };

    const scheduleNotifications = async (appointmentId: string, apptDate: Date, drName: string) => {
        try {
            if (!remindersEnabled) return [];

            const notificationIds = [];
            const now = new Date();

            // 24 Hour Reminder
            if (remind24h) {
                const trigger24h = new Date(apptDate);
                trigger24h.setHours(trigger24h.getHours() - 24);
                
                if (trigger24h > now) {
                    const id = await Notifications.scheduleNotificationAsync({
                        content: {
                            title: 'Upcoming Appointment Tomorrow! 🏥',
                            body: `Reminder: Appointment with Dr. ${drName} in 24 hours.`,
                            data: { type: 'appointment', apptId: appointmentId },
                        },
                        trigger: { type: 'date', date: trigger24h } as any,
                    });
                    notificationIds.push(id);
                }
            }

            // 2 Hour Reminder
            if (remind2h) {
                const trigger2h = new Date(apptDate);
                trigger2h.setHours(trigger2h.getHours() - 2);
                
                if (trigger2h > now) {
                    const id = await Notifications.scheduleNotificationAsync({
                        content: {
                            title: 'Appointment in 2 Hours! ⏰',
                            body: `Reminder: Appointment with Dr. ${drName} at ${apptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
                            data: { type: 'appointment', apptId: appointmentId },
                        },
                        trigger: { type: 'date', date: trigger2h } as any,
                    });
                    notificationIds.push(id);
                }
            }

            return notificationIds;
        } catch (error) {
            console.error("Error scheduling notifications:", error);
            return [];
        }
    };

    const handleSave = async () => {
        if (!patientName || !doctorName || !hospitalName) {
            Alert.alert('Missing Info', 'Please fill in patient name, doctor name, and hospital name.');
            return;
        }

        const user = auth.currentUser;
        if (!user) return;

        setLoading(true);
        try {
            const apptData = {
                patientName,
                patientAge,
                doctorName,
                speciality,
                hospitalName,
                address,
                notes,
                date: date.toISOString().split('T')[0],
                time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
                fullTimestamp: date.toISOString(),
                remindersEnabled,
                remind24h,
                remind2h,
                status: 'scheduled',
                createdAt: serverTimestamp(),
            };

            const docRef = await addDoc(collection(db, 'users', user.uid, 'appointments'), apptData);
            
            // Schedule notifications
            const ids = await scheduleNotifications(docRef.id, date, doctorName);
            // In a real app, you'd store these IDs to cancel them later if needed
            
            router.back();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const InputField = ({ label, value, onChangeText, placeholder, icon, keyboardType = 'default' }: any) => (
        <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textDim }]}>{label}</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.input }]}>
                <Ionicons name={icon} size={20} color={theme.primary} style={styles.inputIcon} />
                <TextInput
                    style={[styles.input, { color: theme.text }]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={theme.textDim}
                    keyboardType={keyboardType}
                />
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View entering={FadeInDown.duration(800)}>
                    {/* Patient Info */}
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('appt.form.patient_info')}</Text>
                    <InputField label={t('appt.form.patient_name')} value={patientName} onChangeText={setPatientName} placeholder="Full Name" icon="person-outline" />
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <InputField label={t('appt.form.age')} value={patientAge} onChangeText={setPatientAge} placeholder="Years" icon="calendar-outline" keyboardType="numeric" />
                        </View>
                        <View style={{ width: 16 }} />
                        <View style={{ flex: 1 }}>
                            <InputField label={t('appt.form.contact')} value="" onChangeText={() => {}} placeholder="Mobile No." icon="call-outline" keyboardType="phone-pad" />
                        </View>
                    </View>

                    {/* Doctor Info */}
                    <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>{t('appt.form.doctor_hospital')}</Text>
                    <InputField label={t('appt.form.doctor_name')} value={doctorName} onChangeText={setDoctorName} placeholder="Dr. Name" icon="medkit-outline" />
                    <InputField label={t('appt.form.speciality')} value={speciality} onChangeText={setSpeciality} placeholder="e.g. Cardiologist" icon="ribbon-outline" />
                    <InputField label={t('appt.form.hospital_name')} value={hospitalName} onChangeText={setHospitalName} placeholder="Hospital/Clinic" icon="business-outline" />
                    <InputField label={t('appt.form.address')} value={address} onChangeText={setAddress} placeholder="Hospital Address" icon="location-outline" />

                    {/* Date & Time */}
                    <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>{t('appt.form.schedule')}</Text>
                    <View style={styles.row}>
                        <TouchableOpacity 
                            style={[styles.pickerBtn, { backgroundColor: theme.input, flex: 1 }]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Ionicons name="calendar" size={20} color={theme.primary} />
                            <Text style={[styles.pickerText, { color: theme.text }]}>{date.toLocaleDateString()}</Text>
                        </TouchableOpacity>
                        <View style={{ width: 16 }} />
                        <TouchableOpacity 
                            style={[styles.pickerBtn, { backgroundColor: theme.input, flex: 1 }]}
                            onPress={() => setShowTimePicker(true)}
                        >
                            <Ionicons name="time" size={20} color={theme.primary} />
                            <Text style={[styles.pickerText, { color: theme.text }]}>
                                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {showDatePicker && (
                        <DateTimePicker value={date} mode="date" display="default" minimumDate={new Date()} onChange={onDateChange} />
                    )}
                    {showTimePicker && (
                        <DateTimePicker value={date} mode="time" display="default" minimumDate={new Date()} onChange={onTimeChange} />
                    )}

                    {/* Reminders */}
                    <View style={[styles.reminderCard, { backgroundColor: theme.card, ...theme.cardShadow }]}>
                        <View style={styles.reminderHeader}>
                            <View style={styles.row}>
                                <Ionicons name="notifications-outline" size={24} color={theme.primary} />
                                <Text style={[styles.reminderTitle, { color: theme.text }]}>{t('appt.form.reminders')}</Text>
                            </View>
                            <Switch
                                value={remindersEnabled}
                                onValueChange={setRemindersEnabled}
                                trackColor={{ false: theme.border, true: theme.success }}
                                thumbColor="#FFF"
                            />
                        </View>
                        
                        {remindersEnabled && (
                            <View style={styles.reminderOptions}>
                                <View style={styles.reminderOption}>
                                    <Text style={[styles.optionLabel, { color: theme.textDim }]}>{t('appt.form.remind_24h')}</Text>
                                    <Switch
                                        value={remind24h}
                                        onValueChange={setRemind24h}
                                        trackColor={{ false: theme.border, true: theme.primary }}
                                        thumbColor="#FFF"
                                        style={{ transform: [{ scale: 0.8 }] }}
                                    />
                                </View>
                                <View style={styles.reminderOption}>
                                    <Text style={[styles.optionLabel, { color: theme.textDim }]}>{t('appt.form.remind_2h')}</Text>
                                    <Switch
                                        value={remind2h}
                                        onValueChange={setRemind2h}
                                        trackColor={{ false: theme.border, true: theme.primary }}
                                        thumbColor="#FFF"
                                        style={{ transform: [{ scale: 0.8 }] }}
                                    />
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Notes */}
                    <Text style={[styles.label, { color: theme.textDim, marginTop: 24 }]}>{t('appt.form.notes')}</Text>
                    <View style={[styles.notesWrapper, { backgroundColor: theme.input }]}>
                        <TextInput
                            style={[styles.notesInput, { color: theme.text }]}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder={t('appt.form.notes_placeholder')}
                            placeholderTextColor={theme.textDim}
                            multiline
                            numberOfLines={4}
                        />
                    </View>
                </Animated.View>
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: theme.background }]}>
                <TouchableOpacity 
                    style={[styles.saveBtn, { ...theme.cardShadow }]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    <LinearGradient
                        colors={[theme.primary, theme.secondary]}
                        style={styles.saveBtnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        {loading ? <ActivityIndicator color="#FFF" /> : (
                            <>
                                <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                                <Text style={styles.saveBtnText}>{t('appt.form.btn_save')}</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 100,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 16,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '800',
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderRadius: 16,
        height: 56,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        borderRadius: 16,
        paddingHorizontal: 16,
        gap: 12,
    },
    pickerText: {
        fontSize: 16,
        fontWeight: '700',
    },
    reminderCard: {
        marginTop: 24,
        borderRadius: Radius.md,
        padding: 20,
    },
    reminderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    reminderTitle: {
        fontSize: 17,
        fontWeight: '800',
        marginLeft: 12,
    },
    reminderOptions: {
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        gap: 12,
    },
    reminderOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    optionLabel: {
        fontSize: 14,
        fontWeight: '700',
    },
    notesWrapper: {
        borderRadius: 16,
        padding: 16,
        height: 120,
        marginBottom: 20,
    },
    notesInput: {
        fontSize: 16,
        fontWeight: '600',
        textAlignVertical: 'top',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
    },
    saveBtn: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    saveBtnGradient: {
        height: 70,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    saveBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
});
