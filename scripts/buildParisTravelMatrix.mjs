#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'public', 'data', 'France', 'paris');
const ATTRACTIONS_FILE = path.join(DATA_DIR, 'paris_attractions.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'paris_travel_matrix.json');

const MAX_NODES = 60;
const WALK_KMH = 4.8;
const TRANSIT_KMH = 18;

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineKm(a, b) {
  const R = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);

  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function estimateMinutes(distanceKm, speedKmh) {
  if (distanceKm <= 0) return 0;
  return Math.round((distanceKm / speedKmh) * 60);
}

function loadAttractions() {
  const raw = fs.readFileSync(ATTRACTIONS_FILE, 'utf-8');
  const json = JSON.parse(raw);
  if (!Array.isArray(json.sites)) {
    throw new Error('Expected attractions JSON to contain a `sites` array.');
  }
  return json.sites.filter(
    (site) =>
      typeof site.latitude === 'number' &&
      typeof site.longitude === 'number' &&
      site.name
  );
}

function rankAttractions(attractions) {
  return [...attractions]
    .map((site) => ({
      site,
      score:
        (site?.ratings?.cultural_significance ?? 3) * 10 +
        (site?.ratings?.suggested_duration_hours ?? 2),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_NODES)
    .map(({ site }) => site);
}

function buildMatrix(nodes) {
  const matrix = {};
  for (let i = 0; i < nodes.length; i++) {
    const from = nodes[i];
    matrix[from.name] = {};
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const to = nodes[j];
      const distanceKm = haversineKm(
        { lat: from.latitude, lng: from.longitude },
        { lat: to.latitude, lng: to.longitude }
      );
      matrix[from.name][to.name] = {
        distance_km: Number(distanceKm.toFixed(2)),
        walking_minutes: estimateMinutes(distanceKm, WALK_KMH),
        transit_minutes: estimateMinutes(distanceKm, TRANSIT_KMH),
        arrondissement_shift:
          from.arrondissement && to.arrondissement && from.arrondissement !== to.arrondissement,
      };
    }
  }
  return matrix;
}

function main() {
  const attractions = loadAttractions();
  const nodes = rankAttractions(attractions);
  const matrix = buildMatrix(nodes);

  const meta = {
    generated_at: new Date().toISOString(),
    node_count: nodes.length,
    transport_assumptions: {
      method: 'haversine_estimate',
      walking_speed_kmh: WALK_KMH,
      transit_speed_kmh: TRANSIT_KMH,
    },
  };

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify({ meta, nodes: nodes.map((site) => site.name), matrix }, null, 2)
  );

  console.log(`Travel matrix written to ${OUTPUT_FILE}`);
}

main();

