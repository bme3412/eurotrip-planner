'use client';

export const addAttractionsLayer = (map, idBase, features) => {
  const sourceId = `${idBase}-source`;
  const haloId = `${idBase}-halo`;
  const layerId = `${idBase}-layer`;

  if (map.getSource(sourceId)) {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getLayer(haloId)) map.removeLayer(haloId);
    map.removeSource(sourceId);
  }

  map.addSource(sourceId, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features }
  });

  map.addLayer({
    id: haloId,
    type: 'circle',
    source: sourceId,
    paint: {
      'circle-radius': 18,
      'circle-opacity': 0.15,
      'circle-color': ['get', 'color'],
      'circle-blur': 0.8
    }
  });

  map.addLayer({
    id: layerId,
    type: 'circle',
    source: sourceId,
    paint: {
      'circle-radius': 8,
      'circle-opacity': 0.6,
      'circle-color': ['get', 'color'],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-opacity': 0.9
    }
  });

  return { sourceId, layerId, haloId };
};


