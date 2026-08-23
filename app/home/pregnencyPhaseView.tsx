import FullScreenQuestionnaire, { QuestionConfig } from '@/app/components/FullScreenQuestionnaire';
import { sizeComparisionOfBabyByWeek } from '@/app/utils';
import { useAuth } from '@/context/AuthContext';
import { Baby, Calendar, CalendarHeart, Heart, Ruler } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

interface PregnancyPhaseViewProps {
	currentTheme: any;
}

type PregnancyType = 'singleton' | 'twins' | 'triplets';

interface PregnancyData {
	id: string;
	calculationMethod?: string;
	dueDate?: string;
	lmpDate?: string;
	cycleLengthDays?: number;
	babyNickname?: string;
	pregnancyType?: PregnancyType;
	status?: string;
}

const calculateGestationalWeeks = (pregnancy: PregnancyData | null) => {
	if (!pregnancy) return 0;
	const today = new Date();

	if (pregnancy.lmpDate) {
		const lmp = new Date(pregnancy.lmpDate);
		const diffMs = today.getTime() - lmp.getTime();
		return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7)));
	}

	if (pregnancy.dueDate) {
		const due = new Date(pregnancy.dueDate);
		const weeksLeft = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 7));
		return Math.max(0, 40 - weeksLeft);
	}

	return 0;
};

