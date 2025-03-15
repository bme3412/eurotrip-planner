// src/components/city-guides/TransportConnections.js
import React from 'react';

const TransportConnectionCard = ({ title, children, icon }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center mb-4">
        <span className="text-2xl mr-3">{icon}</span>
        <h3 className="text-xl font-semibold">{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  );
};

const TransportConnections = ({ connections }) => {
  if (!connections) {
    return <div className="text-center py-8 text-gray-500">No transportation data available</div>;
  }
  
  const {
    public_transportation,
    airport_connections,
    train_connections,
    local_tips,
    getting_around,
    city_passes
  } = connections;
  
  return (
    <div className="space-y-8">
      {/* Public Transportation */}
      {public_transportation && (
        <TransportConnectionCard title="Public Transportation" icon="🚆">
          <div className="space-y-4">
            {public_transportation.overview && (
              <p className="text-gray-700">{public_transportation.overview}</p>
            )}
            
            {public_transportation.options && public_transportation.options.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-800 mb-2">Available Options</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {public_transportation.options.map((option, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">
                          {option.type === 'metro' && '🚇'}
                          {option.type === 'bus' && '🚌'}
                          {option.type === 'tram' && '🚊'}
                          {option.type === 'ferry' && '⛴️'}
                          {option.type === 'bike' && '🚲'}
                          {option.type === 'cable car' && '🚡'}
                          {option.type === 'funicular' && '🚠'}
                          {!['metro', 'bus', 'tram', 'ferry', 'bike', 'cable car', 'funicular'].includes(option.type) && '🚉'}
                        </span>
                        <h5 className="font-medium">{option.name}</h5>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{option.description}</p>
                      {option.hours && <p className="text-sm mt-1"><span className="font-medium">Hours:</span> {option.hours}</p>}
                      {option.cost && <p className="text-sm mt-1"><span className="font-medium">Cost:</span> {option.cost}</p>}
                      {option.website && (
                        <p className="text-sm mt-1">
                          <a href={option.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                            Official Website
                          </a>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {public_transportation.tickets && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-800 mb-2">Tickets & Passes</h4>
                <p className="text-gray-700">{public_transportation.tickets}</p>
              </div>
            )}
          </div>
        </TransportConnectionCard>
      )}
      
      {/* Airport Connections */}
      {airport_connections && (
        <TransportConnectionCard title="Airport Connections" icon="✈️">
          <div className="space-y-4">
            {airport_connections.overview && (
              <p className="text-gray-700">{airport_connections.overview}</p>
            )}
            
            {airport_connections.airports && airport_connections.airports.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-800 mb-2">Airports</h4>
                <div className="grid grid-cols-1 gap-4">
                  {airport_connections.airports.map((airport, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded">
                      <h5 className="font-medium">{airport.name}</h5>
                      <p className="text-sm text-gray-700 mt-1">{airport.description}</p>
                      
                      {airport.transport_options && airport.transport_options.length > 0 && (
                        <div className="mt-3">
                          <h6 className="text-sm font-medium text-gray-800">Transport to City Center</h6>
                          <ul className="mt-1 space-y-2">
                            {airport.transport_options.map((option, idx) => (
                              <li key={idx} className="text-sm flex">
                                <span className="mr-2">
                                  {option.type === 'train' && '🚆'}
                                  {option.type === 'bus' && '🚌'}
                                  {option.type === 'metro' && '🚇'}
                                  {option.type === 'taxi' && '🚕'}
                                  {option.type === 'shuttle' && '🚐'}
                                  {!['train', 'bus', 'metro', 'taxi', 'shuttle'].includes(option.type) && '🚗'}
                                </span>
                                <div>
                                  <span className="font-medium">{option.name}: </span>
                                  {option.description}
                                  {option.duration && ` (${option.duration})`}
                                  {option.cost && ` - ${option.cost}`}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TransportConnectionCard>
      )}
      
      {/* Train Connections */}
      {train_connections && (
        <TransportConnectionCard title="Train Connections" icon="🚄">
          <div className="space-y-4">
            {train_connections.overview && (
              <p className="text-gray-700">{train_connections.overview}</p>
            )}
            
            {train_connections.stations && train_connections.stations.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-800 mb-2">Train Stations</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {train_connections.stations.map((station, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded">
                      <h5 className="font-medium">{station.name}</h5>
                      <p className="text-sm text-gray-700 mt-1">{station.description}</p>
                      {station.address && <p className="text-sm mt-1"><span className="font-medium">Address:</span> {station.address}</p>}
                      {station.connections && (
                        <p className="text-sm mt-1">
                          <span className="font-medium">Main connections:</span> {station.connections}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {train_connections.popular_routes && train_connections.popular_routes.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-800 mb-2">Popular Train Routes</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-2 text-left">Destination</th>
                        <th className="p-2 text-left">Duration</th>
                        <th className="p-2 text-left">Frequency</th>
                        <th className="p-2 text-left">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {train_connections.popular_routes.map((route, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="p-2 border-t">{route.destination}</td>
                          <td className="p-2 border-t">{route.duration}</td>
                          <td className="p-2 border-t">{route.frequency}</td>
                          <td className="p-2 border-t">{route.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </TransportConnectionCard>
      )}
      
      {/* Getting Around */}
      {getting_around && (
        <TransportConnectionCard title="Getting Around" icon="🗺️">
          <div className="space-y-4">
            {getting_around.overview && (
              <p className="text-gray-700">{getting_around.overview}</p>
            )}
            
            {getting_around.options && getting_around.options.length > 0 && (
              <div className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getting_around.options.map((option, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">
                          {option.type === 'walking' && '🚶'}
                          {option.type === 'bike' && '🚲'}
                          {option.type === 'scooter' && '🛴'}
                          {option.type === 'taxi' && '🚕'}
                          {option.type === 'car' && '🚗'}
                          {option.type === 'rideshare' && '🚘'}
                          {!['walking', 'bike', 'scooter', 'taxi', 'car', 'rideshare'].includes(option.type) && '🧭'}
                        </span>
                        <h5 className="font-medium">{option.name}</h5>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">{option.description}</p>
                      {option.cost && <p className="text-sm mt-1"><span className="font-medium">Cost:</span> {option.cost}</p>}
                      {option.tips && <p className="text-sm mt-1"><span className="font-medium">Tips:</span> {option.tips}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TransportConnectionCard>
      )}
      
      {/* City Passes */}
      {city_passes && city_passes.length > 0 && (
        <TransportConnectionCard title="City Passes & Cards" icon="🎫">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {city_passes.map((pass, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium text-gray-800">{pass.name}</h4>
                  <p className="text-sm text-gray-700 mt-2">{pass.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                    {pass.price && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-800">Price</h5>
                        <p className="text-sm text-gray-700">{pass.price}</p>
                      </div>
                    )}
                    
                    {pass.duration && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-800">Duration</h5>
                        <p className="text-sm text-gray-700">{pass.duration}</p>
                      </div>
                    )}
                    
                    {pass.where_to_buy && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-800">Where to Buy</h5>
                        <p className="text-sm text-gray-700">{pass.where_to_buy}</p>
                      </div>
                    )}
                  </div>
                  
                  {pass.included && (
                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-gray-800">What\s Included</h5>
                      {Array.isArray(pass.included) ? (
                        <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                          {pass.included.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-700 mt-1">{pass.included}</p>
                      )}
                    </div>
                  )}
                  
                  {pass.tips && (
                    <div className="mt-3">
                      <h5 className="text-sm font-medium text-gray-800">Tips</h5>
                      <p className="text-sm text-gray-700">{pass.tips}</p>
                    </div>
                  )}
                  
                  {pass.website && (
                    <div className="mt-3">
                      <a 
                        href={pass.website} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-sm text-blue-500 hover:underline"
                      >
                        Official Website
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TransportConnectionCard>
      )}
      
      {/* Local Tips */}
      {local_tips && local_tips.length > 0 && (
        <TransportConnectionCard title="Local Transport Tips" icon="💡">
          <ul className="space-y-3">
            {local_tips.map((tip, index) => (
              <li key={index} className="flex items-start">
                <span className="text-yellow-500 mr-2">•</span>
                <p className="text-gray-700">{tip}</p>
              </li>
            ))}
          </ul>
        </TransportConnectionCard>
      )}
    </div>
  );
};

export default TransportConnections;