import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Gaps } from '@/constants/theme';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Animated, { FadeInUp, FadeInDown, RotateInUpLeft } from 'react-native-reanimated';

export default function HardwareStatus() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" />
            
            <LinearGradient
                colors={[theme.primary, colorScheme === 'dark' ? '#1E1B4B' : '#4338CA']}
                style={styles.header}
            >
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Device Status</Text>
                    <View style={{ width: 44 }} />
                </View>
            </LinearGradient>

            <Animated.View entering={FadeInDown.delay(200).duration(800)} style={[styles.card, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                <Animated.View entering={RotateInUpLeft.delay(400).duration(1000)} style={styles.iconWrapper}>
                    <LinearGradient
                        colors={['rgba(79, 70, 229, 0.1)', 'rgba(79, 70, 229, 0.05)']}
                        style={styles.iconCircle}
                    >
                        <Ionicons name="watch-outline" size={80} color={theme.primary} />
                    </LinearGradient>
                    <View style={[styles.statusBadge, { backgroundColor: theme.success }]}>
                        <Ionicons name="checkmark" size={16} color="#FFF" />
                    </View>
                </Animated.View>

                <Text style={[styles.connectionText, { color: theme.text }]}>Medimate Smart Watch</Text>
                <Text style={[styles.connectionSub, { color: theme.textDim }]}>Device is paired and active</Text>

                <View style={styles.infoGrid}>
                    <View style={[styles.infoItem, { backgroundColor: theme.input, borderColor: theme.border }]}>
                        <Ionicons name="sync" size={22} color={theme.primary} />
                        <Text style={[styles.infoLabel, { color: theme.textDim }]}>Last Sync</Text>
                        <Text style={[styles.infoValue, { color: theme.text }]}>Just Now</Text>
                    </View>
                    
                    <View style={[styles.infoItem, { backgroundColor: theme.input, borderColor: theme.border }]}>
                        <Ionicons name="battery-dead-outline" size={22} color={theme.success} />
                        <Text style={[styles.infoLabel, { color: theme.textDim }]}>Battery</Text>
                        <Text style={[styles.infoValue, { color: theme.text }]}>85%</Text>
                    </View>

                    <View style={[styles.infoItem, { backgroundColor: theme.input, borderColor: theme.border }]}>
                        <Ionicons name="bluetooth" size={22} color="#3B82F6" />
                        <Text style={[styles.infoLabel, { color: theme.textDim }]}>Signal</Text>
                        <Text style={[styles.infoValue, { color: theme.text }]}>Strong</Text>
                    </View>

                    <View style={[styles.infoItem, { backgroundColor: theme.input, borderColor: theme.border }]}>
                        <Ionicons name="volume-high-outline" size={22} color={theme.warning} />
                        <Text style={[styles.infoLabel, { color: theme.textDim }]}>Alerts</Text>
                        <Text style={[styles.infoValue, { color: theme.text }]}>Active</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.syncContainer} onPress={() => {}}>
                    <LinearGradient
                        colors={[theme.primary, theme.secondary]}
                        style={styles.syncBtn}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Ionicons name="refresh" size={20} color="#FFF" />
                        <Text style={styles.syncBtnText}>MANUAL SYNC</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 70 : 50,
        paddingBottom: 100,
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
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    card: {
        marginHorizontal: 24,
        marginTop: -60,
        borderRadius: 32,
        padding: 30,
        alignItems: 'center',
    },
    iconWrapper: {
        marginBottom: 24,
    },
    iconCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusBadge: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 4,
        borderColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    connectionText: {
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 4,
    },
    connectionSub: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 30,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        width: '100%',
        gap: 12,
    },
    infoItem: {
        width: '48%',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1.5,
        alignItems: 'center',
    },
    infoLabel: {
        fontSize: 12,
        fontWeight: '800',
        marginTop: 8,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '900',
    },
    syncContainer: {
        marginTop: 30,
        width: '100%',
        borderRadius: 18,
        overflow: 'hidden',
    },
    syncBtn: {
        height: 65,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    syncBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
});
