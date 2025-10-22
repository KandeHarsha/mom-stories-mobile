import themes from '@/constants/colors';
import { WHO_LENGTH_CM_RANGES, WHO_WEIGHT_KG_RANGES } from '@/constants/growthData';
import { useAuth } from '@/context/AuthContext';
import { Baby, Ruler, Scale } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

interface WeightEntry {
  value: number;
  date: string;
}

interface HeightEntry {
  value: number;
  date: string;
}

interface BabyProfile {
  id: string;
  parentId: string;
  name: string;
  gender: string;
  birthday: string;
  createdAt: string;
  height: HeightEntry[];
  weight: WeightEntry[];
}

export default function BabyGrowthTab() {
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme || 'light'] ?? themes.light;
  const { session, user } = useAuth();
  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const styles = createStyles(currentTheme);

  useEffect(() => {
    const fetchBabyProfile = async () => {
      if (!session?.accessToken) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      try {
        // Get babyId from user profile
        const babyId = user?.babyId;

        if (!babyId) {
          setError('No baby profile selected');
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/babies/${babyId}`, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch baby profile');
        }

        const data = await response.json();
        setBabyProfile(data.profile || data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchBabyProfile();
  }, [session, user]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
        <Text style={styles.loadingText}>Loading growth data...</Text>
      </View>
    );
  }

  if (error || !babyProfile) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error || 'No baby profile found'}</Text>
      </View>
    );
  }

  // Calculate baby's age in weeks/months
  const calculateAge = (birthday: string, measurementDate: string) => {
    const birthDate = new Date(birthday);
    const measDate = new Date(measurementDate);
    const diffMs = measDate.getTime() - birthDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(diffDays / 7);
    const months = Math.floor(diffDays / 30.44); // Average days per month
    
    return { weeks, months, days: diffDays };
  };

  // Get ideal range based on age and gender
  const getIdealWeightRange = (weeks: number, months: number, gender: string) => {
    const genderKey = gender.toLowerCase() === 'male' ? 'boy' : 'girl';
    const ranges = WHO_WEIGHT_KG_RANGES[genderKey as 'boy' | 'girl'];
    
    if (weeks <= 13) {
      const weekData = ranges.week.find((w: any) => w.week === weeks);
      return weekData ? { min: weekData.minKG, max: weekData.maxKG } : null;
    } else {
      const monthData = ranges.month.find((m: any) => m.month === months);
      return monthData ? { min: monthData.minKG, max: monthData.maxKG } : null;
    }
  };

  const getIdealHeightRange = (weeks: number, months: number, gender: string) => {
    const genderKey = gender.toLowerCase() === 'male' ? 'boy' : 'girl';
    const ranges = WHO_LENGTH_CM_RANGES[genderKey as 'boy' | 'girl'];
    
    if (weeks <= 13) {
      const weekData = ranges.week.find((w: any) => w.week === weeks);
      return weekData ? { min: weekData.minCM, max: weekData.maxCM } : null;
    } else {
      const monthData = ranges.month.find((m: any) => m.month === months);
      return monthData ? { min: monthData.minCM, max: monthData.maxCM } : null;
    }
  };

  // Check if value is within range
  const isInRange = (value: number, range: { min: number; max: number } | null) => {
    if (!range) return true;
    return value >= range.min && value <= range.max;
  };

  // Sort weight and height by date
  const sortedWeight = [...babyProfile.weight].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const sortedHeight = [...babyProfile.height].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Get first and last entries for summary
  const firstWeight = sortedWeight[0];
  const lastWeight = sortedWeight[sortedWeight.length - 1];
  const firstHeight = sortedHeight[0];
  const lastHeight = sortedHeight[sortedHeight.length - 1];

  const weightGain = lastWeight && firstWeight ? lastWeight.value - firstWeight.value : 0;
  const heightGrowth = lastHeight && firstHeight ? lastHeight.value - firstHeight.value : 0;

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Format age display
  const formatAge = (weeks: number, months: number) => {
    if (weeks <= 13) {
      return `${weeks}w`;
    } else {
      return `${months}m`;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Baby Info Header */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Baby size={24} color={currentTheme.primary} />
          <View style={styles.headerText}>
            <Text style={styles.cardTitle}>{babyProfile.name}'s Growth</Text>
            <Text style={styles.cardDescription}>
              Born: {formatDate(babyProfile.birthday)}
            </Text>
          </View>
        </View>
      </View>

      {/* Weight Records Table */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Scale size={20} color={currentTheme.primary} />
          <View style={styles.headerText}>
            <Text style={styles.cardTitle}>Weight Records</Text>
            <Text style={styles.cardDescription}>Tracking in kilograms (kg)</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Date</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>Age</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Weight</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Ideal Range</Text>
          </View>

          {/* Table Rows */}
          <View style={styles.dataContainer}>
            {sortedWeight.map((entry, index) => {
              const age = calculateAge(babyProfile.birthday, entry.date);
              const idealRange = getIdealWeightRange(age.weeks, age.months, babyProfile.gender);
              const inRange = isInRange(entry.value, idealRange);

              return (
                <View key={`weight-${entry.date}-${index}`} style={styles.tableRow}>
                  <Text style={[styles.tableCellText, { flex: 1.2 }]}>
                    {formatDate(entry.date)}
                  </Text>
                  <Text style={[styles.tableCellText, { flex: 0.8 }]}>
                    {formatAge(age.weeks, age.months)}
                  </Text>
                  <Text style={[styles.tableCellValue, { flex: 1, color: inRange ? currentTheme.cardForeground : currentTheme.destructive }]}>
                    {entry.value} kg
                  </Text>
                  <Text style={[styles.tableCellRange, { flex: 1.5 }]}>
                    {idealRange ? `${idealRange.min}-${idealRange.max} kg` : 'N/A'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Height Records Table */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ruler size={20} color={currentTheme.primary} />
          <View style={styles.headerText}>
            <Text style={styles.cardTitle}>Height Records</Text>
            <Text style={styles.cardDescription}>Tracking in centimeters (cm)</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Date</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>Age</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Height</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Ideal Range</Text>
          </View>

          {/* Table Rows */}
          <View style={styles.dataContainer}>
            {sortedHeight.map((entry, index) => {
              const age = calculateAge(babyProfile.birthday, entry.date);
              const idealRange = getIdealHeightRange(age.weeks, age.months, babyProfile.gender);
              const inRange = isInRange(entry.value, idealRange);

              return (
                <View key={`height-${entry.date}-${index}`} style={styles.tableRow}>
                  <Text style={[styles.tableCellText, { flex: 1.2 }]}>
                    {formatDate(entry.date)}
                  </Text>
                  <Text style={[styles.tableCellText, { flex: 0.8 }]}>
                    {formatAge(age.weeks, age.months)}
                  </Text>
                  <Text style={[styles.tableCellValue, { flex: 1, color: inRange ? currentTheme.cardForeground : currentTheme.destructive }]}>
                    {entry.value} cm
                  </Text>
                  <Text style={[styles.tableCellRange, { flex: 1.5 }]}>
                    {idealRange ? `${idealRange.min}-${idealRange.max} cm` : 'N/A'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Growth Summary Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Growth Summary</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Birth Weight</Text>
              <Text style={styles.summaryValue}>
                {firstWeight ? `${firstWeight.value} kg` : '-'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Current Weight</Text>
              <Text style={styles.summaryValue}>
                {lastWeight ? `${lastWeight.value} kg` : '-'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Weight Gain</Text>
              <Text style={[styles.summaryValue, { color: currentTheme.primary }]}>
                {weightGain > 0 ? `+${weightGain.toFixed(1)} kg` : '-'}
              </Text>
            </View>
          </View>

          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Birth Height</Text>
              <Text style={styles.summaryValue}>
                {firstHeight ? `${firstHeight.value} cm` : '-'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Current Height</Text>
              <Text style={styles.summaryValue}>
                {lastHeight ? `${lastHeight.value} cm` : '-'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Growth</Text>
              <Text style={[styles.summaryValue, { color: '#10b981' }]}>
                {heightGrowth > 0 ? `+${heightGrowth.toFixed(1)} cm` : '-'}
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.mutedForeground,
  },
  errorText: {
    fontSize: 16,
    color: theme.destructive,
    textAlign: 'center',
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
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: theme.muted,
    borderRadius: 8,
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.mutedForeground,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    alignItems: 'center',
  },
  tableCellText: {
    fontSize: 12,
    color: theme.cardForeground,
    textAlign: 'center',
  },
  tableCellValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  tableCellRange: {
    fontSize: 11,
    color: theme.mutedForeground,
    textAlign: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.mutedForeground,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.cardForeground,
  },
});