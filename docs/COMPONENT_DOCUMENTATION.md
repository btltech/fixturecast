# Component Documentation

## Overview

This document provides comprehensive documentation for all React components in the FixtureCast application, including their props, usage examples, and best practices.

## Table of Contents

1. [Core Components](#core-components)
2. [Layout Components](#layout-components)
3. [Feature Components](#feature-components)
4. [Accessibility Components](#accessibility-components)
5. [Performance Components](#performance-components)
6. [Utility Components](#utility-components)

## Core Components

### App

**File**: `App.tsx`

The root application component that handles routing, global state, and service initialization.

```typescript
interface AppProps {
  // No props - root component
}
```

**Features:**
- Hash-based routing
- Lazy loading of components
- Global error boundary
- Service initialization
- Performance monitoring

**Usage:**
```typescript
import App from './App';

// Root render
ReactDOM.render(<App />, document.getElementById('root'));
```

### Dashboard

**File**: `components/Dashboard.tsx`

Main dashboard view displaying today's matches, predictions, and team information.

```typescript
interface DashboardProps {
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  navigateToFixtures: () => void;
  setSelectedLeagueFilter: (league: League | 'all') => void;
  onSelectPrediction: (prediction: Prediction) => void;
}
```

**Features:**
- Today's match highlights
- Champions League section
- Team statistics
- Prediction accuracy tracker
- Responsive design

**Usage:**
```typescript
<Dashboard
  onSelectMatch={handleMatchSelect}
  onSelectTeam={handleTeamSelect}
  navigateToFixtures={() => navigate('fixtures')}
  setSelectedLeagueFilter={setLeagueFilter}
  onSelectPrediction={handlePredictionSelect}
/>
```

### MatchCard

**File**: `components/MatchCard.tsx`

Displays individual match information with predictions and team details.

```typescript
interface MatchCardProps {
  match: Match;
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  prediction?: Prediction;
  showPrediction?: boolean;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}
```

**Features:**
- Team logos and names
- Match time and date
- Prediction display
- Live match indicators
- Keyboard navigation

**Usage:**
```typescript
<MatchCard
  match={matchData}
  onSelectMatch={handleMatchClick}
  onSelectTeam={handleTeamClick}
  prediction={predictionData}
  showPrediction={true}
  size="medium"
/>
```

### MatchDetail

**File**: `components/MatchDetail.tsx`

Detailed view of a specific match with comprehensive predictions and analysis.

```typescript
interface MatchDetailProps {
  match: Match;
  onSelectTeam: (teamName: string) => void;
}
```

**Features:**
- Detailed match information
- AI prediction analysis
- Team form comparison
- Historical head-to-head
- Betting odds (if available)

**Usage:**
```typescript
<MatchDetail
  match={selectedMatch}
  onSelectTeam={handleTeamSelect}
/>
```

## Layout Components

### Header

**File**: `components/Header.tsx`

Main navigation header with branding and navigation links.

```typescript
interface HeaderProps {
  onNavigate: (view: View) => void;
  currentView: View;
}
```

**Features:**
- Responsive navigation
- Logo and branding
- Mobile hamburger menu
- Active view indicators

### Footer

**File**: `components/Footer.tsx`

Application footer with links and information.

```typescript
interface FooterProps {
  // No props required
}
```

**Features:**
- Copyright information
- External links
- Social media links
- Legal information

### ErrorBoundary

**File**: `components/ErrorBoundary.tsx`

Catches and displays JavaScript errors gracefully.

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error }>;
}
```

**Features:**
- Error catching
- Fallback UI
- Error reporting
- Development error details

## Feature Components

### Fixtures

**File**: `components/Fixtures.tsx`

Comprehensive fixture listing with multiple view modes.

```typescript
interface FixturesProps {
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  onSelectPrediction: (prediction: Prediction) => void;
  todayOnly?: boolean;
}
```

**View Modes:**
- `original`: Standard fixture list
- `compact`: Condensed view
- `time-focused`: Emphasizes match times
- `single-line`: Ultra-compact single-line format
- `calendar`: Calendar grid view
- `accessible`: Enhanced accessibility
- `mobile`: Mobile-optimized

**Usage:**
```typescript
<Fixtures
  onSelectMatch={handleMatchSelect}
  onSelectTeam={handleTeamSelect}
  onSelectPrediction={handlePredictionSelect}
  todayOnly={false}
/>
```

### CleanFixturesList

**File**: `components/CleanFixturesList.tsx`

ESPN/BBC Sport-style fixture list with advanced filtering.

```typescript
interface CleanFixturesListProps {
  onSelectMatch: (match: Match) => void;
  onSelectTeam: (teamName: string) => void;
  showFilters?: boolean;
  compact?: boolean;
}
```

**Features:**
- Sticky date navigation
- League filtering
- Live match indicators
- Expandable match details
- Team follow functionality

### MyTeams

**File**: `components/MyTeams.tsx`

User's favorite teams and personalized content.

```typescript
interface MyTeamsProps {
  onNavigate: (view: View) => void;
}
```

**Features:**
- Favorite team management
- Team-specific fixtures
- Performance tracking
- Quick navigation

### News

**File**: `components/News.tsx`

Aggregated football news from multiple sources.

```typescript
interface NewsProps {
  onNavigate: (view: View) => void;
}
```

**Features:**
- Multi-source aggregation
- Source filtering
- Search functionality
- Article preview

### TeamPage

**File**: `components/TeamPage.tsx`

Detailed team information and statistics.

```typescript
interface TeamPageProps {
  teamName: string;
  onNavigate: (view: View) => void;
}
```

**Features:**
- Team statistics
- Recent form
- Fixture list
- Squad information
- Historical data

## Performance Components

### PerformanceDashboard

**File**: `components/PerformanceDashboard.tsx`

Displays Core Web Vitals and performance metrics.

```typescript
interface PerformanceDashboardProps {
  // No props - uses performance service
}
```

**Metrics Displayed:**
- Largest Contentful Paint (LCP)
- First Input Delay (FID)
- Cumulative Layout Shift (CLS)
- First Contentful Paint (FCP)
- Time to First Byte (TTFB)

### LoadingSpinner

**File**: `components/LoadingSpinner.tsx`

Animated loading indicator with accessibility support.

```typescript
interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
  label?: string;
}
```

**Features:**
- Multiple sizes
- Custom colors
- Accessible labels
- Reduced motion support

### MatchCardSkeleton

**File**: `components/MatchCardSkeleton.tsx`

Skeleton loading state for match cards.

```typescript
interface MatchCardSkeletonProps {
  count?: number;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
}
```

## Utility Components

### TeamLogo

**File**: `components/TeamLogo.tsx`

Displays team logos with fallbacks and accessibility.

```typescript
interface TeamLogoProps {
  teamName: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  showFallback?: boolean;
}
```

**Features:**
- Multiple sizes
- Fallback handling
- Alt text generation
- Lazy loading

### LeagueLogo

**File**: `components/LeagueLogo.tsx`

Displays league/competition logos.

```typescript
interface LeagueLogoProps {
  league: League;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}
```

### ProbabilityBar

**File**: `components/ProbabilityBar.tsx`

Visual representation of match outcome probabilities.

```typescript
interface ProbabilityBarProps {
  homeWin: number;
  draw: number;
  awayWin: number;
  homeTeam: string;
  awayTeam: string;
  className?: string;
}
```

**Features:**
- Animated bars
- Color coding
- Percentage labels
- Responsive design

### ConfidenceMeter

**File**: `components/ConfidenceMeter.tsx`

Displays prediction confidence level.

```typescript
interface ConfidenceMeterProps {
  confidence: number; // 0-100
  level: ConfidenceLevel;
  showPercentage?: boolean;
  size?: 'small' | 'medium' | 'large';
}
```

### Toast

**File**: `components/Toast.tsx`

Notification toast component.

```typescript
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}
```

### ToastContainer

**File**: `components/ToastContainer.tsx`

Container for managing multiple toast notifications.

```typescript
interface ToastContainerProps {
  toasts: Toast[];
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}
```

## Component Patterns

### Higher-Order Components (HOCs)

#### withErrorBoundary

Wraps components with error boundary functionality:

```typescript
const SafeComponent = withErrorBoundary(MyComponent, {
  fallback: ErrorFallback,
  onError: (error, errorInfo) => {
    console.error('Component error:', error, errorInfo);
  }
});
```

#### withPerformanceTracking

Adds performance monitoring to components:

```typescript
const TrackedComponent = withPerformanceTracking(MyComponent, {
  componentName: 'MyComponent',
  trackRender: true,
  trackMounts: true
});
```

### Render Props

#### DataProvider

Provides data with loading and error states:

```typescript
<DataProvider
  fetchData={() => getFixtures(League.PremierLeague)}
  render={({ data, loading, error, refetch }) => (
    <div>
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage error={error} onRetry={refetch} />}
      {data && <FixturesList fixtures={data} />}
    </div>
  )}
/>
```

### Custom Hooks

#### useFixtures

```typescript
function useFixtures(league: League, date?: string) {
  const [fixtures, setFixtures] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Implementation...

  return { fixtures, loading, error, refetch };
}
```

#### usePrediction

```typescript
function usePrediction(matchId: string) {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Implementation...

  return { prediction, generating, error, generate };
}
```

## Testing Components

### Unit Testing

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import MatchCard from './MatchCard';

describe('MatchCard', () => {
  const mockProps = {
    match: mockMatchData,
    onSelectMatch: jest.fn(),
    onSelectTeam: jest.fn(),
  };

  it('renders match information', () => {
    render(<MatchCard {...mockProps} />);
    
    expect(screen.getByText('Manchester United')).toBeInTheDocument();
    expect(screen.getByText('Liverpool')).toBeInTheDocument();
  });

  it('calls onSelectMatch when clicked', () => {
    render(<MatchCard {...mockProps} />);
    
    fireEvent.click(screen.getByRole('article'));
    
    expect(mockProps.onSelectMatch).toHaveBeenCalledWith(mockProps.match);
  });
});
```

### Integration Testing

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { AppContextProvider } from '../contexts/AppContext';
import Dashboard from './Dashboard';

describe('Dashboard Integration', () => {
  it('loads and displays fixtures', async () => {
    render(
      <AppContextProvider>
        <Dashboard {...mockProps} />
      </AppContextProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Today's Matches")).toBeInTheDocument();
    });
  });
});
```

## Performance Optimization

### Memoization

```typescript
import React, { memo, useMemo } from 'react';

