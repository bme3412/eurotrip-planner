import { lazy } from 'react';

// Lazy load heavy components to reduce initial bundle size
export const LazyEuroTripPlanner = lazy(() => import('../EuroTripPlanner'));
export const LazyMapSection = lazy(() => import('../city-guides/MapSection'));
export const LazyMonthlyGuideSection = lazy(() => import('../city-guides/MonthlyGuideSection'));
export const LazyCityVisitSection = lazy(() => import('../city-guides/CityVisitSection'));

// Lazy load planner components
export const LazyPaginatedRow = lazy(() => import('../planner/PaginatedRow'));
export const LazyTripRouteDisplay = lazy(() => import('../planner/TripRouteDisplay'));
export const LazySeasonalRecommendations = lazy(() => import('../planner/SeasonalRecommendations'));

// Lazy load city guide components
export const LazyAttractionsList = lazy(() => import('../city-guides/AttractionsList'));
export const LazyNeighborhoodsList = lazy(() => import('../city-guides/NeighborhoodsList'));
export const LazyCulinaryGuide = lazy(() => import('../city-guides/CulinaryGuide'));
export const LazyTransportConnections = lazy(() => import('../city-guides/TransportConnections'));

// Loading component for Suspense fallbacks
export const ComponentLoader = ({ text = "Loading..." }) => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
    <span className="text-gray-600">{text}</span>
  </div>
);

// Error boundary for lazy components
export class LazyComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lazy component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-600 font-medium">Failed to load component</p>
          <button
            className="mt-2 text-sm text-red-500 underline hover:text-red-700"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
} 