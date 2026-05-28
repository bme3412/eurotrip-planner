'use client';

import RouteMapColumn from './RouteMapColumn';

export default function PlannerMapWorkspace({
  tripState,
  interaction,
  setCityNights,
  onSendMessage,
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="min-h-[320px] flex-1 overflow-hidden">
        <RouteMapColumn
          tripState={tripState}
          interaction={interaction}
          setCityNights={setCityNights}
          onSendMessage={onSendMessage}
        />
      </div>
    </div>
  );
}
