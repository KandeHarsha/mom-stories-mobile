# Health Tracker Module

This directory contains the mobile-compatible health tracker components at the app level, organized similarly to the ai-support module.

## Structure

```
health-tracker/
├── index.tsx                # Main entry point
├── HealthTrackerView.tsx    # Main component with tab navigation
├── BabyGrowthTab.tsx       # Baby growth charts and milestones
├── VaccinationsTab.tsx     # Vaccination tracking with photo upload
├── MomWellnessTab.tsx      # Mom's sleep and mood tracking
└── README.md               # This file
```

## Usage

Import the health tracker module:

```tsx
import HealthTracker from '../health-tracker';

export default function HealthTrackerScreen() {
  return <HealthTracker />;
}
```

Or import specific components:

```tsx
import { BabyGrowthTab, VaccinationsTab } from '../health-tracker';
```

## Components

### Main Entry (index.tsx)
- Clean entry point for the module
- Exports the main HealthTrackerView component

### HealthTrackerView
- Main container component with tab navigation
- Mobile-responsive design with horizontal scrolling tabs
- Clean header with app branding

### BabyGrowthTab
- Interactive growth charts using Recharts
- Weight and length tracking over time
- Mobile-optimized chart sizing
- Responsive design for tablets

### VaccinationsTab
- Accordion-style vaccination list
- Photo upload functionality using Expo ImagePicker
- Status tracking (complete/pending)
- Image viewing modal
- Service integration for data management

### MomWellnessTab
- Sleep pattern tracking charts
- Mood tracking (1-5 scale)
- Wellness insights and tips
- Side-by-side layout on tablets
- Responsive chart sizing

## Dependencies

### External Packages
- `expo-image-picker` - For photo uploads
- `lucide-react-native` - For icons
- `recharts` - For charts (may need React Native compatible version)

### Internal Dependencies
- `../components/ui/*` - UI component library
- `../hooks/use-toast` - Toast notifications
- `../lib/utils` - Utility functions
- `../services/vaccination-service` - Data service layer

## Features

### Mobile Optimizations
- Touch-friendly interface with proper touch targets
- Responsive chart sizing based on screen width
- Horizontal scrolling tab navigation
- Optimized image handling for React Native
- Native mobile components (TouchableOpacity, Modal, etc.)

### Tablet Support
- Larger chart sizes on bigger screens
- Side-by-side layout for wellness charts
- Wider tab buttons for better usability
- Better use of available screen real estate

### Data Management
- Service layer abstraction for API calls
- Mock data for development and testing
- Proper error handling and loading states
- Image upload and storage handling

## Customization

### Adding New Tabs
1. Create new component in this directory
2. Add to `tabs` array in `HealthTrackerView.tsx`
3. Add case to `renderTabContent()` switch statement
4. Export from `index.tsx` if needed

### Styling
- Uses NativeWind for consistent styling
- Follows design system color scheme
- Responsive breakpoints for tablet support
- Consistent spacing and typography

### Charts
- Recharts configuration in each component
- Mobile-optimized sizing and margins
- Consistent color scheme across charts
- Responsive design patterns

## Architecture

This module follows the same organizational pattern as other app-level modules:

- **Modular**: Self-contained with clear boundaries
- **Reusable**: Components can be imported individually
- **Mobile-first**: Optimized for React Native
- **Scalable**: Easy to add new features and tabs
- **Maintainable**: Clear separation of concerns

## Notes

- All components are React Native compatible
- Uses Expo ImagePicker for cross-platform image handling
- Charts may require React Native compatible charting library
- Mock data services included for development
- Toast notifications use React Native Alert for simplicity
- Follows consistent import patterns with relative paths