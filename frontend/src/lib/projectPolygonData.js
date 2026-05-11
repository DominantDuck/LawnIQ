/**
 * Normalize persisted project.polygon_data into an array of rings.
 * Supports: single ring [{lat,lng},...] or multiple rings [[{lat,lng}],...]
 */
export function normalizeProjectPolygonRings(polygonData) {
  if (!polygonData || !Array.isArray(polygonData) || polygonData.length === 0) {
    return [];
  }
  const first = polygonData[0];
  if (
    first &&
    typeof first.lat === 'number' &&
    typeof first.lng === 'number'
  ) {
    return [polygonData];
  }
  if (Array.isArray(first)) {
    return polygonData.filter((ring) => Array.isArray(ring) && ring.length >= 3);
  }
  return [];
}

/**
 * Build flat polygon records for the map store from CRM projects.
 */
export function polygonsFromContactProjects(contactProjects) {
  const out = [];
  for (const proj of contactProjects) {
    const rings = normalizeProjectPolygonRings(proj.polygon_data);
    const areas = proj.individual_areas || [];
    rings.forEach((coordinates, i) => {
      out.push({
        id: `proj_${proj.id}_ring_${i}`,
        coordinates,
        area: Number(areas[i]?.area) || 0,
        description: areas[i]?.description || proj.name || `Area ${i + 1}`,
        source: 'manual'
      });
    });
  }
  return out;
}
