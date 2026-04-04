#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'France', 'paris');
const ATTRACTIONS_FILE = path.join(DATA_PATH, 'paris_attractions.json');
const OUTPUT_FILE = path.join(DATA_PATH, 'paris_zones.json');

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

function haversineDistanceKm(a, b) {
  const R = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);

  const h =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function loadAttractions() {
  const raw = fs.readFileSync(ATTRACTIONS_FILE, 'utf-8');
  const json = JSON.parse(raw);
  if (!Array.isArray(json.sites)) {
    throw new Error('Expected attractions JSON to include a `sites` array.');
  }
  return json.sites;
}

function computeCentroid(points) {
  const total = points.reduce(
    (acc, point) => {
      acc.lat += point.latitude;
      acc.lng += point.longitude;
      return acc;
    },
    { lat: 0, lng: 0 }
  );
  return {
    lat: total.lat / points.length,
    lng: total.lng / points.length,
  };
}

function buildZoneSummary(attractions) {
  const zones = new Map();

  for (const attraction of attractions) {
    const arr = attraction.arrondissement || 'Unknown';
    if (!zones.has(arr)) {
      zones.set(arr, []);
    }
    zones.get(arr).push(attraction);
  }

  const zoneList = [];

  for (const [arrondissement, items] of zones.entries()) {
    const centroid = computeCentroid(items);
    let maxRadiusKm = 0;

    for (const item of items) {
      const distance = haversineDistanceKm(
        centroid,
        { lat: item.latitude, lng: item.longitude }
      );
      maxRadiusKm = Math.max(maxRadiusKm, distance);
    }

    const topAttractions = [...items]
      .sort((a, b) => {
        const aScore = a?.ratings?.cultural_significance ?? 0;
        const bScore = b?.ratings?.cultural_significance ?? 0;
        return bScore - aScore;
      })
      .slice(0, 5)
      .map((item) => item.name);

    zoneList.push({
      id: arrondissement,
      centroid,
      max_radius_km: Number(maxRadiusKm.toFixed(2)),
      attraction_count: items.length,
      sample_attractions: topAttractions,
    });
  }

  for (const zone of zoneList) {
    const distances = zoneList
      .filter((other) => other.id !== zone.id)
      .map((other) => ({
        id: other.id,
        distance_km: Number(
          haversineDistanceKm(zone.centroid, other.centroid).toFixed(2)
        ),
      }))
      .sort((a, b) => a.distance_km - b.distance_km);

    zone.nearest_zones = distances.slice(0, 4);
  }

  return zoneList.sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true })
  );
}

function clusterByProximity(attractions, clusterCount = 6) {
  const points = attractions.map((attr) => ({
    lat: attr.latitude,
    lng: attr.longitude,
    name: attr.name,
    arrondissement: attr.arrondissement,
  }));

  const minLat = Math.min(...points.map((p) => p.lat));
  const maxLat = Math.max(...points.map((p) => p.lat));
  const minLng = Math.min(...points.map((p) => p.lng));
  const maxLng = Math.max(...points.map((p) => p.lng));

  const gridSize = Math.ceil(Math.sqrt(clusterCount));
  const latStep = (maxLat - minLat) / gridSize || 0.01;
  const lngStep = (maxLng - minLng) / gridSize || 0.01;

  const clusters = new Map();

  for (const point of points) {
    const latIndex = Math.min(
      gridSize - 1,
      Math.floor((point.lat - minLat) / latStep)
    );
    const lngIndex = Math.min(
      gridSize - 1,
      Math.floor((point.lng - minLng) / lngStep)
    );
    const key = `${latIndex}-${lngIndex}`;
    if (!clusters.has(key)) {
      clusters.set(key, []);
    }
    clusters.get(key).push(point);
  }

  const clusterSummaries = [];
  let idx = 1;
  for (const pointsInCell of clusters.values()) {
    if (pointsInCell.length === 0) continue;
    const centroid = computeCentroid(
      pointsInCell.map((p) => ({ latitude: p.lat, longitude: p.lng }))
    );
    const uniqueArr = [...new Set(pointsInCell.map((p) => p.arrondissement))];
    clusterSummaries.push({
      id: `cluster-${idx++}`,
      centroid,
      attraction_count: pointsInCell.length,
      arrondissements: uniqueArr,
      sample_attractions: pointsInCell
        .slice(0, 5)
        .map((p) => p.name),
    });
  }

  return clusterSummaries;
}

function main() {
  const attractions = loadAttractions();
  const zones = buildZoneSummary(attractions);
  const clusters = clusterByProximity(attractions, 6);

  const output = {
    generated_at: new Date().toISOString(),
    arrondissement_zones: zones,
    proximity_clusters: clusters,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`Zone summary written to ${OUTPUT_FILE}`);
}

main();

