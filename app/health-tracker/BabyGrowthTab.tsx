import themes from '@/constants/colors';
import { Baby } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';

const growthData = [
  { month: 'Birth', weight: 7.5, length: 20 },
  { month: '1m', weight: 9.9, length: 21.5 },
  { month: '2m', weight: 12.4, length: 23 },
  { month: '4m', weight: 15.5, length: 25 },
  { month: '6m', weight: 17.5, length: 26.5 },
  { month: '9m', weight: 20, length: 28 },
  { month: '12m', weight: 22, length: 29.5 },
];

export default function BabyGrowthTab() {
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme || 'light'] ?? themes.light;
  const screenWidth = Dimensions.get('window').width;

  const styles = createStyles(currentTheme);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Growth Chart Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Baby size={24} color={currentTheme.primary} />
          <View style={styles.headerText}>
            <Text style={styles.cardTitle}>Baby's Growth Milestones</Text>
            <Text style={styles.cardDescription}>Weight and length over the first year</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          {/* Simple Data Display */}
          <View style={styles.dataContainer}>
            {growthData.map((data, index) => (
              <View key={data.month} style={styles.dataRow}>
                <View style={styles.monthColumn}>
                  <Text style={styles.monthText}>{data.month}</Text>
                </View>
                <View style={styles.dataColumns}>
                  <View style={styles.dataItem}>
                    <Text style={styles.dataLabel}>Weight</Text>
                    <Text style={styles.dataValue}>{data.weight} lbs</Text>
                  </View>
                  <View style={styles.dataItem}>
                    <Text style={styles.dataLabel}>Length</Text>
                    <Text style={styles.dataValue}>{data.length} in</Text>
                  </View>
                </View>
              </View>
            ))}
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
              <Text style={styles.summaryValue}>7.5 lbs</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Current Weight</Text>
              <Text style={styles.summaryValue}>22 lbs</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Weight Gain</Text>
              <Text style={[styles.summaryValue, { color: currentTheme.primary }]}>+14.5 lbs</Text>
            </View>
          </View>

          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Birth Length</Text>
              <Text style={styles.summaryValue}>20 in</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Current Length</Text>
              <Text style={styles.summaryValue}>29.5 in</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Growth</Text>
              <Text style={[styles.summaryValue, { color: '#10b981' }]}>+9.5 in</Text>
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
    gap: 12,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  monthColumn: {
    width: 60,
  },
  monthText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.cardForeground,
  },
  dataColumns: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dataItem: {
    alignItems: 'center',
  },
  dataLabel: {
    fontSize: 12,
    color: theme.mutedForeground,
    marginBottom: 2,
  },
  dataValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.cardForeground,
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