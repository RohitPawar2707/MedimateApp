import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import Animated, { FadeInDown, FadeInRight, FadeInUp } from 'react-native-reanimated';
import { auth, db } from '../../firebaseConfig';
import { useLanguage } from '@/context/LanguageContext';

type FilterType = 'all' | 'today' | 'yesterday' | 'taken' | 'missed';

function formatDate(dateStr: string, t: any): string {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    if (dateStr === todayStr) return t('history.day.today');
    if (dateStr === yesterdayStr) return t('history.day.yesterday');

    return new Date(dateStr).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export default function History() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const { t } = useLanguage();

    const [allHistory, setAllHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>('all');

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) return;

            const q = query(collection(db, 'users', user.uid, 'medicines'), orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            const meds = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const historyItems: any[] = [];
            meds.forEach((med: any) => {
                if (med.history) {
                    Object.entries(med.history).forEach(([date, details]: [string, any]) => {
                        const status = typeof details === 'object' ? details?.status : details;
                        const timestamp = typeof details === 'object' ? details?.timestamp : date;
                        historyItems.push({
                            id: `${med.id}-${date}`,
                            medId: med.id,
                            name: med.name,
                            date,
                            status: status || 'pending',
                            imageUrl: med.imageUrl,
                            time: med.time,
                            timestamp: timestamp || date,
                        });
                    });
                }
            });

            historyItems.sort((a, b) => b.date.localeCompare(a.date) || b.timestamp.localeCompare(a.timestamp));
            setAllHistory(historyItems);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const filteredHistory = allHistory.filter(item => {
        if (filter === 'today') return item.date === todayStr;
        if (filter === 'yesterday') return item.date === yesterdayStr;
        if (filter === 'taken') return item.status === 'taken';
        if (filter === 'missed') return item.status === 'missed';
        return true;
    });

    // Group by date
    const groupedHistory: { [date: string]: any[] } = {};
    filteredHistory.forEach(item => {
        if (!groupedHistory[item.date]) groupedHistory[item.date] = [];
        groupedHistory[item.date].push(item);
    });
    const groupedDates = Object.keys(groupedHistory).sort((a, b) => b.localeCompare(a));

    const filters: { key: FilterType; label: string; icon: string }[] = [
        { key: 'all', label: t('history.filter.all'), icon: 'list-outline' },
        { key: 'today', label: t('history.filter.today'), icon: 'today-outline' },
        { key: 'yesterday', label: t('history.filter.yesterday'), icon: 'calendar-outline' },
        { key: 'taken', label: t('history.filter.taken'), icon: 'checkmark-circle-outline' },
        { key: 'missed', label: t('history.filter.missed'), icon: 'close-circle-outline' },
    ];

    const takenCount = allHistory.filter(i => i.status === 'taken').length;
    const missedCount = allHistory.filter(i => i.status === 'missed').length;
    const totalCount = allHistory.length;
    const adherence = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Header */}
            <LinearGradient
                colors={[theme.primary, colorScheme === 'dark' ? '#1E1B4B' : '#4338CA']}
                style={styles.header}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
                <Animated.View entering={FadeInUp.duration(600)}>
                    <Text style={styles.headerTitle}>{t('history.title')}</Text>
                    <Text style={styles.headerSubtitle}>{t('history.subtitle')}</Text>
                </Animated.View>

                {/* Summary chips */}
                <Animated.View entering={FadeInUp.delay(200)} style={styles.summaryRow}>
                    <View style={styles.summaryChip}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={styles.summaryChipText}>{takenCount} {t('history.taken')}</Text>
                    </View>
                    <View style={styles.summaryChip}>
                        <Ionicons name="close-circle" size={16} color="#EF4444" />
                        <Text style={styles.summaryChipText}>{missedCount} {t('history.missed')}</Text>
                    </View>
                    <View style={[styles.summaryChip, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                        <Ionicons name="stats-chart" size={16} color="#FFF" />
                        <Text style={styles.summaryChipText}>{adherence}% {t('history.adherence')}</Text>
                    </View>
                </Animated.View>
            </LinearGradient>

            {/* Filter Tabs */}
            <Animated.View entering={FadeInDown.delay(300)} style={[styles.filterContainer, { backgroundColor: theme.surface, ...theme.cardShadow }]}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {filters.map(f => (
                        <TouchableOpacity
                            key={f.key}
                            style={[
                                styles.filterChip,
                                { backgroundColor: filter === f.key ? theme.primary : theme.input },
                            ]}
                            onPress={() => setFilter(f.key)}
                        >
                            <Ionicons
                                name={f.icon as any}
                                size={14}
                                color={filter === f.key ? '#FFF' : theme.textDim}
                            />
                            <Text style={[styles.filterChipText, { color: filter === f.key ? '#FFF' : theme.textDim }]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </Animated.View>

            {/* Content */}
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={[styles.loadingText, { color: theme.textDim }]}>{t('history.loading')}</Text>
                </View>
            ) : groupedDates.length === 0 ? (
                <Animated.View entering={FadeInUp.delay(200)} style={styles.centerContainer}>
                    <View style={[styles.emptyIcon, { backgroundColor: theme.input }]}>
                        <Ionicons name="journal-outline" size={60} color={theme.border} />
                    </View>
                    <Text style={[styles.emptyText, { color: theme.text }]}>{t('history.empty')}</Text>
                    <Text style={[styles.emptySub, { color: theme.textDim }]}>
                        {filter === 'all' ? t('history.empty.all') : t('history.empty.filtered').replace('{filter}', t(`history.filter.${filter}` as any))}
                    </Text>
                </Animated.View>
            ) : (
                <FlatList
                    data={groupedDates}
                    keyExtractor={item => item}
                    showsVerticalScrollIndicator={false}
                    onRefresh={fetchHistory}
                    refreshing={loading}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item: date, index: groupIndex }) => (
                        <Animated.View entering={FadeInDown.delay(groupIndex * 100)}>
                            {/* Date Group Header */}
                            <View style={styles.dateGroup}>
                                <View style={[styles.dateDot, { backgroundColor: theme.primary }]} />
                                <Text style={[styles.dateGroupText, { color: theme.text }]}>{formatDate(date, t)}</Text>
                                <View style={[styles.dateLine, { backgroundColor: theme.border }]} />
                            </View>

                            {/* History Items for this date */}
                            {groupedHistory[date].map((item, itemIndex) => (
                                <Animated.View
                                    key={item.id}
                                    entering={FadeInRight.delay(100 + itemIndex * 80)}
                                    style={[
                                        styles.historyCard,
                                        {
                                            backgroundColor: theme.surface,
                                            ...theme.cardShadow,
                                            borderLeftWidth: 4,
                                            borderLeftColor: item.status === 'taken'
                                                ? '#10B981'
                                                : item.status === 'missed'
                                                    ? '#EF4444'
                                                    : '#F59E0B',
                                        }
                                    ]}
                                >
                                    <View style={styles.cardContent}>
                                        {/* Medicine Image/Icon */}
                                        {item.imageUrl ? (
                                            <Image source={{ uri: item.imageUrl }} style={styles.medImage} />
                                        ) : (
                                            <View style={[styles.medIconPlaceholder, { backgroundColor: theme.input }]}>
                                                <Ionicons name="medkit" size={26} color={theme.primary} />
                                            </View>
                                        )}

                                        {/* Info */}
                                        <View style={styles.cardInfo}>
                                            <Text style={[styles.medName, { color: theme.text }]}>{item.name}</Text>
                                            <View style={styles.timeRow}>
                                                <Ionicons name="alarm-outline" size={13} color={theme.textDim} />
                                                <Text style={[styles.medTime, { color: theme.textDim }]}>{item.time}</Text>
                                            </View>
                                        </View>

                                        {/* Status Badge */}
                                        <View style={[
                                            styles.statusBadge,
                                            {
                                                backgroundColor: item.status === 'taken'
                                                    ? 'rgba(16,185,129,0.12)'
                                                    : item.status === 'missed'
                                                        ? 'rgba(239,68,68,0.12)'
                                                        : 'rgba(245,158,11,0.12)'
                                            }
                                        ]}>
                                            <Ionicons
                                                name={
                                                    item.status === 'taken'
                                                        ? 'checkmark-circle'
                                                        : item.status === 'missed'
                                                            ? 'close-circle'
                                                            : 'time'
                                                }
                                                size={16}
                                                color={
                                                    item.status === 'taken'
                                                        ? '#10B981'
                                                        : item.status === 'missed'
                                                            ? '#EF4444'
                                                            : '#F59E0B'
                                                }
                                            />
                                            <Text style={[
                                                styles.statusText,
                                                {
                                                    color: item.status === 'taken'
                                                        ? '#10B981'
                                                        : item.status === 'missed'
                                                            ? '#EF4444'
                                                            : '#F59E0B'
                                                }
                                            ]}>
                                                {item.status === 'taken' ? t('home.status.taken') : item.status === 'missed' ? t('home.status.missed') : t('home.status.pending')}
                                            </Text>
                                        </View>
                                    </View>
                                </Animated.View>
                            ))}
                        </Animated.View>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingTop: Platform.OS === 'ios' ? 70 : 50,
        paddingBottom: 30,
        paddingHorizontal: 24,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
    },
    headerTitle: { fontSize: 28, fontWeight: '900', color: '#FFF', marginBottom: 4 },
    headerSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginBottom: 20 },
    summaryRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    summaryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 12,
        gap: 6,
    },
    summaryChipText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
    filterContainer: {
        marginHorizontal: 20,
        marginTop: -20,
        borderRadius: 20,
        paddingVertical: 12,
    },
    filterScroll: { paddingHorizontal: 16, gap: 8 },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
    },
    filterChipText: { fontSize: 13, fontWeight: '800' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    loadingText: { marginTop: 12, fontSize: 15, fontWeight: '600' },
    emptyIcon: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyText: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
    emptySub: { fontSize: 15, fontWeight: '600', textAlign: 'center', lineHeight: 22 },
    listContent: { padding: 20, paddingBottom: 140 },
    dateGroup: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 10 },
    dateDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
    dateGroupText: { fontSize: 16, fontWeight: '900', marginRight: 12, letterSpacing: 0.3 },
    dateLine: { flex: 1, height: 1 },
    historyCard: {
        borderRadius: 24,
        marginBottom: 16,
        overflow: 'hidden',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 16,
    },
    medImage: { width: 60, height: 60, borderRadius: 18 },
    medIconPlaceholder: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    cardInfo: { flex: 1 },
    medName: { fontSize: 18, fontWeight: '800', marginBottom: 6, letterSpacing: 0.3 },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    medTime: { fontSize: 14, fontWeight: '700' },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
    },
    statusText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
});
