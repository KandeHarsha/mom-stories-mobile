import { Baby, Calendar, Heart, Ruler, Scale } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

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
	name: string;
	gender: string;
	birthday: string;
	height: HeightEntry[];
	weight: WeightEntry[];
}

interface PostDeliveryPhaseViewProps {
	loading: boolean;
	babyProfile: BabyProfile | null;
	currentTheme: any;
	styles: any;
	calculateAge: (birthday: string) => string;
	getIdealRange: (birthday: string, gender: string) => {
		weightRange: { min: number; max: number } | null;
		heightRange: { min: number; max: number } | null;
	};
	onOpenHealthTracker: () => void;
	onOpenAddMeasurement: () => void;
}

export default function PostDeliveryPhaseView({
	loading,
	babyProfile,
	currentTheme,
	styles,
	calculateAge,
	getIdealRange,
	onOpenHealthTracker,
	onOpenAddMeasurement,
}: PostDeliveryPhaseViewProps) {
	return (
		<>
			{loading ? (
				<View style={styles.card}>
					<ActivityIndicator size="large" color={currentTheme.primary} />
				</View>
			) : babyProfile ? (
				<TouchableOpacity
					style={styles.childCard}
					onPress={onOpenHealthTracker}
					activeOpacity={0.7}
				>
					<View style={styles.childCardHeader}>
						<View style={styles.childIconContainer}>
							<Baby size={32} color={currentTheme.primary} />
						</View>
						<View style={styles.childInfo}>
							<Text style={styles.childName}>{babyProfile.name}</Text>
							<Text style={styles.childAge}>{calculateAge(babyProfile.birthday)}</Text>
						</View>
						<Heart size={24} color={currentTheme.destructive} fill={currentTheme.destructive} />
					</View>

					<View style={styles.divider} />

					<View style={styles.childStats}>
						<View style={styles.statItem}>
							<Text style={styles.statLabel}>Ideal Weight</Text>
							<Text style={styles.statValue}>
								{(() => {
									const { weightRange } = getIdealRange(babyProfile.birthday, babyProfile.gender);
									return weightRange ? `${weightRange.min}-${weightRange.max} kg` : 'N/A';
								})()}
							</Text>
						</View>
						<View style={styles.statDivider} />
						<View style={styles.statItem}>
							<Text style={styles.statLabel}>Ideal Height</Text>
							<Text style={styles.statValue}>
								{(() => {
									const { heightRange } = getIdealRange(babyProfile.birthday, babyProfile.gender);
									return heightRange ? `${heightRange.min}-${heightRange.max} cm` : 'N/A';
								})()}
							</Text>
						</View>
					</View>
				</TouchableOpacity>
			) : null}

			{babyProfile && (
				<View style={styles.growthDetailsCard}>
					<View style={styles.growthDetailsHeader}>
						<Text style={styles.growthDetailsTitle}>Growth Details</Text>
						<TouchableOpacity
							onPress={onOpenAddMeasurement}
							activeOpacity={0.7}
						>
							<Text style={styles.updateRecordText}>Update Record</Text>
						</TouchableOpacity>
					</View>

					<View style={styles.growthDetailsContent}>
						<View style={styles.growthDetailItem}>
							<View style={styles.growthDetailIconContainer}>
								<Scale size={20} color={currentTheme.primary} />
							</View>
							<View style={styles.growthDetailInfo}>
								<Text style={styles.growthDetailLabel}>Current Weight</Text>
								<Text style={styles.growthDetailValue}>
									{babyProfile.weight && babyProfile.weight.length > 0
										? `${babyProfile.weight[babyProfile.weight.length - 1].value} kg`
										: 'No data'}
								</Text>
							</View>
						</View>

						<View style={styles.growthDetailDivider} />

						<View style={styles.growthDetailItem}>
							<View style={styles.growthDetailIconContainer}>
								<Ruler size={20} color={currentTheme.primary} />
							</View>
							<View style={styles.growthDetailInfo}>
								<Text style={styles.growthDetailLabel}>Current Height</Text>
								<Text style={styles.growthDetailValue}>
									{babyProfile.height && babyProfile.height.length > 0
										? `${babyProfile.height[babyProfile.height.length - 1].value} cm`
										: 'No data'}
								</Text>
							</View>
						</View>
					</View>

					{(babyProfile.weight.length > 0 || babyProfile.height.length > 0) && (
						<View style={styles.lastUpdatedContainer}>
							<Calendar size={14} color={currentTheme.mutedForeground} />
							<Text style={styles.lastUpdatedText}>
								Last updated:{' '}
								{(() => {
									const lastWeightDate = babyProfile.weight.length > 0
										? new Date(babyProfile.weight[babyProfile.weight.length - 1].date)
										: null;
									const lastHeightDate = babyProfile.height.length > 0
										? new Date(babyProfile.height[babyProfile.height.length - 1].date)
										: null;

									let lastDate = lastWeightDate;
									if (lastHeightDate && (!lastWeightDate || lastHeightDate > lastWeightDate)) {
										lastDate = lastHeightDate;
									}

									return lastDate
										? lastDate.toLocaleDateString('en-US', {
											month: 'short',
											day: 'numeric',
											year: 'numeric',
										})
										: 'N/A';
								})()}
							</Text>
						</View>
					)}
				</View>
			)}
		</>
	);
}
