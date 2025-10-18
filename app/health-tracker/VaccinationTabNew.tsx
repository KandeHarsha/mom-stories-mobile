import themes from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { ChevronRight, Syringe } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export interface MergedVaccination {
  id: string;
  name: string;
  age: string;
  dose: string;
  description: string;
  status: 0 | 1; // 0 = pending, 1 = complete
  order: number;
  imageUrl?: string;
}

export default function VaccinationTabNew() {
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme || 'light'] ?? themes.light;
  const [vaccinations, setVaccinations] = useState<MergedVaccination[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { session } = useAuth();
  const token = session?.accessToken


  useEffect(() => {
    if ( token) {
      loadVaccinations();
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      // Refresh data when screen comes into focus
      if (token) {
        loadVaccinations();
      }
    }, [token])
  );

  const loadVaccinations = async () => {
    if (!token) {
      return;
    }
    
    setIsLoading(true);
    try {      
      const response = await fetch(`${API_BASE_URL}/vaccinations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorText = await response.text();
          errorMessage = `${response.status} - ${errorText}`;
        } catch (e) {
          console.log('Could not read error response');
        }
        
        // If it's a 500 error, it might be due to invalid token
        if (response.status === 500) {
          errorMessage = 'Server error - please try logging out and back in';
        }
        
        throw new Error(`Failed to fetch vaccinations: ${errorMessage}`);
      }

      const data = await response.json();
      // Sort vaccinations by order field
      const sortedData = data.sort((a: MergedVaccination, b: MergedVaccination) => a.order - b.order);
      setVaccinations(sortedData);
    } catch (error) {
      console.error('Load vaccinations error:', error);
      Alert.alert('Error', (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVaxCardPress = (vax: MergedVaccination) => {
    router.push({
      pathname: '/health-tracker/[vaccinationId]',
      params: {
        vaccinationId: vax.id,
        name: vax.name,
        age: vax.age,
        dose: vax.dose,
        description: vax.description,
        status: vax.status.toString(),
        order: vax.order.toString(),
        imageUrl: vax.imageUrl || '',
      }
    });
  };
  const styles = createStyles(currentTheme);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Vaccination Schedule</Text>
          <Text style={styles.subtitle}>Track your baby's immunizations. Always consult your pediatrician for official schedules.</Text>
        </View>
      </View>

      {/* Vaccination Cards */}
      <View style={styles.vaccinationsContainer}>
        {isLoading ? (
          <View style={styles.emptyState}>
            <Syringe size={64} color={currentTheme.mutedForeground} />
            <Text style={styles.emptyStateText}>Loading vaccinations...</Text>
          </View>
        ) : vaccinations.length === 0 ? (
          <View style={styles.emptyState}>
            <Syringe size={64} color={currentTheme.mutedForeground} />
            <Text style={styles.emptyStateText}>No vaccinations found</Text>
            <Text style={styles.emptyStateSubtext}>Check back later for updates</Text>
          </View>
        ) : (
          vaccinations.map((vax) => (
            <TouchableOpacity
              key={vax.id}
              style={styles.vaccinationCard}
              onPress={() => handleVaxCardPress(vax)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <Syringe size={20} color={currentTheme.primary} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.vaccinationTitle}>{vax.name}</Text>
                  <Text style={styles.vaccinationAge}>Recommended Age: {vax.age}</Text>
                  <Text style={styles.vaccinationDose}>Dose: {vax.dose}</Text>
                </View>
                <View style={styles.cardRight}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: vax.status === 1 ? '#10b981' : currentTheme.muted }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: vax.status === 1 ? 'white' : currentTheme.mutedForeground }
                    ]}>
                      {vax.status === 1 ? 'Complete' : 'Pending'}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={currentTheme.mutedForeground} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
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
  header: {
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    marginBottom: 20,
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
  vaccinationsContainer: {
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.mutedForeground,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.mutedForeground,
    marginTop: 4,
  },
  vaccinationCard: {
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
    gap: 12,
  },
  cardIcon: {
    backgroundColor: theme.muted,
    borderRadius: 20,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  vaccinationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.cardForeground,
    marginBottom: 4,
  },
  vaccinationAge: {
    fontSize: 14,
    color: theme.mutedForeground,
    marginBottom: 2,
  },
  vaccinationDose: {
    fontSize: 14,
    color: theme.mutedForeground,
  },
  cardRight: {
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

});