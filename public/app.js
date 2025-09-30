const Musify = {
  state: {
    songQueue: [],
    currentSongIndex: -1,
    isPlaying: false,
    isShuffle: false,
    repeatMode: 'off', // 'off', 'one', 'all'
    history: [],
    favourites: [],
    userPlaylists: [],
    savedPlaylists: [],
    audioQuality: '320kbps',
    endlessQueue: true,
    downloadFolderHandle: null, // For File System Access API
    notifications: true,
    dynamicTheme: true,
    search: {
      currentPage: 0,
      totalResults: 0,
      isLoading: false,
      query: '',
    },
    navigation: {
      previousSection: 'discover',
      currentSection: 'discover',
    },
  },

  ui: {},

  api: {
    // All API calls will now go directly to the saavn.dev domain.
    // This will only work if saavn.dev has the correct CORS headers.
    BASE_URL: "https://saavn.dev/api",

    async _fetch(path) {
      try {
        const response = await fetch(`${this.BASE_URL}${path}`);
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error(`Direct API fetch error for path ${path}:`, error);
        return null;
      }
    },

    searchAll: (query) => Musify.api._fetch(`/search?query=${encodeURIComponent(query)}`),
    getSongDetails: (id) => Musify.api._fetch(`/songs/${id}`),
    getPlaylistDetails: (id) => Musify.api._fetch(`/playlists/${id}`),
    getAlbumDetails: (id) => Musify.api._fetch(`/albums?id=${id}`),
    getArtistDetails: (id) => Musify.api._fetch(`/artists/${id}`),
    getSongSuggestions: (songId, limit = 10) => Musify.api._fetch(`/songs/${songId}/suggestions?limit=${limit}`),
    getCharts: () => Musify.api._fetch('/charts'),
    getNewReleases: () => Musify.api._fetch('/modules?language=hindi,english'),
    getTopPlaylists: () => Musify.api._fetch('/modules?language=hindi,english'),
  },

  init() {
    // Cache UI elements
    this.ui = {
      audioPlayer: document.getElementById('audioPlayer'),
      playPauseBtn: document.getElementById('playPauseBtn'),
      mobilePlayPauseIcon: document.getElementById('mobilePlayPauseIcon'),
      playPauseIcon: document.getElementById('playPauseIcon'),
      shuffleBtn: document.getElementById('shuffleBtn'),
      repeatBtn: document.getElementById('repeatBtn'),
      currentSongTitle: document.getElementById('currentSongTitle'),
      currentSongArtist: document.getElementById('currentSongArtist'),
      currentSongImg: document.getElementById('currentSongImg'),
      progressBar: document.getElementById('progressBar'),
      compactProgressBar: document.getElementById('compact-progress-bar'),
      searchBar: document.getElementById('searchBar'),
      currentTime: document.getElementById('currentTime'),
      totalDuration: document.getElementById('totalDuration'),
      mainSearchBar: document.getElementById('mainSearchBar'),
      searchSuggestions: document.getElementById('searchSuggestions'),
      mainContent: document.querySelector('.main-content'),
      contentSections: document.querySelectorAll('.content-section'),
      // Discover page sections
      recommendedSongs: document.getElementById('recommendedSongs'),
      recommendedPlaylists: document.getElementById('recommendedPlaylists'),
      recommendedArtists: document.getElementById('recommendedArtists'),
      songList: document.getElementById('songList'),
      albumSearchResults: document.getElementById('albumSearchResults'),
      artistSearchResults: document.getElementById('artistSearchResults'),
      userPlaylists: document.getElementById('userPlaylists'),
      historyList: document.getElementById('historyList'),
      queueSidebar: document.getElementById('queueSidebar'),
      queueBtn: document.getElementById('queueBtn'),
      queueListContainer: document.getElementById('queueListContainer'),
      savedPlaylistsContainer: document.getElementById('savedPlaylistsContainer'),
      nowPlayingScreen: document.getElementById('nowPlayingScreen'),
      nowPlayingArt: document.getElementById('nowPlayingArt'),
      nowPlayingTitle: document.getElementById('nowPlayingTitle'),
      nowPlayingArtist: document.getElementById('nowPlayingArtist'),
      nowPlayingProgressBar: document.getElementById('nowPlayingProgressBar'),
      nowPlayingCurrentTime: document.getElementById('nowPlayingCurrentTime'),
      nowPlayingTotalDuration: document.getElementById('nowPlayingTotalDuration'),
      nowPlayingControls: document.getElementById('nowPlayingControls'),
      nowPlayingPlayPauseIcon: document.getElementById('nowPlayingPlayPauseIcon'),
      nowPlayingShuffleBtn: document.getElementById('nowPlayingShuffleBtn'),
      nowPlayingRepeatBtn: document.getElementById('nowPlayingRepeatBtn'),
      nowPlayingRepeatIcon: document.getElementById('nowPlayingRepeatIcon'),
      favouriteSongsList: document.getElementById('favouriteSongsList'),
      likeBtn: document.getElementById('likeBtn'),
      timelineList: document.getElementById('timelineList'),
      playlistDetailsHeader: document.getElementById('playlistDetailsHeader'),
      playlistSongs: document.getElementById('playlistSongs'),
      albumDetailsHeader: document.getElementById('albumDetailsHeader'),
      albumSongs: document.getElementById('albumSongs'),
      artistDetailsHeader: document.getElementById('artistDetailsHeader'),
      artistTopSongs: document.getElementById('artistTopSongs'),
      audioQuality: document.getElementById('audioQuality'),
      notificationsToggle: document.getElementById('notificationsToggle'),
      endlessQueueToggle: document.getElementById('endlessQueueToggle'),
      dynamicThemeToggle: document.getElementById('dynamicThemeToggle'),
      repeatIcon: document.getElementById('repeatIcon'),
    };

    // Bind event listeners
    this.ui.audioPlayer.addEventListener('timeupdate', () => this.player.updateProgressBar());
    this.ui.audioPlayer.addEventListener('ended', () => this.player.handleSongEnd());
    this.ui.audioPlayer.addEventListener('loadedmetadata', () => {
        // Update duration once metadata is loaded
        this.player.updateProgressBar();
    });
    this.ui.progressBar.addEventListener('input', () => this.player.seek());
    this.ui.searchBar.addEventListener('keypress', e => { if (e.key === "Enter") this.navigation.triggerSearch(); });
    this.ui.searchBar.addEventListener('input', () => this.utils.debounce(this.navigation.showSearchSuggestions, 300)());
    document.addEventListener('click', (e) => { if (!e.target.closest('.search-input-container')) this.ui.searchSuggestions.classList.remove('active'); });
    this.ui.nowPlayingProgressBar.addEventListener('input', () => this.player.seek(true));
    window.addEventListener('beforeunload', () => this.utils.savePlaybackState());
    this.ui.audioQuality.addEventListener('change', (e) => this.utils.setAudioQuality(e.target.value));
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            header.parentElement.classList.toggle('active');
        });
    });

    // Use event delegation for marquee effect and infinite scroll
    this.ui.mainContent.addEventListener('mouseover', this.utils.handleMarquee);
    this.ui.mainContent.addEventListener('mouseout', this.utils.handleMarquee);
    this.ui.mainContent.addEventListener('scroll', (e) => {
        if (e.target.id === 'songList') {
            this.utils.handleInfiniteScroll(e.target);
        }
    });

    // Load initial state
    this.utils.loadTheme();
    this.utils.loadState();
    this.utils.applyPlaybackState();
    this.navigation.showSection('discover');
  },

  render: {
    _escape(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },
    _getImageUrl(imageArray) {
      return imageArray?.[2]?.url || imageArray?.[1]?.url || imageArray?.[0]?.url || 'default_cover.jpg';
    }, // Added missing comma
    _renderMessage(container, message, type = 'loading') {
      container.innerHTML = `<div class="${type}">${message}</div>`;
    },
    songCard(song, options = { playOnly: false }) {
      const div = document.createElement('div');
      div.className = 'song';

      const img = document.createElement('img');
      img.src = this._getImageUrl(song.image);
      img.alt = this._escape(song.title);
      img.onerror = () => { img.src = 'default_cover.jpg'; };

      const infoDiv = document.createElement('div');
      const strong = document.createElement('strong');
      const span = document.createElement('span');
      span.textContent = this._escape(song.name || song.title);
      strong.appendChild(span);
      const small = document.createElement('small');
      small.textContent = this._escape(song.primaryArtists || song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist');
      infoDiv.append(strong, small);

      const durationSpan = document.createElement('span');
      durationSpan.className = 'song-duration';
      durationSpan.textContent = Musify.player.formatTime(song.duration || 0);
      const optionsBtn = this._createButton('options-btn', `Musify.utils.showSongContextMenu(event, '${song.id}')`, 'More options', 'fas fa-ellipsis-v');
      const playBtn = this._createButton('play-btn', `Musify.player.playSongFromCard(event, '${song.id}')`, `Play ${song.title}`, 'fas fa-play');
      const removeFromQueueBtn = this._createButton('remove-from-queue-btn', `Musify.utils.removeFromQueue('${song.id}')`, 'Remove from queue', 'fas fa-times');

      div.append(img, infoDiv, durationSpan, optionsBtn, playBtn, removeFromQueueBtn);
      return div;
    },
    playlistCard(pl) {
      const div = document.createElement('div');
      div.className = 'playlist';

      // If it's a user playlist with no songs, show a placeholder icon instead of an image.
      const isNewUserPlaylist = pl.id.startsWith('user_') && (!pl.songs || pl.songs.length === 0);
      const imageContent = isNewUserPlaylist
        ? `<div class="playlist-placeholder"><i class="fas fa-music"></i></div>`
        : `<img src="${this._getImageUrl(pl.image)}" alt="${this._escape(pl.name || pl.title)}" onerror="this.src='default_cover.jpg'" loading="lazy"/>`;

      div.innerHTML = ` 
        ${imageContent}
        <div><strong><span>${this._escape(pl.name || pl.title)}</span></strong></div>
        <button onclick="${
          pl.id.startsWith('user_')
            ? `Musify.utils.showPlaylistContextMenu(event, '${pl.id}')`
            : `Musify.navigation.showPlaylist(event, '${pl.id}', true)`
        }" title="${
          pl.id.startsWith('user_') ? 'More options' : 'View playlist'
        }"><i class="fas fa-ellipsis-h"></i></button>
      `;
      if (!pl.id.startsWith('user_')) div.onclick = (e) => Musify.navigation.showPlaylist(e, pl.id, false);
      return div;
    },
    albumCard(album) {
      const div = document.createElement('div');
      div.className = 'album';
      div.innerHTML = ` 
        <img src="${this._getImageUrl(album.image)}" alt="${this._escape(album.name || album.title)}" onerror="this.src='default_cover.jpg'" loading="lazy"/>
        <div><strong><span>${this._escape(album.name || album.title)}</span></strong></div>
        <small>${this._escape(album.primaryArtists || 'Various Artists')}</small>
        <button onclick="Musify.navigation.showAlbum('${album.id}')" title="View Album"><i class="fas fa-info-circle"></i></button>
      `;
      return div;
    },
    timelineCard(artist) {
      const div = document.createElement('div');
      div.className = 'artist';
      div.innerHTML = `
        <img src="${this._getImageUrl(artist.image)}" alt="${this._escape(artist.title)}" onerror="this.src='default_artist.jpg'" loading="lazy"/>
        <div><strong><span>${this._escape(artist.name || artist.title)}</span></strong><small>${artist.description || artist.role || 'Artist'}</small></div>
        <button onclick="Musify.navigation.showArtist(event, '${artist.id}')" title="View artist"><i class="fas fa-info-circle"></i></button>
      `;
      div.onclick = (e) => Musify.navigation.showArtist(e, artist.id);
      return div;
    },
    createPlaylistCard() {
        const div = document.createElement('div');
        div.className = 'album'; // Reuse album card styling
        div.style.cursor = 'pointer';
        div.onclick = () => Musify.navigation.createNewPlaylist();
        div.innerHTML = `
            <div class="add-new-playlist" style="height: 160px; width: 160px; border: 2px dashed var(--glass-border); border-radius: 12px;">
                <i class="fas fa-plus" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <span>Create Playlist</span>
            </div>
        `;
        return div;
    },
    _createButton(className, onclick, title, iconClass) {
        const button = document.createElement('button');
        button.className = className;
        button.setAttribute('onclick', onclick);
        button.title = title;
        const icon = document.createElement('i');
        icon.className = iconClass;
        button.appendChild(icon);
        return button;
    },
    populate(container, items, cardRenderer, messageIfEmpty, errorMessage) {
      if (!items) {
        this._renderMessage(container, errorMessage, 'error');
        return;
      }
      if (!items || items.length === 0) {
        this._renderMessage(container, messageIfEmpty, 'loading'); // 'loading' class has the right styles
        return;
      }
      container.innerHTML = '';
      items.forEach(item => container.appendChild(cardRenderer.call(Musify.render, item)));
    },
    append(container, items, cardRenderer) {
      const loading = container.querySelector('.loading, .error');
      if (loading) loading.remove();
      items.forEach(item => container.appendChild(cardRenderer(item)));
    },
    playlistHeader(playlist) {
        const header = Musify.ui.playlistDetailsHeader;
        header.innerHTML = `
            <button class="nav-btn" onclick="Musify.navigation.goBack()"><i class="fas fa-arrow-left"></i> Back</button>
            <div class="playlist-header-container">
                <img src="${this._getImageUrl(playlist.image)}" alt="${this._escape(playlist.name)}"/>
                <div class="playlist-header-text">
                    <h1>${this._escape(playlist.name)}</h1>
                    <p>${playlist.songCount} songs &bull; ${playlist.followerCount} followers</p>
                    <p class="description">${this._escape(playlist.description || '')}</p>
                    <button class="nav-btn active" onclick="Musify.player.playFromQueue(Musify.state.songQueue[0].id)"><i class="fas fa-play"></i> Play All</button>
                </div>
            </div>
        `;
    },
    albumHeader(album) {
        const header = Musify.ui.albumDetailsHeader;
        header.innerHTML = `
            <button class="nav-btn" onclick="Musify.navigation.goBack()"><i class="fas fa-arrow-left"></i> Back</button>
            <div class="playlist-header-container">
                <img src="${this._getImageUrl(album.image)}" alt="${this._escape(album.name)}"/>
                <div class="playlist-header-text">
                    <h1>${this._escape(album.name)}</h1>
                    <p>${album.songCount} songs &bull; Released: ${album.year}</p>
                    <p>${this._escape(album.artists?.primary?.map(a => a.name).join(', ') || '')}</p>
                    <button class="nav-btn active" onclick="Musify.player.playFromQueue(Musify.state.songQueue[0].id)"><i class="fas fa-play"></i> Play All</button>
                </div>
            </div>
        `;
    },
    artistHeader(artist) {
        const header = Musify.ui.artistDetailsHeader;
        header.innerHTML = `
            <button class="nav-btn" onclick="Musify.navigation.goBack()"><i class="fas fa-arrow-left"></i> Back</button>
            <div class="playlist-header-container">
                <img src="${this._getImageUrl(artist.image)}" alt="${this._escape(artist.name)}" style="border-radius: 50%;"/>
                <div class="playlist-header-text">
                    <h1>${this._escape(artist.name)}</h1>
                    <p>${artist.fanCount} followers</p>
                    <p class="description">${artist.bio ? this._escape(artist.bio[0]?.text || '') : ''}</p>
                    <button class="nav-btn active" onclick="Musify.player.playFromQueue(Musify.state.songQueue[0].id)"><i class="fas fa-play"></i> Play Top Songs</button>
                </div>
            </div>
        `;
    }
  },

  player: {
    playSongFromCard(event, songId) {
        event.stopPropagation(); // Prevent card's parent click events
        const card = event.target.closest('.song');
        if (!card) return;
        const songListContainer = card.parentElement;

        // Determine the source list of songs
        let sourceList;
        switch (songListContainer.id) {
            case 'recommendedSongs':
                sourceList = Musify.state.discover.songs || [];
                break;
            case 'historyList':
                sourceList = Musify.state.history;
                break;
            case 'favouriteSongsList':
                sourceList = Musify.state.favourites;
                break;
            default: // Includes search, playlist, album, artist, and queue views
                sourceList = Musify.state.songQueue;
        }

        if (sourceList && sourceList.length > 0) {
            Musify.state.songQueue = sourceList;
        }
        this.playFromQueue(songId);
    },
    playFromQueue(songId) {
      const index = Musify.state.songQueue.findIndex(s => s.id === songId);
      if (index !== -1) {
        Musify.state.currentSongIndex = index;
        this.playCurrent();
      }
    },
    async _getPlayableSong(songFromQueue) {
        // If the song from the queue doesn't have a downloadUrl, fetch the full details.
        if (!songFromQueue.downloadUrl || songFromQueue.downloadUrl.length === 0) {
            try {
                const fullDetails = await Musify.api.getSongDetails(songFromQueue.id);
                const songDetails = fullDetails?.data?.[0];
                if (songDetails) {
                    // Update the queue with full details for future use
                    const queueIndex = Musify.state.songQueue.findIndex(s => s.id === songDetails.id);
                    if (queueIndex > -1) {
                        Musify.state.songQueue[queueIndex] = songDetails;
                    }
                    return songDetails;
                }
            } catch (error) {
                console.error(`Failed to fetch details for song ID ${songFromQueue.id}`, error);
                return songFromQueue; // Return original song to handle error downstream
            }
        }
        return songFromQueue; // Already has details
    },

    async playCurrent() {
      const state = Musify.state;
      if (state.currentSongIndex < 0 || state.currentSongIndex >= state.songQueue.length) return;

      const song = state.songQueue[state.currentSongIndex];
      this.updateInfo(song);
      Musify.ui.playPauseIcon.className = 'fas fa-spinner fa-spin';

      const songDetails = await this._getPlayableSong(song);

      const allPlayIcons = [Musify.ui.playPauseIcon, Musify.ui.mobilePlayPauseIcon, Musify.ui.nowPlayingPlayPauseIcon];

      if (songDetails && Array.isArray(songDetails.downloadUrl) && songDetails.downloadUrl.length > 0) {
        const quality = Musify.state.audioQuality;
        const bestQuality = songDetails.downloadUrl.find(u => u.quality === quality) || songDetails.downloadUrl.at(-1);
        Musify.ui.audioPlayer.src = bestQuality.url || bestQuality.link;
        Musify.ui.audioPlayer.load(); // Explicitly load the new source

        try {
          await Musify.ui.audioPlayer.play();
          state.isPlaying = true;
          allPlayIcons.forEach(icon => icon.className = 'fas fa-pause');
          Musify.ui.likeBtn.classList.toggle('active', Musify.utils.isFavourited(song.id));
          if (Musify.ui.queueSidebar.classList.contains('active')) Musify.navigation.loadQueue(); // Refresh queue view
          this.addToHistory(songDetails);
          this.updateMediaSession(songDetails);
        } catch (e) {
          state.isPlaying = false;
          allPlayIcons.forEach(icon => icon.className = 'fas fa-play');
          console.error("Playback failed", e);
        }
      } else {
        allPlayIcons.forEach(icon => icon.className = 'fas fa-play');
        console.error('Song object from queue is missing downloadUrl:', songDetails);
        Musify.utils.showNotification(`Unable to get a playable link for "${song.name || song.title}".`, 'error');
      }
    },
    updateInfo(song) {
      Musify.ui.currentSongTitle.textContent = song.name || song.title || 'Unknown Title';
      Musify.ui.currentSongArtist.textContent = song.primaryArtists || song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist';
      Musify.ui.currentSongImg.src = Musify.render._getImageUrl(song.image);
      Musify.ui.likeBtn.classList.toggle('active', Musify.utils.isFavourited(song.id));
      if (Musify.ui.queueSidebar.classList.contains('active')) Musify.navigation.loadQueue(); // Refresh queue view
      Musify.utils.updatePlayerTheme(Musify.render._getImageUrl(song.image));
    },
    updateMediaSession(song) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.name || song.title,
                artist: song.primaryArtists || song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist',
                album: song.album?.name || '',
                artwork: song.image.map(img => ({ src: img.url, sizes: `${img.quality.split('x')[0]}x${img.quality.split('x')[1]}`, type: 'image/jpeg' }))
            });

            navigator.mediaSession.setActionHandler('play', () => this.togglePlayPause());
            navigator.mediaSession.setActionHandler('pause', () => this.togglePlayPause());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
        }
    },
    togglePlayPause() {
      const { audioPlayer, playPauseIcon, mobilePlayPauseIcon, nowPlayingPlayPauseIcon } = Musify.ui;
      const allPlayIcons = [playPauseIcon, mobilePlayPauseIcon, nowPlayingPlayPauseIcon];
      if (!audioPlayer.src && Musify.state.songQueue.length > 0) {
        // visualizer.init() is now called in playCurrent to be more robust
        Musify.state.currentSongIndex = 0;
        this.playCurrent();
        return;
      }
      if (Musify.state.isPlaying) {
        audioPlayer.pause();
        allPlayIcons.forEach(icon => icon.classList.replace('fa-pause', 'fa-play'));
      } else {
        audioPlayer.play();
        allPlayIcons.forEach(icon => icon.classList.replace('fa-play', 'fa-pause'));
      }
      Musify.state.isPlaying = !Musify.state.isPlaying;
    },
    next() {
      const state = Musify.state;
      if (state.songQueue.length === 0) return;
      if (state.isShuffle) {
        state.currentSongIndex = Math.floor(Math.random() * state.songQueue.length);
      } else {
        state.currentSongIndex = (state.currentSongIndex + 1) % state.songQueue.length;
      }
      this.playCurrent();
    },
    prev() {
      const state = Musify.state;
      if (state.songQueue.length === 0) return;
      if (state.isShuffle) {
        state.currentSongIndex = Math.floor(Math.random() * state.songQueue.length);
      } else {
        state.currentSongIndex = (state.currentSongIndex - 1 + state.songQueue.length) % state.songQueue.length;
      }
      this.playCurrent();
    },
    toggleShuffle() {
      Musify.state.isShuffle = !Musify.state.isShuffle;
      Musify.ui.shuffleBtn.classList.toggle('active', Musify.state.isShuffle);
      Musify.ui.nowPlayingShuffleBtn.classList.toggle('active', Musify.state.isShuffle);
      Musify.ui.shuffleBtn.title = `Shuffle ${Musify.state.isShuffle ? 'On' : 'Off'}`;
      Musify.ui.nowPlayingShuffleBtn.title = `Shuffle ${Musify.state.isShuffle ? 'On' : 'Off'}`;
    },
    toggleRepeat() {
      const { repeatBtn, repeatIcon, nowPlayingRepeatBtn, nowPlayingRepeatIcon } = Musify.ui;
      const state = Musify.state;
      if (state.repeatMode === 'off') {
        state.repeatMode = 'all';
        repeatBtn.classList.add('active');
        nowPlayingRepeatBtn.classList.add('active');
        repeatBtn.title = 'Repeat All';
        repeatIcon.className = 'fas fa-repeat';
        nowPlayingRepeatIcon.className = 'fas fa-repeat';
      } else if (state.repeatMode === 'all') {
        state.repeatMode = 'one';
        repeatIcon.className = 'fas fa-1';
        nowPlayingRepeatIcon.className = 'fas fa-1';
        repeatBtn.title = 'Repeat One';
      } else {
        state.repeatMode = 'off';
        repeatBtn.classList.remove('active');
        nowPlayingRepeatBtn.classList.remove('active');
        repeatIcon.className = 'fas fa-repeat';
        nowPlayingRepeatIcon.className = 'fas fa-repeat';
        repeatBtn.title = 'Repeat Off';
      }
    },
    updateProgressBar() {
      const { audioPlayer, progressBar, compactProgressBar, currentTime, totalDuration, nowPlayingProgressBar, nowPlayingCurrentTime, nowPlayingTotalDuration } = Musify.ui;
      if (!audioPlayer.duration) return;
      const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
      const safeProgress = isNaN(progress) ? 0 : progress;
      progressBar.value = safeProgress;
      nowPlayingProgressBar.value = safeProgress;
      compactProgressBar.style.width = `${safeProgress}%`;
      currentTime.textContent = this.formatTime(audioPlayer.currentTime);
      nowPlayingCurrentTime.textContent = this.formatTime(audioPlayer.currentTime);
      totalDuration.textContent = this.formatTime(audioPlayer.duration);
      nowPlayingTotalDuration.textContent = this.formatTime(audioPlayer.duration);
    },
    seek(fromNowPlaying = false) {
      const { audioPlayer, progressBar, nowPlayingProgressBar } = Musify.ui;
      const sourceProgressBar = fromNowPlaying ? nowPlayingProgressBar : progressBar;
      if (!audioPlayer.duration) return;
      audioPlayer.currentTime = (sourceProgressBar.value / 100) * audioPlayer.duration;
    },
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    },
    handleSongEnd() {
      if (Musify.state.repeatMode === 'one') {
        Musify.ui.audioPlayer.currentTime = 0;
        Musify.ui.audioPlayer.play();
      } else {
        this.next();
      }

      // Check for endless queue
      const state = Musify.state;
      if (state.endlessQueue && state.currentSongIndex === state.songQueue.length - 1) {
          Musify.utils.startRadio(state.songQueue[state.currentSongIndex].id, true); // Start radio without replacing queue
      }
    },
    playFromHistory(songId) {
        // Set the history as the current queue and play the selected song
        Musify.state.songQueue = Musify.state.history;
        const index = Musify.state.songQueue.findIndex(s => s.id === songId);
        if (index !== -1) this.playFromQueue(songId);
    },
    addToHistory(song) {
        // Add to history only if it's not the last song added
        if (Musify.state.history[0]?.id !== song.id) {
            Musify.state.history.unshift(song);
            if (Musify.state.history.length > 50) { // Limit history size
                Musify.state.history.pop();
            }
            localStorage.setItem('musify_history', JSON.stringify(Musify.state.history));
        }
    }
  },

  navigation: {
    showSection(sectionId) {
      const { navigation } = Musify.state;
      if (navigation.currentSection !== sectionId) {
        navigation.previousSection = navigation.currentSection;
        navigation.currentSection = sectionId;
      }
      Musify.ui.contentSections.forEach(s => s.classList.toggle('active', s.id === sectionId));
      document.querySelectorAll('.nav-btn').forEach(btn => {
        const btnSection = btn.dataset.section;
        btn.classList.toggle('active', btnSection === sectionId);
      });
      Musify.ui.mainSearchBar.style.display = (sectionId === 'search') ? 'flex' : 'none';
      const loadAction = {
        'discover': Musify.navigation.loadDiscover,
        'search': Musify.navigation.loadSongs,
        'library': Musify.navigation.loadLibrary,
        'favourites': Musify.navigation.loadFavourites,
        'saved-playlists': Musify.navigation.loadSavedPlaylists,
        'downloads': () => {}, // Placeholder
        'history': Musify.navigation.loadHistory,
        'timeline': Musify.navigation.loadTimeline,
      }[sectionId];
      if (loadAction) loadAction();
    },
    goBack() {
        // If we are in a detail view, go back to the previous main section.
        const current = Musify.state.navigation.currentSection;
        if (current.includes('-details')) {
            this.showSection(Musify.state.navigation.previousSection || 'discover');
        } else {
            this.showSection('discover');
        }
    },


    async loadDiscover() {
      const { recommendedSongs, recommendedPlaylists, recommendedArtists } = Musify.ui;
      Musify.render._renderMessage(recommendedSongs, 'Loading Recommended Songs...');
      Musify.render._renderMessage(recommendedPlaylists, 'Loading Recommended Playlists...');
      Musify.render._renderMessage(recommendedArtists, 'Loading Recommended Artists...');

      const [songData, playlistData, artistData] = await Promise.all([
        Musify.api._fetch('/search/songs?query=latest hits&limit=20'),
        Musify.api._fetch('/search/playlists?query=top playlists&limit=20'),
        Musify.api._fetch('/search/artists?query=popular artists&limit=20')
      ]);

      // Store the fetched data in the state for the player to use
      Musify.state.discover = {
          songs: songData?.data?.results || [],
          playlists: playlistData?.data?.results || [],
          artists: artistData?.data?.results || [],
      };

      // Populate the new "Recommended" sections
      Musify.render.populate(recommendedSongs, Musify.state.discover.songs, Musify.render.songCard, 'No recommended songs found.', 'Failed to load songs.');
      Musify.render.populate(recommendedPlaylists, Musify.state.discover.playlists, Musify.render.playlistCard, 'No recommended playlists found.', 'Failed to load playlists.');
      Musify.render.populate(recommendedArtists, Musify.state.discover.artists, Musify.render.timelineCard, 'No recommended artists found.', 'Failed to load artists.');
    },

    loadSongs() {
      // This function is called when switching to the search tab.
      // We'll just show the initial prompt and wait for the user to search.
      document.getElementById('searchResultsContainer').style.display = 'none';
      const searchSection = document.getElementById('search');
      if (!searchSection.querySelector('.initial-prompt')) searchSection.insertAdjacentHTML('beforeend', '<div class="initial-prompt loading">Use the search bar to find songs, albums, and artists.</div>');
    },

    triggerSearch() {
      if (Musify.ui.searchSuggestions) Musify.ui.searchSuggestions.classList.remove('active');
      this.search(true);
    },

    async search(isNewSearch = false) {
      const { search } = Musify.state;
      const { songList, albumSearchResults, artistSearchResults } = Musify.ui;
      const query = Musify.ui.searchBar.value.trim();

      if (search.isLoading || !query) {
        if (!query && isNewSearch && Musify.state.navigation.currentSection === 'search') {
            // If the search is empty, hide the results and show a prompt inside the search section.
            document.getElementById('searchResultsContainer').style.display = 'none';
            const searchSection = document.getElementById('search');
            // Use a placeholder div to avoid clearing the whole section's structure
            if (!searchSection.querySelector('.initial-prompt')) searchSection.insertAdjacentHTML('beforeend', '<div class="initial-prompt loading">Use the search bar to find songs, albums, and artists.</div>');
        }
        return;
      }

      if (isNewSearch) {
        search.currentPage = 1;
        search.query = query;
        Musify.state.songQueue = [];
        const initialPrompt = document.querySelector('#search .initial-prompt');
        if (initialPrompt) initialPrompt.remove();
        document.getElementById('searchResultsContainer').style.display = 'block';
        songList.innerHTML = '';
        albumSearchResults.innerHTML = '';
        artistSearchResults.innerHTML = '';
        Musify.render._renderMessage(songList, 'Searching for songs...');
        Musify.render._renderMessage(albumSearchResults, 'Searching for albums...');
        Musify.render._renderMessage(artistSearchResults, 'Searching for artists...');
      } else {
        search.currentPage++;
      }

      search.isLoading = true;

      if (isNewSearch) {
        // On a new search, fetch all categories
        const [songData, albumData, artistData] = await Promise.all([
          Musify.api._fetch(`/search/songs?query=${search.query}&page=1&limit=20`),
          Musify.api._fetch(`/search/albums?query=${search.query}&page=1&limit=12`),
          Musify.api._fetch(`/search/artists?query=${search.query}&page=1&limit=12`)
        ]);

        // Populate songs
        Musify.render.populate(songList, songData?.data?.results, (s) => Musify.render.songCard(s, { playOnly: true }), 'No songs found.', 'Song search failed.');
        if (songData?.data?.results) Musify.state.songQueue = songData.data.results;

        // Populate albums
        Musify.render.populate(albumSearchResults, albumData?.data?.results, Musify.render.albumCard, 'No albums found.', 'Album search failed.');

        // Populate artists
        Musify.render.populate(artistSearchResults, artistData?.data?.results, Musify.render.timelineCard, 'No artists found.', 'Artist search failed.');

      } else {
        // On infinite scroll, only fetch more songs
        const songData = await Musify.api._fetch(`/search/songs?query=${search.query}&page=${search.currentPage}&limit=20`);
        if (songData?.data?.results) {
            Musify.state.songQueue.push(...songData.data.results);
            Musify.render.append(songList, songData.data.results, (s) => Musify.render.songCard(s));
        }
      }

      search.isLoading = false;
    },

    async showSearchSuggestions() {
       const query = Musify.ui.searchBar.value.trim();
      const container = Musify.ui.searchSuggestions;
      if (query.length < 2) {
          container.classList.remove('active');
          return;
      }
      const data = await Musify.api.searchAll(query);
      const suggestions = [];

      // Add top query, songs, albums, and artists
      if (data?.data?.topQuery?.results) suggestions.push(...data.data.topQuery.results.slice(0, 1));
      if (data?.data?.songs?.results) suggestions.push(...data.data.songs.results.slice(0, 3));
      if (data?.data?.albums?.results) suggestions.push(...data.data.albums.results.slice(0, 2));
      if (data?.data?.artists?.results) suggestions.push(...data.data.artists.results.slice(0, 2));

      // Deduplicate and limit
      const uniqueSuggestions = Array.from(new Map(suggestions.map(item => [item.id, item])).values()).slice(0, 8);

      if (uniqueSuggestions.length === 0) {
          container.classList.remove('active');
          return;
      }

      container.innerHTML = uniqueSuggestions.map(s => {
          let iconClass = 'fa-search';
          if (s.type === 'song') iconClass = 'fa-music';
          if (s.type === 'album') iconClass = 'fa-compact-disc';
          if (s.type === 'artist') iconClass = 'fa-user';
          const onclickAction = s.type === 'song' ? `Musify.player.playFromQueue('${s.id}')` : s.type === 'album' ? `Musify.navigation.showAlbum('${s.id}')` : s.type === 'artist' ? `Musify.navigation.showArtist('${s.id}')` : `Musify.navigation.selectSuggestion('${s.title}')`;
          return `<div class="suggestion-item" onclick="${onclickAction}"><i class="fas ${iconClass}"></i> ${s.title}</div>`;
      }).join('');
      container.classList.toggle('active', uniqueSuggestions.length > 0);
    },
    selectSuggestion(query) {
        Musify.ui.searchBar.value = query;
        this.triggerSearch();
    },
    loadLibrary() {
        const { userPlaylists } = Musify.ui;
        userPlaylists.innerHTML = ''; // Clear existing content
        
        // Render existing user playlists
        Musify.state.userPlaylists.forEach(p => {
            userPlaylists.appendChild(Musify.render.playlistCard(p));
        });

        // Always show the "Create Playlist" card
        userPlaylists.appendChild(Musify.render.createPlaylistCard());
    },

    createNewPlaylist() {
        const playlistName = prompt("Enter a name for your new playlist:", "My Playlist");
        if (playlistName) {
            const newPlaylist = { id: `user_${Date.now()}`, name: playlistName, songs: [], image: null };
            Musify.state.userPlaylists.push(newPlaylist);
            Musify.utils.saveUserPlaylists();
            this.loadLibrary(); // Refresh the library view
        }
    },

    loadHistory() {
        const { historyList } = Musify.ui;
        Musify.render.populate(historyList, Musify.state.history, (s) => Musify.render.songCard(s, { playFromHistory: true }), 'Your listening history is empty.', 'Could not load history.');
    },

    loadFavourites() {
        const { favouriteSongsList } = Musify.ui;
        Musify.render.populate(favouriteSongsList, Musify.state.favourites, Musify.render.songCard, 'You have no favourite songs yet. Click the heart icon on a song to add it!', 'Could not load favourites.');
    },

    loadSavedPlaylists() {
        const { savedPlaylistsContainer } = Musify.ui;
        Musify.render.populate(savedPlaylistsContainer, Musify.state.savedPlaylists, Musify.render.playlistCard, 'You have no saved playlists yet. Find a playlist and save it!', 'Could not load saved playlists.');
    },

    toggleNowPlaying(show) {
        const { nowPlayingScreen, nowPlayingArt, nowPlayingTitle, nowPlayingArtist, nowPlayingLikeBtn, nowPlayingQueueBtn } = Musify.ui;
        if (show) {
            const song = Musify.state.songQueue[Musify.state.currentSongIndex];
            if (!song) return; // Don't open if no song is playing
            nowPlayingArt.src = Musify.render._getImageUrl(song.image);
            nowPlayingTitle.textContent = song.name || song.title;
            nowPlayingArtist.textContent = song.primaryArtists || 'Unknown Artist';
            nowPlayingLikeBtn.classList.toggle('active', Musify.utils.isFavourited(song.id));
            nowPlayingQueueBtn.classList.toggle('active', Musify.ui.queueSidebar.classList.contains('active'));
        }
        nowPlayingScreen.classList.toggle('active', show);
    },

    toggleQueue() {
        const isActive = Musify.ui.queueSidebar.classList.toggle('active');
        Musify.ui.queueBtn.classList.toggle('active', isActive);
        if (Musify.ui.queueSidebar.classList.contains('active')) this.loadQueue();
    },

    loadQueue() {
        const { queueListContainer } = Musify.ui;
        const { songQueue, currentSongIndex } = Musify.state;
        queueListContainer.innerHTML = ''; // Clear previous content

        if (songQueue.length === 0) {
            queueListContainer.innerHTML = `<div class="loading">The queue is empty.</div>`;
            return;
        }

        // Now Playing section
        const nowPlayingHeader = document.createElement('h3');
        nowPlayingHeader.textContent = 'Now Playing';
        const nowPlayingSong = this.render.songCard(songQueue[currentSongIndex]);
        nowPlayingSong.classList.add('is-playing');
        nowPlayingSong.querySelector('.remove-from-queue-btn').style.display = 'none'; // Can't remove current song
        queueListContainer.append(nowPlayingHeader, nowPlayingSong);

        // Next Up section
        const nextUpSongs = songQueue.slice(currentSongIndex + 1);
        if (nextUpSongs.length > 0) {
            const nextUpHeader = document.createElement('h3');
            nextUpHeader.textContent = 'Next Up';
            const nextUpList = document.createElement('div');
            nextUpList.className = 'song-list';
            
            nextUpSongs.forEach((song, index) => {
                const songCard = this.render.songCard(song);
                songCard.draggable = true;
                songCard.dataset.queueIndex = currentSongIndex + 1 + index; // Store original index
                nextUpList.appendChild(songCard);
            });

            // Add drag and drop listeners
            nextUpList.addEventListener('dragstart', Musify.utils.handleDragStart);
            nextUpList.addEventListener('dragover', Musify.utils.handleDragOver);
            nextUpList.addEventListener('drop', Musify.utils.handleDrop);

            queueListContainer.append(nextUpHeader, nextUpList);
        }
    },

    async loadTimeline() {
      const { timelineList } = Musify.ui;
      Musify.render._renderMessage(timelineList, 'Loading top artists...');
      // The modules endpoint doesn't reliably contain artists, so we'll do a general search.
      const data = await Musify.api._fetch(`/search/artists?query=top`);
      Musify.render.populate(timelineList, data?.data?.results, Musify.render.timelineCard, 'No top artists found.', 'Failed to load artists.');
    },

    async showPlaylist(event, playlistId, buttonClicked = false) {
        if (event && event.target.closest('button') && !buttonClicked) return;
        this.showSection('playlist-details');
        const { playlistDetailsHeader, playlistSongs } = Musify.ui;
        Musify.render._renderMessage(playlistDetailsHeader, '');
        Musify.render._renderMessage(playlistSongs, 'Loading playlist songs...');

        // Check if it's a user-created playlist
        if (playlistId.startsWith('user_')) {
            const userPlaylist = Musify.state.userPlaylists.find(p => p.id === playlistId);
            if (userPlaylist) {
                // Manually construct a data object that matches the API structure
                const data = { ...userPlaylist, songCount: userPlaylist.songs.length, followerCount: 0, description: 'A playlist created by you.' };
                Musify.render.playlistHeader(data);
                Musify.render.populate(playlistSongs, data.songs, Musify.render.songCard, 'This playlist is empty. Add songs via the context menu!', 'Could not load songs.');
                Musify.state.songQueue = data.songs;
            } else {
                Musify.render._renderMessage(playlistSongs, 'Could not find this playlist.', 'error');
            }
            return;
        }

        // Otherwise, fetch from the API
        const playlistData = await Musify.api.getPlaylistDetails(playlistId);
        const data = playlistData?.data;
        if (data && data.songs) {
            Musify.render.playlistHeader(data);
            Musify.render.populate(playlistSongs, data.songs, Musify.render.songCard, 'This playlist is empty.', 'Could not load songs.');
            Musify.state.songQueue = data.songs;
        } else {
            Musify.render._renderMessage(playlistSongs, 'Failed to load playlist.', 'error');
        }
    },

    async showAlbum(albumId) {
        this.showSection('album-details');
        const { albumDetailsHeader, albumSongs } = Musify.ui;
        Musify.render._renderMessage(albumDetailsHeader, '');
        Musify.render._renderMessage(albumSongs, 'Loading album songs...');

        const albumData = await Musify.api.getAlbumDetails(albumId);
        const data = albumData?.data;

        if (data) {
            // If the initial response doesn't contain all songs, fetch them separately.
            if (data.songs.length < data.songCount) {
                const albumSongsData = await Musify.api.getAlbumDetails(albumId);
                if (albumSongsData?.data?.songs) {
                    data.songs = albumSongsData.data.songs;
                }
            }
            Musify.render.albumHeader(data);
            Musify.render.populate(albumSongs, data.songs, Musify.render.songCard, 'This album is empty.', 'Could not load songs.');
            Musify.state.songQueue = data.songs;
        } else {
            Musify.render._renderMessage(albumSongs, 'Failed to load album.', 'error');
        }
    },

    async showPlaylist(event, playlistId) {
        if (event && event.target.tagName === 'BUTTON') {
            event.stopPropagation();
            return; // Don't navigate if a button inside the card was clicked
        }
        this.showSection('artist-details');
        const { artistDetailsHeader, artistTopSongs } = Musify.ui;
        Musify.render._renderMessage(artistDetailsHeader, '');
        Musify.render._renderMessage(artistTopSongs, 'Loading top songs...');

        const artistData = await Musify.api.getArtistDetails(artistId);
        const data = artistData?.data;

        if (data && data.topSongs) {
            Musify.render.artistHeader(data);
            Musify.render.populate(artistTopSongs, data.topSongs, Musify.render.songCard, 'No top songs found.', 'Could not load songs.');
            Musify.state.songQueue = data.topSongs;
        } else {
            Musify.render._renderMessage(artistTopSongs, 'Failed to load artist details.', 'error');
        }
    }
  },

  utils: {
    handleInfiniteScroll(element) {
      const { search } = Musify.state;
      if (element.clientHeight + element.scrollTop >= element.scrollHeight - 100) {
        if (!search.isLoading && Musify.state.songQueue.length < search.totalResults) {
          Musify.navigation.search(false);
        }
      }
    },
    handleMarquee(event) {
        const title = event.target.closest('.song, .playlist, .album, .artist')?.querySelector('strong');
        if (!title) return;
        const span = title.querySelector('span');
        if (!span) return;

        if (event.type === 'mouseover' && title.scrollWidth > title.clientWidth) {
            // Calculate duration based on text length for a consistent speed
            const duration = title.scrollWidth / 40; // Adjust 40 to control speed
            span.style.animation = `marquee ${duration}s linear 1s infinite`;
            span.classList.add('marquee');
        } else if (event.type === 'mouseout') {
            span.style.animation = '';
            span.classList.remove('marquee');
        }
    },
    showSongContextMenu(event, songId) {
        event.stopPropagation(); // Prevent card click
        this.removeContextMenu(); // Remove any existing menu

        const song = Musify.state.songQueue.find(s => s.id === songId) || Musify.state.history.find(s => s.id === songId) || Musify.state.favourites.find(s => s.id === songId);
        if (!song) return;

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        
        const isFavourited = this.isFavourited(songId);
        let playlistItems = '';
        if (Musify.state.userPlaylists.length > 0) {
            playlistItems = Musify.state.userPlaylists.map(p => `<li onclick="addSongToPlaylist('${songId}', '${p.id}')"><i class="fas fa-list"></i> Add to ${p.name}</li>`).join('');
        }

        menu.innerHTML = `
            <ul>
                <li onclick="Musify.utils.addToQueue('${songId}', true)"><i class="fas fa-arrow-up"></i> Play Next</li>
                <li onclick="Musify.utils.addToQueue('${songId}', false)"><i class="fas fa-arrow-down"></i> Add to Queue</li>
                <li class="separator"></li>
                <li onclick="Musify.utils.startRadio('${songId}')"><i class="fas fa-broadcast-tower"></i> Start Radio</li>
                <li onclick="Musify.utils.downloadSong('${songId}')"><i class="fas fa-download"></i> Download</li>
                ${playlistItems ? '<li class="separator"></li>' : ''}
                ${playlistItems}
                <li class="separator"></li>
                <li onclick="toggleFavourite('${songId}')">
                    <i class="fas fa-heart" style="color: ${isFavourited ? 'var(--accent)' : 'inherit'}"></i> 
                    ${isFavourited ? 'Remove from Favourites' : 'Add to Favourites'}
                </li>
                <li class="separator"></li>
                ${playlistItems}
            </ul>
        `;

        document.body.appendChild(menu);
        menu.style.top = `${event.pageY}px`;
        menu.style.left = `${event.pageX}px`;

        // Add a listener to close the menu when clicking elsewhere
        document.addEventListener('click', this.removeContextMenu, { once: true });
    },
    showPlaylistContextMenu(event, playlistId) {
        event.stopPropagation();
        this.removeContextMenu();

        const playlist = Musify.state.userPlaylists.find(p => p.id === playlistId);
        const isApiPlaylist = !playlistId.startsWith('user_');

        if (!playlist && !isApiPlaylist) {
            Musify.navigation.showPlaylist(playlistId);
            return;
        }

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        const saveOption = isApiPlaylist ? `<li onclick="Musify.utils.savePlaylist('${playlistId}')"><i class="fas fa-bookmark"></i> Save to Library</li>` : '';
        const deleteOption = playlist ? `<li onclick="Musify.utils.deletePlaylist('${playlistId}')"><i class="fas fa-trash"></i> Delete Playlist</li>` : '';
        menu.innerHTML = `
            <ul>
                <li onclick="Musify.navigation.showPlaylist('${playlistId}')"><i class="fas fa-eye"></i> View Playlist</li>
                ${saveOption ? `<li class="separator"></li>${saveOption}` : ''}
                ${deleteOption ? `<li class="separator"></li>${deleteOption}` : ''}
            </ul>
        `;
        document.body.appendChild(menu);
        menu.style.top = `${event.pageY}px`;
        menu.style.left = `${event.pageX}px`;

        document.addEventListener('click', this.removeContextMenu, { once: true });
    },
    deletePlaylist(playlistId) {
        const playlist = Musify.state.userPlaylists.find(p => p.id === playlistId);
        if (!playlist) return;

        if (confirm(`Delete "${playlist.name}"? This cannot be undone.`)) {
            Musify.state.userPlaylists = Musify.state.userPlaylists.filter(p => p.id !== playlistId);
            this.saveUserPlaylists();
            if (Musify.state.navigation.currentSection === 'library') Musify.navigation.loadLibrary();
        }
    },
    removeContextMenu() {
        const menu = document.querySelector('.context-menu');
        if (menu) menu.remove();
    },
    isFavourited(songId) {
        return Musify.state.favourites.some(s => s.id === songId);
    },
    toggleFavourite(songId) {
        const song = Musify.state.songQueue.find(s => s.id === songId) || Musify.state.history.find(s => s.id === songId) || Musify.state.favourites.find(s => s.id === songId);
        if (!song) return;

        if (this.isFavourited(songId)) {
            Musify.state.favourites = Musify.state.favourites.filter(s => s.id !== songId);
        } else {
            Musify.state.favourites.unshift(song);
        }
        this.saveFavourites();
        
        // Update UI if visible
        if (Musify.state.navigation.currentSection === 'favourites') Musify.navigation.loadFavourites();
        if (Musify.state.currentSongIndex > -1 && Musify.state.songQueue[Musify.state.currentSongIndex].id === songId) Musify.ui.likeBtn.classList.toggle('active');
    },
    updatePlayerTheme(imageUrl) {
      const resetTheme = () => {
          document.documentElement.style.setProperty('--dynamic-primary', 'var(--primary-default)');
          document.documentElement.style.setProperty('--dynamic-primary-light', 'var(--primary-light-default)');
          document.documentElement.style.setProperty('--dynamic-primary-dark', 'var(--primary-dark-default)');
      };

      if (!imageUrl || !window.ColorThief || !Musify.state.dynamicTheme) {
          resetTheme();
          return;
      }

      const img = new Image();
      img.crossOrigin = "Anonymous";
      // Use a CORS proxy if direct loading fails, but try direct first.
      img.src = imageUrl.replace(/^http:/, 'https');

      img.onload = () => {
          const colorThief = new ColorThief();
          try {
              const palette = colorThief.getPalette(img, 3);
              // Sort palette by luminance to get dark, primary, and light shades
              palette.sort((a, b) => (0.299*a[0] + 0.587*a[1] + 0.114*a[2]) - (0.299*b[0] + 0.587*b[1] + 0.114*b[2]));
              document.documentElement.style.setProperty('--dynamic-primary-dark', `rgb(${palette[0].join(',')})`);
              document.documentElement.style.setProperty('--dynamic-primary', `rgb(${palette[1].join(',')})`);
              document.documentElement.style.setProperty('--dynamic-primary-light', `rgb(${palette[2].join(',')})`);
            } catch (e) {
                console.error("ColorThief error:", e);
                resetTheme();
            }
        };
        img.onerror = () => {
            console.error("Failed to load image for dynamic theme:", img.src);
            resetTheme(); // Reset to default theme on image load error
        };
    },
    toggleDarkMode() {
      document.body.classList.toggle('dark');
      localStorage.setItem('darkMode', document.body.classList.contains('dark'));
    },
    loadTheme() {
      if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark');
        const toggle = document.querySelector('.toggle-switch input');
        if (toggle) toggle.checked = true;
      }
    },
    loadState() {
        const history = localStorage.getItem('musify_history');
        if (history) {
            Musify.state.history = JSON.parse(history);
        }
        const favourites = localStorage.getItem('musify_favourites');
        if (favourites) {
            Musify.state.favourites = JSON.parse(favourites);
        }
        const userPlaylists = localStorage.getItem('musify_userPlaylists');
        if (userPlaylists) {
            Musify.state.userPlaylists = JSON.parse(userPlaylists);
        }
        const savedPlaylists = localStorage.getItem('musify_savedPlaylists');
        if (savedPlaylists) {
            Musify.state.savedPlaylists = JSON.parse(savedPlaylists);
        }
        const quality = localStorage.getItem('musify_quality');
        if (quality) {
            Musify.state.audioQuality = quality;
            Musify.ui.audioQuality.value = quality;
        }
        const notifications = localStorage.getItem('musify_notifications');
        if (notifications !== null) {
            Musify.state.notifications = notifications === 'true';
            Musify.ui.notificationsToggle.checked = Musify.state.notifications;
        }
        const dynamicTheme = localStorage.getItem('musify_dynamicTheme');
        if (dynamicTheme !== null) {
            Musify.state.dynamicTheme = dynamicTheme === 'true';
            Musify.ui.dynamicThemeToggle.checked = Musify.state.dynamicTheme;
        }
    },
    savePlaybackState() {
        const state = Musify.state;
        if (state.currentSongIndex > -1 && state.songQueue.length > 0) {
            const playbackState = {
                songQueue: state.songQueue,
                currentSongIndex: state.currentSongIndex,
                currentTime: Musify.ui.audioPlayer.currentTime
            };
            localStorage.setItem('musify_playbackState', JSON.stringify(playbackState));
        }
    },
    async applyPlaybackState() {
        const playbackStateJSON = localStorage.getItem('musify_playbackState');
        if (playbackStateJSON) {
            const playbackState = JSON.parse(playbackStateJSON);
            if (playbackState.songQueue && playbackState.songQueue.length > 0 && playbackState.currentSongIndex > -1) {
                Musify.state.songQueue = playbackState.songQueue;
                Musify.state.currentSongIndex = playbackState.currentSongIndex;
                
                const song = Musify.state.songQueue[Musify.state.currentSongIndex];
                const fullDetails = await Musify.api.getSongDetails(song.id);
                const songDetails = fullDetails?.data?.[0] || song;
                
                if (songDetails && Array.isArray(songDetails.downloadUrl) && songDetails.downloadUrl.length > 0) {
                    Musify.player.updateInfo(songDetails);
                    const bestQuality = songDetails.downloadUrl.find(u => u.quality === Musify.state.audioQuality) || songDetails.downloadUrl.at(-1);
                    Musify.ui.audioPlayer.src = bestQuality.url || bestQuality.link;
                    Musify.ui.audioPlayer.currentTime = playbackState.currentTime || 0;
                } else {
                    // If we can't get a playable link, clear the state to avoid a broken player.
                    localStorage.removeItem('musify_playbackState');
                }
            }
        }
    },
    saveFavourites() {
        localStorage.setItem('musify_favourites', JSON.stringify(Musify.state.favourites));
    },
    saveUserPlaylists() {
        localStorage.setItem('musify_userPlaylists', JSON.stringify(Musify.state.userPlaylists));
    },
    saveSavedPlaylists() {
        localStorage.setItem('musify_savedPlaylists', JSON.stringify(Musify.state.savedPlaylists));
    },
    addSongToPlaylist(songId, playlistId) {
        const song = Musify.state.songQueue.find(s => s.id === songId)
            || Musify.state.history.find(s => s.id === songId)
            || Musify.state.favourites.find(s => s.id === songId);

        const playlist = Musify.state.userPlaylists.find(p => p.id === playlistId);

        if (song && playlist) {
            // Avoid adding duplicates
            if (playlist.songs.some(s => s.id === song.id)) {
                Musify.utils.showNotification(`"${song.name}" is already in "${playlist.name}".`);
                return;
            }
            playlist.songs.unshift(song); // Add to the beginning
            // If this is the first song, update the playlist cover
            if (playlist.songs.length === 1) {
                playlist.image = song.image;
            }
            this.saveUserPlaylists();
            Musify.utils.showNotification(`Added to ${playlist.name}`, 'success');
        }
    },
    async savePlaylist(playlistId) {
        if (Musify.state.savedPlaylists.some(p => p.id === playlistId)) {
            Musify.utils.showNotification('This playlist is already in your library.');
            return;
        }
        const playlistData = await Musify.api.getPlaylistDetails(playlistId);
        if (playlistData?.data) {
            Musify.state.savedPlaylists.unshift(playlistData.data);
            this.saveSavedPlaylists();
            Musify.utils.showNotification('Playlist saved to library', 'success');
        }
    },
    addToQueue(songId, playNext = false) {
        const song = Musify.state.songQueue.find(s => s.id === songId)
            || Musify.state.history.find(s => s.id === songId)
            || Musify.state.favourites.find(s => s.id === songId);
        
        if (song) {
            if (playNext) {
                Musify.state.songQueue.splice(Musify.state.currentSongIndex + 1, 0, song);
                Musify.utils.showNotification('Will play next', 'success');
            } else {
                Musify.state.songQueue.push(song);
                Musify.utils.showNotification('Added to queue', 'success');
            }
            if (Musify.ui.queueSidebar.classList.contains('active')) Musify.navigation.loadQueue();
        }
    },
    removeFromQueue(songId) {
        const { songQueue, currentSongIndex } = Musify.state;
        // Find the first index of the song *after* the currently playing song
        const indexToRemove = songQueue.findIndex((s, i) => s.id === songId && i > currentSongIndex);

        if (indexToRemove > -1) {
            songQueue.splice(indexToRemove, 1);
            Musify.navigation.loadQueue(); // Refresh the queue view
        }
    },
    clearQueue() {
        const { songQueue, currentSongIndex } = Musify.state;
        if (songQueue.length > currentSongIndex + 1) {
            Musify.state.songQueue = songQueue.slice(0, currentSongIndex + 1);
            Musify.navigation.loadQueue();
            Musify.utils.showNotification('Queue cleared', 'success');
        }
    },
    handleDragStart(e) {
        e.target.classList.add('dragging');
    },
    handleDragOver(e) {
        e.preventDefault();
        const draggingElement = document.querySelector('.dragging');
        const afterElement = [...e.target.closest('.song-list').querySelectorAll('.song:not(.dragging)')].reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = e.clientY - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
            else return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
        
        if (afterElement == null) e.target.closest('.song-list').appendChild(draggingElement);
        else e.target.closest('.song-list').insertBefore(draggingElement, afterElement);
    },
    handleDrop(e) {
        const draggingElement = e.target.closest('.song-list').querySelector('.dragging');
        draggingElement.classList.remove('dragging');
        const newOrderIds = [...e.target.closest('.song-list').querySelectorAll('.song')].map(songEl => songEl.querySelector('.play-btn').onclick.toString().match(/'([^']+)'/)[1]);
        const newNextUp = newOrderIds.map(id => Musify.state.songQueue.find(s => s.id === id));
        Musify.state.songQueue.splice(Musify.state.currentSongIndex + 1, newNextUp.length, ...newNextUp);
    },
    async startRadio(songId, append = false) {
        const suggestionsData = await Musify.api.getSongSuggestions(songId, 20);
        const originalSong = Musify.state.songQueue.find(s => s.id === songId)
            || Musify.state.history.find(s => s.id === songId)
            || Musify.state.favourites.find(s => s.id === songId);

        if (suggestionsData?.data && originalSong) {
            if (append) {
                Musify.state.songQueue.push(...suggestionsData.data);
                if (Musify.ui.queueSidebar.classList.contains('active')) Musify.navigation.loadQueue();
            } else {
                Musify.state.songQueue = [originalSong, ...suggestionsData.data];
                Musify.state.currentSongIndex = 0;
                Musify.player.playCurrent();
                this.toggleQueue();
            }
        } else {
            Musify.utils.showNotification('Could not start radio for this song.', 'error');
        }
    },
    async selectDownloadFolder() {
        if ('showDirectoryPicker' in window) {
            try {
                const handle = await window.showDirectoryPicker();
                // We need to check if we have permission to write to the directory.
                if (await handle.queryPermission({ mode: 'readwrite' }) !== 'granted') {
                    if (await handle.requestPermission({ mode: 'readwrite' }) !== 'granted') {
                        Musify.utils.showNotification('Permission to save files was denied.', 'error');
                        return;
                    }
                }
                Musify.state.downloadFolderHandle = handle;
                alert(`Downloads will now be saved to "${handle.name}".`);
            } catch (error) {
                // This error is often triggered if the user cancels the picker.
                console.log('Directory picker was cancelled or failed.', error);
            }
        } else {
            Musify.utils.showNotification('Custom download folder not supported by your browser.');
        }
    },
    async downloadSong(songId) {
        Musify.utils.showNotification('Preparing download...');
        const fullDetails = await Musify.api.getSongDetails(songId);
        const song = fullDetails?.data?.[0];

        if (!song || !Array.isArray(song.downloadUrl) || song.downloadUrl.length === 0) {
            Musify.utils.showNotification('Could not find a downloadable link for this song.', 'error');
            return;
        }

        try {
            const bestQuality = song.downloadUrl.at(-1);
            const bestQualityUrl = bestQuality.url || bestQuality.link;

            if (!bestQualityUrl) {
                Musify.utils.showNotification('Download link was invalid.', 'error');
                return;
            }

            const songBuffer = await fetch(bestQualityUrl).then(res => res.arrayBuffer());
            const coverUrl = Musify.render._getImageUrl(song.image);
            const coverBuffer = await fetch(coverUrl.replace(/^http:/, 'https'))
                .then(res => res.arrayBuffer())
                .catch(() => null); // Ignore if cover fails to download

            const writer = new ID3Writer(songBuffer);
            writer.setFrame('TIT2', song.name || song.title)
                  .setFrame('TPE1', [(song.primaryArtists || '').replace(/, /g, '/')]);
            if (song.album?.name) {
                writer.setFrame('TALB', song.album.name);
            }
            if (coverBuffer) {
                writer.setFrame('APIC', { type: 3, data: coverBuffer, description: 'Cover' });
            }
            writer.addTag();

            const taggedSongBlob = writer.getBlob();
            const fileName = `${song.name || song.title}.mp3`;

            const link = document.createElement('a');
            link.href = URL.createObjectURL(taggedSongBlob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            Musify.utils.showNotification(`Downloaded "${fileName}"`, 'success');
        } catch (error) {
            console.error('Download failed:', error);
            Musify.utils.showNotification('An error occurred during download.', 'error');
        }
    },
    setAudioQuality(quality) {
        Musify.state.audioQuality = quality;
        localStorage.setItem('musify_quality', quality);
    },
    setNotifications(isEnabled) {
        Musify.state.notifications = isEnabled;
        localStorage.setItem('musify_notifications', isEnabled);
        // In a real app, you would initialize or tear down notification listeners here.
        console.log(`Notifications ${isEnabled ? 'enabled' : 'disabled'}`);
    },
    setDynamicTheme(isEnabled) {
        Musify.state.dynamicTheme = isEnabled;
        localStorage.setItem('musify_dynamicTheme', isEnabled);
        this.updatePlayerTheme(Musify.ui.currentSongImg.src); // Re-apply theme
    },
    setEndlessQueue(isEnabled) {
        Musify.state.endlessQueue = isEnabled;
        localStorage.setItem('musify_endlessQueue', isEnabled);
    },
    clearHistory() {
        if (confirm('Are you sure you want to clear your entire listening history? This cannot be undone.')) {
            Musify.state.history = [];
            localStorage.removeItem('musify_history');
            localStorage.removeItem('musify_playbackState'); // Also clear the last played song state
            Musify.utils.showNotification('Listening history cleared.', 'success');
            // If the history tab is active, re-render it to show it's empty
            if (Musify.state.navigation.currentSection === 'history') Musify.navigation.loadHistory();
        }
    },
    showNotification(message, type = 'info') { // 'info', 'success', 'error'
        const container = document.getElementById('notification-container');
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 4000); // Notification disappears after 4 seconds
    },
    debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    },
    filterSongList(query, containerId) {
        const container = document.getElementById(containerId);
        const songs = container.querySelectorAll('.song');
        songs.forEach(song => {
            const title = song.querySelector('strong span').textContent.toLowerCase();
            const artist = song.querySelector('small').textContent.toLowerCase();
            song.style.display = (title.includes(query.toLowerCase()) || artist.includes(query.toLowerCase())) ? 'flex' : 'none';
        });
    },
    clearFavourites() {
        if (confirm('Are you sure you want to clear all your favourite songs?')) {
            Musify.state.favourites = [];
            this.saveFavourites();
            Musify.utils.showNotification('Favourites cleared.', 'success');
            if (Musify.state.navigation.currentSection === 'favourites') Musify.navigation.loadFavourites();
        }
    },
    clearAllData() {
        if (confirm('DANGER: This will delete all your local data (history, favourites, and playlists). This cannot be undone. Are you absolutely sure?')) {
            localStorage.removeItem('musify_history');
            localStorage.removeItem('musify_favourites');
            localStorage.removeItem('musify_userPlaylists');
            window.location.reload();
        }
    },
  }
};