const MatchCard = memo(({ match, prediction }: MatchCardProps) => {
  const formattedTime = useMemo(() => 
    formatMatchTime(match.date), [match.date]
  );

  const predictionDisplay = useMemo(() => 
    formatPrediction(prediction), [prediction]
  );

  return (
    <div>
      <span>{formattedTime}</span>
      {predictionDisplay && <span>{predictionDisplay}</span>}
    </div>
  );
});
```

### Lazy Loading

```typescript
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### Virtual Scrolling

```typescript
import { FixedSizeList as List } from 'react-window';

function VirtualizedFixturesList({ fixtures }: { fixtures: Match[] }) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <MatchCard match={fixtures[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={fixtures.length}
      itemSize={120}
    >
      {Row}
    </List>
  );
}
```

## Best Practices

### Component Design

1. **Single Responsibility**: Each component should have one clear purpose
2. **Composability**: Design components to work well together
3. **Reusability**: Create generic, configurable components
4. **Accessibility**: Include ARIA attributes and keyboard support
5. **Performance**: Use memoization and lazy loading appropriately

### Props Design

1. **Type Safety**: Use TypeScript interfaces for all props
2. **Default Values**: Provide sensible defaults
3. **Validation**: Validate props in development
4. **Documentation**: Document all props with JSDoc

### State Management

1. **Local State**: Use useState for component-specific state
2. **Global State**: Use Context for shared state
3. **Derived State**: Use useMemo for computed values
4. **Side Effects**: Use useEffect for data fetching

### Error Handling

1. **Error Boundaries**: Wrap components with error boundaries
2. **Graceful Degradation**: Show fallbacks for missing data
3. **User Feedback**: Display meaningful error messages
4. **Recovery**: Provide retry mechanisms

---

Last updated: September 19, 2025
