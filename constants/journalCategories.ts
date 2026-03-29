import {
    Baby,
    BookOpen,
    Calendar,
    Flower2,
    Heart, LucideIcon, Smile,
    Sparkles,
    Target
} from 'lucide-react-native'

// Category type definition
export type JournalCategory = 
  | 'General'
  | 'Health'
  | 'Cycle'
  | 'Wellness'
  | 'Goals'
  | 'Gratitude'
  | 'Pregnancy'
  | 'Baby'
  | 'Mood'
  | 'Self-care'

// Category configuration interface
export interface CategoryConfig {
  value: JournalCategory
  label: string
  icon: LucideIcon
  color: string
  lightColor: string
}

// Category configurations with icons and colors
export const JOURNAL_CATEGORIES: CategoryConfig[] = [
  {
    value: 'General',
    label: 'General',
    icon: BookOpen,
    color: '#6B7280', // gray-500
    lightColor: '#F3F4F6' // gray-100
  },
  {
    value: 'Health',
    label: 'Health',
    icon: Heart,
    color: '#EF4444', // red-500
    lightColor: '#FEE2E2' // red-100
  },
  {
    value: 'Cycle',
    label: 'Cycle',
    icon: Calendar,
    color: '#EC4899', // pink-500
    lightColor: '#FCE7F3' // pink-100
  },
  {
    value: 'Wellness',
    label: 'Wellness',
    icon: Sparkles,
    color: '#8B5CF6', // violet-500
    lightColor: '#EDE9FE' // violet-100
  },
  {
    value: 'Goals',
    label: 'Goals',
    icon: Target,
    color: '#3B82F6', // blue-500
    lightColor: '#DBEAFE' // blue-100
  },
  {
    value: 'Gratitude',
    label: 'Gratitude',
    icon: Heart,
    color: '#F59E0B', // amber-500
    lightColor: '#FEF3C7' // amber-100
  },
  {
    value: 'Pregnancy',
    label: 'Pregnancy',
    icon: Baby,
    color: '#10B981', // emerald-500
    lightColor: '#D1FAE5' // emerald-100
  },
  {
    value: 'Baby',
    label: 'Baby',
    icon: Baby,
    color: '#06B6D4', // cyan-500
    lightColor: '#CFFAFE' // cyan-100
  },
  {
    value: 'Mood',
    label: 'Mood',
    icon: Smile,
    color: '#F97316', // orange-500
    lightColor: '#FFEDD5' // orange-100
  },
  {
    value: 'Self-care',
    label: 'Self-care',
    icon: Flower2,
    color: '#14B8A6', // teal-500
    lightColor: '#CCFBF1' // teal-100
  }
]

// Predefined tags
export const PREDEFINED_TAGS = [
  'mood',
  'celebration',
  'memory',
  'private'
]

// Helper function to get category config by value
export const getCategoryConfig = (category: JournalCategory | string): CategoryConfig => {
  return JOURNAL_CATEGORIES.find(c => c.value === category) || JOURNAL_CATEGORIES[0]
}

// Default category
export const DEFAULT_CATEGORY: JournalCategory = 'General'