// --- Global Scope Functions ---
// These functions are called from inline HTML onclick attributes.
// They are thin wrappers around the main application logic.

function showSection(sectionId) {
  Musify.navigation.showSection(sectionId);
}

function showArtist(event, artistId) {
    Musify.navigation.showArtist(event, artistId);
}

function playSongFromCard(event, songId) {
    Musify.player.playSongFromCard(event, songId);
}

function triggerSearch() {
  Musify.navigation.triggerSearch();
}

function toggleNowPlaying(show) {
    Musify.navigation.toggleNowPlaying(show);
}

function toggleQueue() {
    Musify.navigation.toggleQueue();
}

function togglePlayPause() {
  Musify.player.togglePlayPause();
}

function nextSong() {
  Musify.player.next();
}

function prevSong() {
  Musify.player.prev();
}

function toggleShuffle() {
  Musify.player.toggleShuffle();
}

function toggleRepeat() {
  Musify.player.toggleRepeat();
}

function toggleDarkMode() {
  Musify.utils.toggleDarkMode();
}

function toggleNotifications(isEnabled) {
  Musify.utils.setNotifications(isEnabled);
}

function toggleDynamicTheme(isEnabled) {
  Musify.utils.setDynamicTheme(isEnabled);
}

function toggleEndlessQueue(isEnabled) {
  Musify.utils.setEndlessQueue(isEnabled);
}

function toggleFavourite(songId) {
    Musify.utils.toggleFavourite(songId);
}

function filterSongList(query, containerId) {
    Musify.utils.filterSongList(query, containerId);
}

function addSongToPlaylist(songId, playlistId) {
    Musify.utils.addSongToPlaylist(songId, playlistId);
}

function clearHistory() {
  Musify.utils.clearHistory();
}

function clearFavourites() {
    Musify.utils.clearFavourites();
}

function clearAllData() {
    Musify.utils.clearAllData();
}

function likeCurrentSong() {
    const song = Musify.state.songQueue[Musify.state.currentSongIndex];
    if (song) {
        Musify.utils.toggleFavourite(song.id);
    }
}

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => Musify.init());
