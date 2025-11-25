import React, { lazy, Suspense } from 'react';

// =================
// HEAVY COMPONENTS - Priority for lazy loading
// =================

// Map components (Mapbox is very heavy)
export const LazyMapSection = lazy(() => import('../city-guides/MapSection'));
export const LazyCityMapWithMapbox = lazy(() => import('../city-guides/CityMapWithMapbox'));
export const LazyMapComponent = lazy(() => import('../map/MapComponent'));

// Large data components
export const LazyAttractionsList = lazy(() => import('../city-guides/AttractionsList'));
export const LazyNeighborhoodsList = lazy(() => import('../city-guides/NeighborhoodsList'));
export const LazyCulinaryGuide = lazy(() => import('../city-guides/CulinaryGuide'));
export const LazyMonthlyGuideSection = lazy(() => import('../city-guides/MonthlyGuideSection'));

// =================
// MEDIUM COMPONENTS
// =================

// Planner components
export const LazyEuroTripPlanner = lazy(() => import('../EuroTripPlanner'));
export const LazyPaginatedRow = lazy(() => import('../planner/PaginatedRow'));
export const LazyTripRouteDisplay = lazy(() => import('../planner/TripRouteDisplay'));
export const LazySeasonalRecommendations = lazy(() => import('../planner/SeasonalRecommendations'));

// City guide components
export const LazyTransportConnections = lazy(() => import('../city-guides/TransportConnections'));
export const LazyCityVisitSection = lazy(() => import('../city-guides/CityVisitSection'));
export const LazySeasonalActivities = lazy(() => import('../city-guides/SeasonalActivities'));
export const LazyEnhancedVisitCalendar = lazy(() => import('../city-guides/EnhancedVisitCalendar'));

// =================
// LIGHTWEIGHT COMPONENTS - Can be lazy loaded for organization
// =================
export const LazyCityOverview = lazy(() => import('../city-guides/CityOverview'));
export const LazySingleMonthView = lazy(() => import('../city-guides/SingleMonthView'));

// =================
// LOADING COMPONENTS FOR DIFFERENT USE CASES
// =================

// Default loading component for most components
export const ComponentLoader = ({ text = "Loading...", size = "medium" }) => {
  const sizeClasses = {
    small: "h-6 w-6",
    medium: "h-8 w-8", 
    large: "h-12 w-12"
  };

  const containerClasses = {
    small: "p-4",
    medium: "p-8",
    large: "py-16"
  };

  return (
    <div className={`flex items-center justify-center ${containerClasses[size]}`}>
      <div className={`animate-spin rounded-full ${sizeClasses[size]} border-b-2 border-blue-600 mr-3`}></div>
      <span className="text-gray-600">{text}</span>
    </div>
  );
};

// Map-specific loader with more context
export const MapLoader = () => (
  <div className="flex items-center justify-center py-16">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600 font-medium">Loading Interactive Map</p>
      <p className="text-sm text-gray-500 mt-1">This may take a moment...</p>
    </div>
  </div>
);

// Tab content loader
export const TabLoader = ({ tabName }) => (
  <div className="flex items-center justify-center py-16">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading {tabName.toLowerCase()}...</p>
    </div>
  </div>
);

// Minimal inline loader for small components
export const InlineLoader = ({ text = "Loading..." }) => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
    <span className="text-gray-600 text-sm">{text}</span>
  </div>
);

// =================
// ERROR BOUNDARY FOR LAZY COMPONENTS
// =================

export class LazyComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lazy component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center mx-4 my-8">
          <div className="text-red-600 text-xl mb-2">⚠️</div>
          <p className="text-red-600 font-medium mb-2">Failed to load component</p>
          <p className="text-red-500 text-sm mb-4">
            {this.props.componentName ? `Error loading ${this.props.componentName}` : 'Component loading error'}
          </p>
          <button
            className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm font-medium"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// =================
// SUSPENSE WRAPPERS FOR DIFFERENT CONTEXTS
// =================

// High-level wrapper for major sections
export const SuspenseWrapper = ({ children, fallback, errorBoundary = true, componentName = null }) => {
  const content = <Suspense fallback={fallback}>{children}</Suspense>;
  
  if (errorBoundary) {
    return (
      <LazyComponentErrorBoundary componentName={componentName}>
        {content}
      </LazyComponentErrorBoundary>
    );
  }
  
  return content;
};

// Map-specific suspense wrapper
export const MapSuspenseWrapper = ({ children }) => (
  <SuspenseWrapper 
    fallback={<MapLoader />} 
    componentName="Interactive Map"
  >
    {children}
  </SuspenseWrapper>
);

// Tab content suspense wrapper
export const TabSuspenseWrapper = ({ children, tabName }) => (
  <SuspenseWrapper 
    fallback={<TabLoader tabName={tabName} />} 
    componentName={tabName}
  >
    {children}
  </SuspenseWrapper>
); 