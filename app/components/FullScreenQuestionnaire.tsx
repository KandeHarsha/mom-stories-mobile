import themes from '@/constants/colors';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useMemo, useState } from 'react';
import {
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Calendar as RNCalendar } from 'react-native-calendars';

export type QuestionType = 'text' | 'date' | 'single_select' | 'multi_select' | 'number';

export interface QuestionOption {
  label: string;
  value: string;
}

export interface QuestionConfig {
  id: string;
  title: string;
  subtitle?: string;
  type: QuestionType;
  required: boolean;
  options?: QuestionOption[];
  placeholder?: string;
  defaultValue?: any;
  validation?: (value: any, answers: Record<string, any>) => string | null;
  nextQuestionId?: string | null | ((answer: any, answers: Record<string, any>) => string | null);
}

interface FullScreenQuestionnaireProps {
  visible: boolean;
  title?: string;
  submitLabel?: string;
  questions: QuestionConfig[];
  onClose: () => void;
  onSubmit: (answers: Record<string, any>) => Promise<void> | void;
}

const getDefaultAnswer = (question: QuestionConfig) => {
  if (question.defaultValue !== undefined) return question.defaultValue;
  if (question.type === 'multi_select') return [];
  if (question.type === 'number') return '';
  return null;
};

export default function FullScreenQuestionnaire({
  visible,
  title = 'Questionnaire',
  submitLabel = 'Submit',
  questions,
  onClose,
  onSubmit,
}: FullScreenQuestionnaireProps) {
  const { colorScheme } = useColorScheme();
  const currentTheme = themes[colorScheme || 'light'] ?? themes.light;
  const styles = useMemo(() => createStyles(currentTheme), [currentTheme]);

  const [history, setHistory] = useState<number[]>([0]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentIndex = history[history.length - 1] ?? 0;
  const currentQuestion = questions[currentIndex];

  const resolveAnswer = (question: QuestionConfig) => {
    const value = answers[question.id];
    if (value !== undefined) return value;
    return getDefaultAnswer(question);
  };

  const updateAnswer = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setError(null);
  };

  const resolveNextIndex = (question: QuestionConfig, nextAnswers: Record<string, any>) => {
    const answer = nextAnswers[question.id];
    const nextQuestionId =
      typeof question.nextQuestionId === 'function'
        ? question.nextQuestionId(answer, nextAnswers)
        : question.nextQuestionId;

    if (nextQuestionId === null) return -1;

    if (typeof nextQuestionId === 'string') {
      return questions.findIndex((item) => item.id === nextQuestionId);
    }

    if (currentIndex >= questions.length - 1) return -1;
    return currentIndex + 1;
  };

  const validateCurrentQuestion = (skipRequired: boolean) => {
    if (!currentQuestion) return false;

    const value = resolveAnswer(currentQuestion);
    const isEmptyArray = Array.isArray(value) && value.length === 0;
    const isEmptyValue = value === null || value === undefined || value === '' || isEmptyArray;

    if (!skipRequired && currentQuestion.required && isEmptyValue) {
      setError('This question is required.');
      return false;
    }

    if (!isEmptyValue && currentQuestion.validation) {
      const validationError = currentQuestion.validation(value, answers);
      if (validationError) {
        setError(validationError);
        return false;
      }
    }

    return true;
  };

  const handleNext = async (skipRequired = false) => {
    if (!currentQuestion) return;
    if (!validateCurrentQuestion(skipRequired)) return;

    const nextAnswers = {
      ...answers,
      [currentQuestion.id]: resolveAnswer(currentQuestion),
    };

    const nextIndex = resolveNextIndex(currentQuestion, nextAnswers);

    if (nextIndex === -1) {
      try {
        setSubmitting(true);
        await onSubmit(nextAnswers);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (nextIndex < 0 || nextIndex >= questions.length) {
      setError('Unable to continue this flow.');
      return;
    }

    setHistory((prev) => [...prev, nextIndex]);
  };

  const handleBack = () => {
    if (history.length <= 1) {
      onClose();
      return;
    }
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setError(null);
  };

  const handleClose = () => {
    setHistory([0]);
    setAnswers({});
    setError(null);
    onClose();
  };

  const isLastBySequence = currentIndex === questions.length - 1;
  const isLikelyFinalQuestion = isLastBySequence || currentQuestion?.nextQuestionId === null;

  if (!currentQuestion) return null;

  const value = resolveAnswer(currentQuestion);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <ArrowLeft size={22} color={currentTheme.foreground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.max(10, ((currentIndex + 1) / Math.max(1, questions.length)) * 100)}%`,
              },
            ]}
          />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.stepText}>
            Step {currentIndex + 1} of {questions.length}
          </Text>
          <Text style={styles.questionTitle}>{currentQuestion.title}</Text>
          {currentQuestion.subtitle ? <Text style={styles.questionSubtitle}>{currentQuestion.subtitle}</Text> : null}

          {currentQuestion.type === 'text' && (
            <TextInput
              value={value ?? ''}
              onChangeText={(text) => updateAnswer(currentQuestion.id, text)}
              placeholder={currentQuestion.placeholder || 'Type your answer'}
              placeholderTextColor={currentTheme.mutedForeground}
              style={styles.input}
            />
          )}

          {currentQuestion.type === 'number' && (
            <TextInput
              value={value === null || value === undefined ? '' : String(value)}
              onChangeText={(text) => updateAnswer(currentQuestion.id, text)}
              placeholder={currentQuestion.placeholder || 'Enter a number'}
              placeholderTextColor={currentTheme.mutedForeground}
              keyboardType="number-pad"
              style={styles.input}
            />
          )}

          {currentQuestion.type === 'date' && (
            <View style={styles.calendarWrapper}>
              <RNCalendar
                current={typeof value === 'string' ? value : undefined}
                onDayPress={(day) => updateAnswer(currentQuestion.id, day.dateString)}
                markedDates={
                  value
                    ? {
                        [value]: {
                          selected: true,
                          selectedColor: currentTheme.primary,
                          selectedTextColor: currentTheme.primaryForeground,
                        },
                      }
                    : undefined
                }
                theme={{
                  backgroundColor: currentTheme.card,
                  calendarBackground: currentTheme.card,
                  textSectionTitleColor: currentTheme.mutedForeground,
                  selectedDayBackgroundColor: currentTheme.primary,
                  selectedDayTextColor: currentTheme.primaryForeground,
                  todayTextColor: currentTheme.primary,
                  dayTextColor: currentTheme.cardForeground,
                  textDisabledColor: currentTheme.mutedForeground,
                  monthTextColor: currentTheme.cardForeground,
                  arrowColor: currentTheme.primary,
                }}
              />
            </View>
          )}

          {currentQuestion.type === 'single_select' && (
            <View style={styles.optionsContainer}>
              {(currentQuestion.options || []).map((option) => {
                const selected = value === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.optionCard, selected && styles.optionCardSelected]}
                    onPress={() => updateAnswer(currentQuestion.id, option.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{option.label}</Text>
                    {selected ? <Check size={18} color={currentTheme.primaryForeground} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {currentQuestion.type === 'multi_select' && (
            <View style={styles.optionsContainer}>
              {(currentQuestion.options || []).map((option) => {
                const selectedValues = Array.isArray(value) ? value : [];
                const selected = selectedValues.includes(option.value);
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.optionCard, selected && styles.optionCardSelected]}
                    onPress={() => {
                      const nextValues = selected
                        ? selectedValues.filter((item) => item !== option.value)
                        : [...selectedValues, option.value];
                      updateAnswer(currentQuestion.id, nextValues);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{option.label}</Text>
                    {selected ? <Check size={18} color={currentTheme.primaryForeground} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          {!currentQuestion.required && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={() => handleNext(true)}
              disabled={submitting}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => handleNext(false)}
            disabled={submitting}
          >
            <Text style={styles.nextButtonText}>
              {submitting ? 'Submitting...' : isLikelyFinalQuestion ? submitLabel : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    headerTitle: {
      color: theme.foreground,
      fontSize: 18,
      fontWeight: '700',
    },
    closeText: {
      color: theme.primary,
      fontWeight: '600',
    },
    progressTrack: {
      height: 5,
      backgroundColor: theme.border,
      marginHorizontal: 18,
      borderRadius: 999,
      overflow: 'hidden',
      marginBottom: 14,
    },
    progressFill: {
      height: '100%',
      backgroundColor: theme.primary,
      borderRadius: 999,
    },
    content: {
      paddingHorizontal: 18,
      paddingBottom: 20,
    },
    stepText: {
      fontSize: 13,
      color: theme.mutedForeground,
      marginBottom: 10,
    },
    questionTitle: {
      fontSize: 28,
      lineHeight: 34,
      color: theme.foreground,
      fontWeight: '700',
      marginBottom: 8,
    },
    questionSubtitle: {
      fontSize: 15,
      color: theme.mutedForeground,
      marginBottom: 20,
    },
    input: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      color: theme.cardForeground,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: 16,
      marginBottom: 14,
    },
    calendarWrapper: {
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
    },
    optionsContainer: {
      gap: 10,
    },
    optionCard: {
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    optionCardSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    optionLabel: {
      color: theme.cardForeground,
      fontSize: 15,
      fontWeight: '600',
    },
    optionLabelSelected: {
      color: theme.primaryForeground,
    },
    errorText: {
      color: theme.destructive,
      marginTop: 10,
      fontSize: 14,
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingHorizontal: 18,
      paddingVertical: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },
    skipButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.card,
      paddingVertical: 13,
    },
    skipButtonText: {
      color: theme.mutedForeground,
      fontSize: 15,
      fontWeight: '600',
    },
    nextButton: {
      flex: 1,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.primary,
      paddingVertical: 13,
    },
    nextButtonText: {
      color: theme.primaryForeground,
      fontSize: 15,
      fontWeight: '700',
    },
  });
