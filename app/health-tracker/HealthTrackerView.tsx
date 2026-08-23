import themes from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { Baby } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BabyGrowthTab from './BabyGrowthTab';
import FitnessTab from './fitness';
import MomWellnessTab from './MomWellnessTab';
import VaccinationTabNew from './VaccinationTabNew';

type Phase = 'preparation' | 'pregnancy' | 'post_delivery';
type TabType = 'growth' | 'vaccinations' | 'wellness' | 'fitness';

interface TabConfig {
  id: TabType;
  label: string;
  icon: typeof Baby;
  /** When provided, only show this tab for the listed phases. Omit to show for all phases. */
  phases?: Phase[];
}

const ALL_TABS: TabConfig[] = [
  { id: 'growth',       label: 'Baby Growth',  icon: Baby, phases: ['post_delivery'] },
  { id: 'vaccinations', label: 'Vaccinations',  icon: Baby, phases: ['post_delivery'] },
  // { id: 'wellness',     label: 'Mom Wellness',  icon: Baby }, // visible to all phases
  { id: 'fitness',      label: 'Fitness',       icon: Baby }, // visible to all phases
];

export default function HealthTrackerView() {
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme || 'light'] ?? themes.light;
  const { user } = useAuth();
  const screenWidth = Dimensions.get('window').width;
  const isTablet = screenWidth > 768;

  // Derive visible tabs based on the user's current phase.
  // A tab without a `phases` array is always shown.
  // A tab with a `phases` array is only shown when user.phase is in that list.
  const tabs = useMemo<TabConfig[]>(
    () => ALL_TABS.filter(tab => !tab.phases || tab.phases.includes(user?.phase as Phase)),
    [user?.phase]
  );

  // Set initial active tab based on available tabs
  const [activeTab, setActiveTab] = useState<TabType>(tabs[0]?.id || 'wellness');

  // Update active tab if current tab becomes unavailable
  useEffect(() => {
    const isActiveTabAvailable = tabs.some(tab => tab.id === activeTab);
    if (!isActiveTabAvailable && tabs.length > 0) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'growth':
        return <BabyGrowthTab />;
      case 'vaccinations':
        return <VaccinationTabNew />;
      case 'wellness':
        return <MomWellnessTab />;
      case 'fitness':
        return <FitnessTab />;
      default:
        return <MomWellnessTab />;
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
              Keep track of important milestones, health data, and wellness.
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