export default function PregnancyPhaseView({ currentTheme }: PregnancyPhaseViewProps) {
	const { user, session, refreshUser } = useAuth();
	const [showQuestionnaire, setShowQuestionnaire] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [pregnancyData, setPregnancyData] = useState<PregnancyData | null>(null);
	const [loadingPregnancyData, setLoadingPregnancyData] = useState(false);

	const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);

	useEffect(() => {
		const fetchPregnancyData = async () => {
			if (!user?.pregnancyId || !session?.accessToken) return;

			setLoadingPregnancyData(true);
			try {
				const response = await fetch(`${API_BASE_URL}/pregnancy/${user.pregnancyId}`, {
					headers: {
						Authorization: `Bearer ${session.accessToken}`,
						'Content-Type': 'application/json',
					},
				});

				if (response.ok) {
					const responseData = await response.json();
					setPregnancyData(responseData.pregnancy || responseData);
				}
			} catch (error) {
				console.error('Failed to fetch pregnancy data:', error);
			} finally {
				setLoadingPregnancyData(false);
			}
		};

		fetchPregnancyData();
	}, [user?.pregnancyId, session?.accessToken]);

	const questions: QuestionConfig[] = useMemo(
		() => [
			{
				id: 'knowsDueDate',
				title: 'Do you know your due date?',
				subtitle: 'This helps us personalize your pregnancy timeline.',
				type: 'single_select',
				required: true,
				options: [
					{ label: 'Yes, I know it', value: 'yes' },
					{ label: "No, let's use my LMP", value: 'no' },
				],
				nextQuestionId: (answer) => (answer === 'yes' ? 'dueDate' : 'lmpDate'),
			},
			{
				id: 'dueDate',
				title: 'When is your due date?',
				type: 'date',
				required: true,
				nextQuestionId: 'pregnancyType',
			},
			{
				id: 'lmpDate',
				title: 'When was your last menstrual period?',
				subtitle: 'Select the first day of your last period.',
				type: 'date',
				required: true,
				nextQuestionId: 'cycleLengthDays',
			},
			{
				id: 'cycleLengthDays',
				title: 'What is your cycle length in days?',
				subtitle: 'Optional. We use 28 days by default.',
				type: 'number',
				required: false,
				defaultValue: '28',
				validation: (value) => {
					if (value === null || value === undefined || value === '') return null;
					const parsed = Number(value);
					if (!Number.isFinite(parsed) || parsed < 20 || parsed > 45) {
						return 'Please enter a valid cycle length between 20 and 45.';
					}
					return null;
				},
				nextQuestionId: 'pregnancyType',
			},
			{
				id: 'pregnancyType',
				title: 'What is your pregnancy type?',
				type: 'single_select',
				required: false,
				options: [
					{ label: 'Singleton', value: 'singleton' },
					{ label: 'Twins', value: 'twins' },
					{ label: 'Triplets', value: 'triplets' },
				],
				nextQuestionId: 'babyNickname',
			},
			{
				id: 'babyNickname',
				title: 'Give your baby a nickname',
				subtitle: 'Optional. You can always update this later.',
				type: 'text',
				required: false,
				placeholder: 'Example: Peanut',
				nextQuestionId: null,
			},
		],
		[]
	);

	const handleSubmit = async (answers: Record<string, any>) => {
		if (!session?.accessToken) {
			Alert.alert('Authentication required', 'Please sign in again to continue.');
			return;
		}

		const dueDate = answers.dueDate ? new Date(answers.dueDate).toISOString() : undefined;
		const lmpDate = answers.lmpDate ? new Date(answers.lmpDate).toISOString() : undefined;

		if (!dueDate && !lmpDate) {
			Alert.alert('Missing information', 'Please provide either due date or LMP date.');
			return;
		}

		const calculationMethod = lmpDate ? 'lmp' : 'due_date';

		const payload: {
			dueDate?: string;
			lmpDate?: string;
			cycleLengthDays?: number;
			calculationMethod: 'lmp' | 'due_date';
			babyNickname?: string;
			pregnancyType?: PregnancyType;
		} = {
			calculationMethod,
		};

		if (dueDate) payload.dueDate = dueDate;
		if (lmpDate) payload.lmpDate = lmpDate;
		if (answers.cycleLengthDays) payload.cycleLengthDays = Number(answers.cycleLengthDays);
		if (answers.babyNickname) payload.babyNickname = String(answers.babyNickname).trim();
		if (answers.pregnancyType) payload.pregnancyType = answers.pregnancyType as PregnancyType;

		setIsSubmitting(true);
		try {
			const response = await fetch(`${API_BASE_URL}/pregnancy`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${session.accessToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData?.message || 'Failed to start pregnancy journey.');
			}

			await refreshUser();
			setShowQuestionnaire(false);
			Alert.alert('Success', 'Your pregnancy journey has started.');
		} catch (error) {
			Alert.alert('Error', error instanceof Error ? error.message : 'Something went wrong.');
		} finally {
			setIsSubmitting(false);
		}
	};

	if (user?.pregnancyId) {
		if (loadingPregnancyData) {
			return (
				<View style={styles.journeyCard}>
					<ActivityIndicator size="large" color={currentTheme.primary} />
				</View>
			);
		}

		const week = calculateGestationalWeeks(pregnancyData);
		const normalizedWeek = Math.min(40, Math.max(4, week));
		const trimester = normalizedWeek <= 12 ? 1 : normalizedWeek <= 27 ? 2 : 3;
		const sizeComparison =
			sizeComparisionOfBabyByWeek[
				normalizedWeek as keyof typeof sizeComparisionOfBabyByWeek
			] || 'growing beautifully';
		const progressPercent = Math.min(100, Math.max(0, (normalizedWeek / 40) * 100));
		const daysToDueDate = pregnancyData?.dueDate
			? Math.max(
					0,
					Math.ceil((new Date(pregnancyData.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
			  )
			: null;

		return (
			<View style={styles.journeyCard}>
				<View style={styles.journeyHeader}>
					<View style={styles.iconWrap}>
						<Baby size={30} color={currentTheme.primary} />
					</View>
					<View style={styles.journeyHeaderTextWrap}>
						<Text style={styles.journeyTitle}>
							{pregnancyData?.babyNickname
								? `${pregnancyData.babyNickname}'s Journey`
								: 'Pregnancy Journey Active'}
						</Text>
						<Text style={styles.journeySubtitle}>Trimester {trimester} • Week {normalizedWeek}</Text>
					</View>
					<Heart size={20} color={currentTheme.destructive} fill={currentTheme.destructive} />
				</View>

				<View style={styles.progressTrack}>
					<View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
				</View>
				<View style={styles.progressMetaRow}>
					<Text style={styles.progressMetaText}>Week {normalizedWeek} of 40</Text>
					<Text style={styles.progressMetaText}>{Math.round(progressPercent)}%</Text>
				</View>

				<View style={styles.sizeCard}>
					<View style={styles.sizeIconWrap}>
						<Ruler size={20} color={currentTheme.primary} />
					</View>
					<View style={styles.sizeTextWrap}>
						<Text style={styles.sizeTitle}>Baby is the size of a</Text>
						<Text style={styles.sizeValue}>{sizeComparison}</Text>
					</View>
				</View>

				<View style={styles.infoRow}>
					{daysToDueDate !== null ? (
						<View style={styles.infoItem}>
							<Calendar size={16} color={currentTheme.mutedForeground} />
							<Text style={styles.infoValue}>{daysToDueDate}</Text>
							<Text style={styles.infoLabel}>days to due date</Text>
						</View>
					) : null}
					{pregnancyData?.pregnancyType ? (
						<View style={styles.infoItem}>
							<Baby size={16} color={currentTheme.mutedForeground} />
							<Text style={styles.infoValue}>
								{pregnancyData.pregnancyType.charAt(0).toUpperCase() + pregnancyData.pregnancyType.slice(1)}
							</Text>
							<Text style={styles.infoLabel}>pregnancy type</Text>
						</View>
					) : null}
				</View>
			</View>
		);
	}

	return (
		<>
			<View style={styles.startCard}>
				<View style={styles.startIconWrap}>
					<CalendarHeart size={26} color={currentTheme.primary} />
				</View>
				<Text style={styles.startTitle}>Start Your Pregnancy Journey</Text>
				<Text style={styles.startDescription}>
					Answer a few questions to personalize your timeline and recommendations.
				</Text>

				<TouchableOpacity
					style={[styles.startButton, isSubmitting && styles.startButtonDisabled]}
					onPress={() => setShowQuestionnaire(true)}
					disabled={isSubmitting}
				>
					<Text style={styles.startButtonText}>Start Pregnancy Journey</Text>
				</TouchableOpacity>
			</View>

			<FullScreenQuestionnaire
				visible={showQuestionnaire}
				title="Pregnancy Setup"
				submitLabel="Submit"
				questions={questions}
				onClose={() => setShowQuestionnaire(false)}
				onSubmit={handleSubmit}
			/>
		</>
	);
}

const createStyles = (theme: any) =>
	StyleSheet.create({
		startCard: {
			backgroundColor: theme.card,
			borderRadius: 16,
			padding: 20,
			marginBottom: 24,
			shadowColor: theme.foreground,
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.1,
			shadowRadius: 8,
			elevation: 3,
			alignItems: 'center',
		},
		startIconWrap: {
			width: 56,
			height: 56,
			borderRadius: 28,
			backgroundColor: theme.primary + '20',
			justifyContent: 'center',
			alignItems: 'center',
			marginBottom: 14,
		},
		startTitle: {
			fontSize: 22,
			fontWeight: '700',
			color: theme.cardForeground,
			marginBottom: 8,
			textAlign: 'center',
		},
		startDescription: {
			fontSize: 14,
			color: theme.mutedForeground,
			textAlign: 'center',
			marginBottom: 16,
			lineHeight: 21,
		},
		startButton: {
			width: '100%',
			backgroundColor: theme.primary,
			borderRadius: 12,
			paddingVertical: 14,
			alignItems: 'center',
		},
		startButtonDisabled: {
			opacity: 0.6,
		},
		startButtonText: {
			color: theme.primaryForeground,
			fontSize: 15,
			fontWeight: '700',
		},
		journeyCard: {
			backgroundColor: theme.card,
			borderRadius: 16,
			padding: 20,
			marginBottom: 24,
			shadowColor: theme.foreground,
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.1,
			shadowRadius: 8,
			elevation: 3,
		},
		journeyHeader: {
			flexDirection: 'row',
			alignItems: 'center',
			marginBottom: 14,
		},
		iconWrap: {
			width: 50,
			height: 50,
			borderRadius: 25,
			backgroundColor: theme.primary + '20',
			justifyContent: 'center',
			alignItems: 'center',
		},
		journeyHeaderTextWrap: {
			flex: 1,
			marginLeft: 12,
		},
		journeyTitle: {
			color: theme.cardForeground,
			fontSize: 18,
			fontWeight: '700',
			marginBottom: 4,
		},
		journeySubtitle: {
			color: theme.mutedForeground,
			fontSize: 14,
		},
		progressTrack: {
			height: 8,
			backgroundColor: theme.border,
			borderRadius: 999,
			overflow: 'hidden',
			marginBottom: 6,
		},
		progressFill: {
			height: '100%',
			backgroundColor: theme.primary,
			borderRadius: 999,
		},
		progressMetaRow: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			marginBottom: 14,
		},
		progressMetaText: {
			fontSize: 12,
			color: theme.mutedForeground,
		},
		sizeCard: {
			flexDirection: 'row',
			alignItems: 'center',
			backgroundColor: theme.primary + '12',
			paddingHorizontal: 14,
			paddingVertical: 12,
			borderRadius: 12,
			marginBottom: 14,
		},
		sizeIconWrap: {
			width: 38,
			height: 38,
			borderRadius: 19,
			backgroundColor: theme.primary + '24',
			justifyContent: 'center',
			alignItems: 'center',
			marginRight: 10,
		},
		sizeTextWrap: {
			flex: 1,
		},
		sizeTitle: {
			fontSize: 12,
			color: theme.mutedForeground,
			marginBottom: 2,
		},
		sizeValue: {
			fontSize: 18,
			fontWeight: '700',
			color: theme.primary,
			textTransform: 'capitalize',
		},
		infoRow: {
			flexDirection: 'row',
			justifyContent: 'space-around',
		},
		infoItem: {
			alignItems: 'center',
			gap: 4,
		},
		infoValue: {
			fontSize: 16,
			fontWeight: '700',
			color: theme.cardForeground,
		},
		infoLabel: {
			fontSize: 12,
			color: theme.mutedForeground,
		},
	});
