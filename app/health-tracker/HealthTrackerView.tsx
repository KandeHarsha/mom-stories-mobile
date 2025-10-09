import themes from '@/constants/colors';
import { Baby } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BabyGrowthTab from './BabyGrowthTab';
import MomWellnessTab from './MomWellnessTab';
import VaccinationTabNew from './VaccinationTabNew';

type TabType = 'growth' | 'vaccinations' | 'wellness';

const tabs = [
  { id: 'growth' as TabType, label: 'Baby Growth', icon: Baby },
  { id: 'vaccinations' as TabType, label: 'Vaccinations', icon: Baby },
  { id: 'wellness' as TabType, label: 'Mom Wellness', icon: Baby },
];

export default function HealthTrackerView() {
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme || 'light'] ?? themes.light;
  const [activeTab, setActiveTab] = useState<TabType>('growth');
  const screenWidth = Dimensions.get('window').width;
  const isTablet = screenWidth > 768;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'growth':
        return <BabyGrowthTab />;
      case 'vaccinations':
        return <VaccinationTabNew />;
      case 'wellness':
        return <MomWellnessTab />;
      default:
        return <BabyGrowthTab />;
    }
  };

  const styles = createStyles(currentTheme);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Baby size={32} color={currentTheme.primary} />
          <View style={styles.headerText}>
            <Text style={styles.title}>Growth & Health Tools</Text>
            <Text style={styles.subtitle}>
              Keep track of important milestones and health data for you and your baby.
            </Text>
          </View>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tabScrollView}
          contentContainerStyle={styles.tabScrollContent}
        >
          <View style={styles.tabRow}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tab,
                  activeTab === tab.id ? styles.activeTab : styles.inactiveTab,
                  { minWidth: isTablet ? 120 : 100 }
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab.id ? styles.activeTabText : styles.inactiveTabText
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    backgroundColor: theme.background,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.foreground,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: theme.mutedForeground,
  },
  tabContainer: {
    backgroundColor: theme.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  tabScrollView: {
    paddingHorizontal: 20,
  },
  tabScrollContent: {
    paddingVertical: 12,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  activeTab: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  inactiveTab: {
    backgroundColor: theme.background,
    borderColor: theme.border,
  },
  tabText: {
    textAlign: 'center',
    fontWeight: '500',
  },
  activeTabText: {
    color: theme.primaryForeground,
  },
  inactiveTabText: {
    color: theme.mutedForeground,
  },
  content: {
    flex: 1,
  },
});