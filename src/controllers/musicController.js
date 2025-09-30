const jiosaavnAPI = require('../api/jiosaavn-api');

async function search(req, res) {
  try {
    const query = req.query.q || req.query.query;
    if (!query) return res.status(400).json({ success: false, message: 'Query is required.' });
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const data = await jiosaavnAPI.search(query, page, limit);
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getSong(req, res) {
  try {
    const songId = req.params.id;
    if (!songId) return res.status(400).json({ success: false, message: 'Song ID is required.' });
    const data = await jiosaavnAPI.getSong(songId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getAlbum(req, res) {
  try {
    const albumId = req.params.id;
    if (!albumId) return res.status(400).json({ success: false, message: 'Album ID is required.' });
    const data = await jiosaavnAPI.getAlbum(albumId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getPlaylist(req, res) {
  try {
    const playlistId = req.params.id;
    if (!playlistId) return res.status(400).json({ success: false, message: 'Playlist ID is required.' });
    const data = await jiosaavnAPI.getPlaylist(playlistId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

async function getArtist(req, res) {
  try {
    const artistId = req.params.id;
    if (!artistId) return res.status(400).json({ success: false, message: 'Artist ID is required.' });
    const data = await jiosaavnAPI.getArtist(artistId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

const forwardToApi = (apiMethod) => async (req, res) => {
  try {
    const data = await apiMethod();
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  search,
  getSong,
  getAlbum,
  getPlaylist,
  getArtist,
  getBrowseModules: forwardToApi(jiosaavnAPI.getBrowseModules),
  getCharts: forwardToApi(jiosaavnAPI.getCharts),
  getNewReleases: forwardToApi(jiosaavnAPI.getNewReleases),
  getTopPlaylists: forwardToApi(jiosaavnAPI.getTopPlaylists),
};
