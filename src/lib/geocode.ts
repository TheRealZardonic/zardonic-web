/** Geocode a location string to lat/lon using the OpenStreetMap Nominatim API. */

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
}

/**
 * Returns the first geocoding result for the given location string,
 * or null if none was found or the request failed.
 *
 * Callers are responsible for rate-limiting — Nominatim policy requires
 * at most 1 request per second.
 */
export async function geocodeLocation(
  location: string,
): Promise<{ latitude: string; longitude: string } | null> {
  if (!location.trim()) return null
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'zardonic-industrial/1.0 (https://zardonic.com)',
        'Accept-Language': 'en',
      },
    })
    if (!response.ok) return null
    const results: NominatimResult[] = await response.json() as NominatimResult[]
    if (results.length === 0) return null
    return { latitude: results[0].lat, longitude: results[0].lon }
  } catch {
    return null
  }
}
