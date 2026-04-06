/**
 * NASA API utilities
 * 
 * This file provides utilities for interacting with NASA APIs
 * using the NASA_API_KEY from environment variables.
 */

/**
 * Get the NASA API key from environment variables
 * @returns {string} The NASA API key
 */
export function getNasaApiKey() {
  return process.env.NASA_API_KEY || "DEMO_KEY";
}

/**
 * Fetch data from NASA's DONKI (Space Weather Database Of Notifications, Knowledge, Information) API
 * @param {string} endpoint - The specific DONKI endpoint (e.g., 'CME', 'FLR', etc.)
 * @param {Object} params - Additional query parameters
 * @returns {Promise<Object>} The API response data
 */
export async function fetchDonkiData(endpoint, params = {}) {
  const apiKey = getNasaApiKey();

  const queryParams = new URLSearchParams({
    ...params,
    api_key: apiKey
  });
  
  const url = `https://api.nasa.gov/DONKI/${endpoint}?${queryParams}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`NASA API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Fetch CME (Coronal Mass Ejection) data from NASA's DONKI API
 * @param {Object} params - Query parameters like startDate, endDate
 * @returns {Promise<Object>} CME data
 */
export async function fetchCmeData(params = {}) {
  return fetchDonkiData('CME', params);
}

/**
 * Fetch solar flare data from NASA's DONKI API
 * @param {Object} params - Query parameters like startDate, endDate
 * @returns {Promise<Object>} Solar flare data
 */
export async function fetchSolarFlareData(params = {}) {
  return fetchDonkiData('FLR', params);
}

/**
 * Fetch solar energetic particle data from NASA's DONKI API
 * @param {Object} params - Query parameters like startDate, endDate
 * @returns {Promise<Object>} SEP data
 */
export async function fetchSepData(params = {}) {
  return fetchDonkiData('SEP', params);
}