import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, StatusBar, FlatList, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { router } from 'expo-router';
import { Colors, Radius, Gaps } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    useAnimatedScrollHandler,
    interpolate,
    Extrapolate,
    FadeInDown,
    FadeInUp,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width, height } = Dimensions.get('window');

const slides = [
    {
        id: '1',
        title: 'Medimate',
        subtitle: 'Your Intelligent Health Companion',
        description: 'Advanced medication tracking and appointment management designed for simplicity.',
        icon: 'medkit',
        iconColor: '#3B6CF6',
        bgColors: ['#3B6CF6', '#1E40AF'] as const
    },
    {
        id: '2',
        title: 'Smart Alerts',
        subtitle: 'Never Miss a Dose',
        description: 'Our zero-delay "Nagging" system ensures you stay on track with persistent reminders.',
        icon: 'notifications',
        iconColor: '#0EA5A0',
        bgColors: ['#0EA5A0', '#0D9488'] as const
    },
    {
        id: '3',
        title: 'Health Reports',
        subtitle: 'Data Driven Wellness',
        description: 'Comprehensive history and exportable reports for your healthcare providers.',
        icon: 'analytics',
        iconColor: '#8B5CF6',
        bgColors: ['#8B5CF6', '#7C3AED'] as const
    },
    {
        id: '4',
        title: 'Voice Control',
        subtitle: 'Hands-Free Management',
        description: 'Talk to Medimate to log doses or check your next appointment effortlessly.',
        icon: 'mic',
        iconColor: '#EC4899',
        bgColors: ['#EC4899', '#DB2777'] as const
    }
];

export default function Welcome() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const scrollX = useSharedValue(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const onScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
        },
    });

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const renderItem = ({ item, index }: { item: typeof slides[0], index: number }) => {
        return (
            <View style={styles.slide}>
                <View style={styles.upperContent}>
                    <Animated.View 
                        entering={FadeInUp.delay(200).duration(800)}
                        style={[styles.iconContainer, { backgroundColor: theme.surface }]}
                    >
                        <LinearGradient
                            colors={['#FFFFFF', '#F8FAFC']}
                            style={styles.iconCircle}
                        >
                            <Ionicons name={item.icon as any} size={80} color={item.iconColor} />
                        </LinearGradient>
                        <View style={[styles.iconRing, { borderColor: item.iconColor }]} />
                    </Animated.View>
                </View>

                <View style={styles.lowerContent}>
                    <Animated.View entering={FadeInDown.delay(400).duration(800)} style={styles.textWrapper}>
                        <Text style={[styles.slideTitle, { color: theme.text }]}>{item.title}</Text>
                        <Text style={[styles.slideSubtitle, { color: item.iconColor }]}>{item.subtitle}</Text>
                        <Text style={[styles.slideDescription, { color: theme.textDim }]}>
                            {item.description}
                        </Text>
                    </Animated.View>
                </View>
            </View>
        );
    };

    const nextSlide = () => {
        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            router.push('/Signup');
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
            
            <Animated.FlatList
                ref={flatListRef}
                data={slides}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                renderItem={renderItem}
                scrollEventThrottle={16}
            />

            <View style={styles.footer}>
                <View style={styles.paginationContainer}>
                    {slides.map((_, index) => {
                        const dotStyle = useAnimatedStyle(() => {
                            const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
                            const dotWidth = interpolate(
                                scrollX.value,
                                inputRange,
                                [10, 24, 10],
                                Extrapolate.CLAMP
                            );
                            const opacity = interpolate(
                                scrollX.value,
                                inputRange,
                                [0.3, 1, 0.3],
                                Extrapolate.CLAMP
                            );
                            return {
                                width: dotWidth,
                                opacity,
                                backgroundColor: currentIndex === index ? slides[index].iconColor : theme.border
                            };
                        });
                        return <Animated.View key={index} style={[styles.dot, dotStyle]} />;
                    })}
                </View>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity 
                        style={styles.mainButton} 
                        onPress={nextSlide}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={currentIndex === slides.length - 1 ? [theme.primary, theme.secondary] : [slides[currentIndex].iconColor, slides[currentIndex].iconColor]}
                            style={styles.btnGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.buttonText}>
                                {currentIndex === slides.length - 1 ? 'GET STARTED' : 'CONTINUE'}
                            </Text>
                            <Ionicons 
                                name={currentIndex === slides.length - 1 ? 'rocket' : 'arrow-forward'} 
                                size={20} 
                                color="#FFF" 
                                style={{ marginLeft: 10 }} 
                            />
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.secondaryButton} 
                        onPress={() => router.push('/login')}
                    >
                        <Text style={[styles.secondaryButtonText, { color: theme.textDim }]}>
                            Already have an account? <Text style={{ color: theme.primary, fontWeight: '900' }}>Log In</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    slide: {
        width,
        flex: 1,
    },
    upperContent: {
        flex: 0.55,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        width: 200,
        height: 200,
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
    },
    iconCircle: {
        width: 170,
        height: 170,
        borderRadius: 85,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconRing: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        borderWidth: 2,
        borderStyle: 'dashed',
        opacity: 0.3,
    },
    lowerContent: {
        flex: 0.45,
        paddingHorizontal: 40,
    },
    textWrapper: {
        alignItems: 'center',
    },
    slideTitle: {
        fontSize: 44,
        fontWeight: '900',
        letterSpacing: -1,
        marginBottom: 8,
    },
    slideSubtitle: {
        fontSize: 18,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 20,
    },
    slideDescription: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 26,
        fontWeight: '600',
    },
    footer: {
        position: 'absolute',
        bottom: 50,
        width: '100%',
        paddingHorizontal: 40,
        alignItems: 'center',
    },
    paginationContainer: {
        flexDirection: 'row',
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    dot: {
        height: 10,
        borderRadius: 5,
        marginHorizontal: 5,
    },
    buttonContainer: {
        width: '100%',
        gap: 15,
    },
    mainButton: {
        width: '100%',
        borderRadius: 25,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    btnGradient: {
        height: 65,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 1,
    },
    secondaryButton: {
        paddingVertical: 10,
    },
    secondaryButtonText: {
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'center',
    },
});
