import themes from '@/constants/colors';
import { Heart, Moon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const momSleepData = [
  { day: 'Mon', hours: 5 },
  { day: 'Tue', hours: 6 },
  { day: 'Wed', hours: 4.5 },
  { day: 'Thu', hours: 7 },
  { day: 'Fri', hours: 5.5 },
  { day: 'Sat', hours: 8 },
  { day: 'Sun', hours: 6 },
];

const momMoodData = [
  { day: 'Mon', mood: 3 },
  { day: 'Tue', mood: 4 },
  { day: 'Wed', mood: 2 },
  { day: 'Thu', mood: 5 },
  { day: 'Fri', mood: 3 },
  { day: 'Sat', mood: 5 },
  { day: 'Sun', mood: 4 },
];

const getMoodEmoji = (mood: number) => {
  switch (mood) {
    case 1: return '😢';
    case 2: return '😔';
    case 3: return '😐';
    case 4: return '😊';
    case 5: return '😄';
    default: return '😐';
  }
};

const getSleepQuality = (hours: number) => {
  if (hours >= 7) return { quality: 'Good', color: '#10b981' };
  if (hours >= 5) return { quality: 'Fair', color: '#f59e0b' };
  return { quality: 'Poor', color: '#ef4444' };
};

export default function MomWellnessTab() {
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme || 'light'] ?? themes.light;


  const styles = createStyles(currentTheme);

  const averageSleep = (momSleepData.reduce((sum, day) => sum + day.hours, 0) / momSleepData.length).toFixed(1);
  const averageMood = (momMoodData.reduce((sum, day) => sum + day.mood, 0) / momMoodData.length).toFixed(1);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Sleep Pattern Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Moon size={24} color={currentTheme.primary} />
          <View style={styles.headerText}>
            <Text style={styles.cardTitle}>Weekly Sleep Pattern</Text>
            <Text style={styles.cardDescription}>Your hours of sleep over the past week</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.dataContainer}>
            {momSleepData.map((data) => {
              const sleepQuality = getSleepQuality(data.hours);
              return (
                <View key={data.day} style={styles.dataRow}>
                  <View style={styles.dayColumn}>
                    <Text style={styles.dayText}>{data.day}</Text>
                  </View>
                  <View style={styles.hoursColumn}>
                    <Text style={styles.hoursText}>{data.hours}h</Text>
                  </View>
                  <View style={styles.qualityColumn}>
                    <View style={[styles.qualityBadge, { backgroundColor: sleepQuality.color }]}>
                      <Text style={styles.qualityText}>{sleepQuality.quality}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Weekly Average:</Text>
            <Text style={[styles.summaryValue, { color: currentTheme.primary }]}>{averageSleep} hours</Text>
          </View>
        </View>
      </View>

      {/* Mood Tracker Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Heart size={24} color="#10b981" />
          <View style={styles.headerText}>
            <Text style={styles.cardTitle}>Weekly Mood Tracker</Text>
            <Text style={styles.cardDescription}>Your mood on a scale of 1 to 5</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.dataContainer}>
            {momMoodData.map((data) => (
              <View key={data.day} style={styles.dataRow}>
                <View style={styles.dayColumn}>
                  <Text style={styles.dayText}>{data.day}</Text>
                </View>
                <View style={styles.moodColumn}>
                  <Text style={styles.moodEmoji}>{getMoodEmoji(data.mood)}</Text>
                </View>
                <View style={styles.ratingColumn}>
                  <Text style={styles.ratingText}>{data.mood}/5</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Weekly Average:</Text>
            <Text style={[styles.summaryValue, { color: '#10b981' }]}>{averageMood}/5</Text>
          </View>
        </View>
      </View>

      {/* Wellness Insights Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerText}>
            <Text style={styles.cardTitle}>Wellness Insights</Text>
            <Text style={styles.cardDescription}>Quick tips based on your recent patterns</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.insightsContainer}>
            <View style={[styles.insightCard, { backgroundColor: currentTheme.muted }]}>
              <Text style={[styles.insightTitle, { color: currentTheme.primary }]}>💤 Sleep Tip</Text>
              <Text style={[styles.insightText, { color: currentTheme.mutedForeground }]}>
                Try to maintain consistent sleep hours. Your average this week was {averageSleep} hours.
              </Text>
            </View>

            <View style={[styles.insightCard, { backgroundColor: currentTheme.muted }]}>
              <Text style={[styles.insightTitle, { color: '#10b981' }]}>😊 Mood Insight</Text>
              <Text style={[styles.insightText, { color: currentTheme.mutedForeground }]}>
                Your mood tends to be higher on weekends. Consider what activities or rest contribute to this pattern.
              </Text>
            </View>

            <View style={[styles.insightCard, { backgroundColor: currentTheme.muted }]}>
              <Text style={[styles.insightTitle, { color: '#8b5cf6' }]}>🌸 Self-Care Reminder</Text>
              <Text style={[styles.insightText, { color: currentTheme.mutedForeground }]}>
                Remember to take time for yourself. Even 10-15 minutes of self-care daily can make a difference.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: theme.foreground,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.cardForeground,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: theme.mutedForeground,
  },
  cardContent: {
    flex: 1,
  },
  dataContainer: {
    gap: 8,
    marginBottom: 16,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  dayColumn: {
    width: 50,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.cardForeground,
  },
  hoursColumn: {
    flex: 1,
    alignItems: 'center',
  },
  hoursText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.cardForeground,
  },
  qualityColumn: {
    width: 80,
    alignItems: 'flex-end',
  },
  qualityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  qualityText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  moodColumn: {
    flex: 1,
    alignItems: 'center',
  },
  moodEmoji: {
    fontSize: 24,
  },
  ratingColumn: {
    width: 50,
    alignItems: 'flex-end',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.cardForeground,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.mutedForeground,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  insightsContainer: {
    gap: 12,
  },
  insightCard: {
    padding: 12,
    borderRadius: 8,
  },
  insightTitle: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  insightText: {
    fontSize: 12,
    lineHeight: 16,
  },
});