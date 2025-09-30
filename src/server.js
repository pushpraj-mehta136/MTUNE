const express = require('express');
const path = require('path');
const musicController = require('./controllers/musicController.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

// API endpoints
app.get('/search', musicController.search);
app.get('/songs/:id', musicController.getSong);
app.get('/api/modules', musicController.getBrowseModules);
app.get('/api/charts', musicController.getCharts); // Already present, just for clarity
app.get('/api/new-releases', musicController.getNewReleases); // Already present, just for clarity
app.get('/api/top-playlists', musicController.getTopPlaylists); // Already present, just for clarity
app.get('/albums/:id', musicController.getAlbum);
app.get('/artists/:id', musicController.getArtist);
app.get('/playlists/:id', musicController.getPlaylist);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`MUSIFY running on http://localhost:${PORT}`);
});
