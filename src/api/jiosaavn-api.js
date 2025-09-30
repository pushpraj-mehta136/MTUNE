const API_BASE = "https://saavn.dev/api";

async function apiFetch(endpoint) {
  const url = `${API_BASE}${endpoint}`;
  try {
    // The 'node-fetch' package would be needed if running this on a Node version < 18
    // But for modern Node, global fetch is available.
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    throw error; // Re-throw to be handled by the controller
  }
}

module.exports = {
  search: (query, page, limit) => apiFetch(`/search/songs?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`),
  searchSongs: (query, page, limit) => apiFetch(`/search/songs?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`),
  
  // --- Song, Album, Playlist, Artist Details ---
  getSong: (id) => apiFetch(`/songs/${id}`),
  getAlbum: (id) => apiFetch(`/albums?id=${id}&songs=true`),
  getPlaylist: (id) => apiFetch(`/playlists/${id}`),
  getArtist: (id) => apiFetch(`/artists/${id}`),

  // --- Browse Endpoints ---
  getBrowseModules: () => apiFetch('/modules?language=hindi,english'),
  getCharts: () => apiFetch('/charts'),
  getNewReleases: () => apiFetch('/modules?language=hindi,english'), // New releases are part of the modules endpoint
  getTopPlaylists: () => apiFetch('/modules?language=hindi,english'), // Top playlists are also in modules
};