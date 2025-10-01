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
      loadedSections: new Set(), // Keep track of loaded sections
    },
  },

  ui: {},

  api: {
    BASE_URL: "https://mtuneapi.vercel.app/api",

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
    getPlaylistDetails: (id, page = 1, limit = 50) => Musify.api._fetch(`/playlists?id=${id}&page=${page}&limit=${limit}`),
    getAlbumDetails: (id) => Musify.api._fetch(`/albums?id=${id}`),
    getArtistDetails: (id) => Musify.api._fetch(`/artists?id=${id}`),
    getArtistSongs: (id, page) => Musify.api._fetch(`/artists/${id}/songs?page=${page}&limit=50`),
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
      mobileProgressBar: document.getElementById('mobile-progress-bar'),
      searchBar: document.getElementById('searchBar'),
      currentTime: document.getElementById('currentTime'),
      totalDuration: document.getElementById('totalDuration'),
      mainSearchBar: document.getElementById('mainSearchBar'),
      searchSuggestions: document.getElementById('searchSuggestions'),
      mainContent: document.querySelector('.main-content'),
      contentSections: document.querySelectorAll('.content-section'),
      // Discover page sections
      recommendedSongs: document.getElementById('recommendedSongs'),
      recommendedAlbums: document.getElementById('recommendedAlbums'),
      recommendedPlaylists: document.getElementById('recommendedPlaylists'),
      recommendedArtists: document.getElementById('recommendedArtists'),
      songList: document.getElementById('songList'),
      albumSearchResults: document.getElementById('albumSearchResults'),
      artistSearchResults: document.getElementById('artistSearchResults'),
      userPlaylists: document.getElementById('userPlaylists'),
      historyList: document.getElementById('historyList'),
      savedPlaylistsContainer: document.getElementById('savedPlaylistsContainer'),
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
      // Expanded Player UI
      nowPlayingView: document.getElementById('nowPlayingView'),
      nowPlayingImg: document.getElementById('nowPlayingImg'),
      nowPlayingTitle: document.getElementById('nowPlayingTitle'),
      nowPlayingArtist: document.getElementById('nowPlayingArtist'),
      nowPlayingProgressBar: document.getElementById('nowPlayingProgressBar'),
      nowPlayingCurrentTime: document.getElementById('nowPlayingCurrentTime'),
      nowPlayingTotalDuration: document.getElementById('nowPlayingTotalDuration'),
      nowPlayingPlayPauseIcon: document.getElementById('nowPlayingPlayPauseIcon'),
      nowPlayingShuffleBtn: document.getElementById('nowPlayingShuffleBtn'),
      nowPlayingRepeatBtn: document.getElementById('nowPlayingRepeatBtn'),
      nowPlayingRepeatIcon: document.getElementById('nowPlayingRepeatIcon'),
      nowPlayingVolumeSlider: document.getElementById('nowPlayingVolumeSlider'),
      lyricsContainer: document.getElementById('lyricsContainer'),
      lyricsContent: document.getElementById('lyricsContent'),
      queueContainer: document.getElementById('queueContainer'),
      queueList: document.getElementById('queueList'),
    };
    this.ui.volumeSlider = document.getElementById('volumeSlider');

    // Bind event listeners
    this.ui.audioPlayer.addEventListener('timeupdate', () => this.player.updateProgressBar());
    this.ui.audioPlayer.addEventListener('ended', () => this.player.handleSongEnd());
    this.ui.audioPlayer.addEventListener('loadedmetadata', () => {
        // Update duration once metadata is loaded
        this.player.updateProgressBar();
    });
    this.ui.audioPlayer.addEventListener('play', () => {
        this.state.isPlaying = true;
        this.player.updatePlayPauseIcons(true);
    });
    this.ui.audioPlayer.addEventListener('pause', () => {
        this.state.isPlaying = false;
        this.player.updatePlayPauseIcons(false);
        this.player.updateProgressBar();
    });
    this.ui.progressBar.addEventListener('input', () => this.player.seek());
    this.ui.nowPlayingProgressBar.addEventListener('input', (e) => this.player.seek(e.target));
    this.ui.searchBar.addEventListener('keypress', e => { if (e.key === "Enter") this.navigation.triggerSearch(); });
    this.ui.searchBar.addEventListener('input', () => this.utils.debounce(this.navigation.showSearchSuggestions.bind(this.navigation), 300)());
    document.addEventListener('click', (e) => { if (!e.target.closest('.search-input-container')) this.ui.searchSuggestions.classList.remove('active'); });
    window.addEventListener('beforeunload', () => this.utils.savePlaybackState());
    this.ui.volumeSlider.addEventListener('input', (e) => this.player.setVolume(e.target.value));
    this.ui.nowPlayingVolumeSlider.addEventListener('input', (e) => this.player.setVolume(e.target.value));
    this.ui.audioQuality.addEventListener('change', (e) => this.utils.setAudioQuality(e.target.value));
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            header.parentElement.classList.toggle('active');
        });
    });
    // Add mobile-specific gesture listeners
    this.utils.addMobileGestures();
    this.utils.addNowPlayingGestures();

    // Use event delegation for marquee effect and infinite scroll
    this.ui.mainContent.addEventListener('mouseover', this.utils.handleMarquee);
    this.ui.mainContent.addEventListener('mouseout', this.utils.handleMarquee);
    this.ui.mainContent.addEventListener('scroll', (e) => {
        if (e.target.id === 'songList') {
            this.utils.handleInfiniteScroll(e.target);
        }
    });
    // Add ripple effect to all buttons
    this.utils.addQueueDragHandlers();
    document.addEventListener('click', this.utils.applyRippleEffect);


    // Load initial state
    this.utils.loadTheme();
    this.utils.loadState();
    this.utils.applyPlaybackState();
    // After loading state and applying playback state, ensure buttons reflect state
    this.ui.shuffleBtn.classList.toggle('active', this.state.isShuffle);
    this.ui.repeatBtn.classList.toggle('active', this.state.repeatMode !== 'off');
    this.ui.repeatIcon.className = this.state.repeatMode === 'one' ? 'fas fa-1' : 'fas fa-repeat';
    if (!this.state.songQueue[this.state.currentSongIndex]) {
        this.ui.playPauseIcon.className = 'fas fa-play';
    } else {
        this.ui.nowPlayingShuffleBtn.classList.toggle('active', this.state.isShuffle);
        this.ui.nowPlayingRepeatBtn.classList.toggle('active', this.state.repeatMode !== 'off');
        this.ui.nowPlayingRepeatIcon.className = this.ui.repeatIcon.className;
    }
    this.navigation.showSection('discover');
  },

  render: {
    _decode(text) {
        if (typeof text !== 'string') return text;
        // This prevents decoding from creating unwanted HTML elements.
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    },
    _escape(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },
    _getImageUrl(imageArray) {
      return imageArray?.[2]?.url || imageArray?.[1]?.url || imageArray?.[0]?.url || 'default_cover.jpg';
    }, // Added missing comma
    discoverCard(item) {
        const div = document.createElement('div');
        div.className = 'discover-card';
        // Determine type. Albums and Playlists can be ambiguous.
        let type = item.type;
        if (!type) {
            if (item.songCount && item.year) type = 'album';
            else if (item.songCount) type = 'playlist';
            else if (item.role === 'artist') type = 'artist';
            else type = 'song'; // fallback
        }

        let cardClickAction = '';
        let playButtonClickAction = `Musify.player.playFromCardContext(event, '${item.id}', '${type}')`;

        if (type === 'song') {
            cardClickAction = playButtonClickAction;
        } else {
            const functionMap = { 'playlist': 'showPlaylist', 'album': 'showAlbum', 'artist': 'showArtist' };
            cardClickAction = `Musify.navigation.${functionMap[type]}(event, '${item.id}')`;
        }

        div.innerHTML = `
            <div class="discover-card-art" onclick="${cardClickAction}">
                <img src="${this._getImageUrl(item.image)}" alt="${this._decode(item.name || item.title)}" loading="lazy" onerror="this.src='default_cover.jpg'"/>
                <button class="play-btn" onclick="${playButtonClickAction}"><i class="fas fa-play"></i></button>
            </div>
            <strong><span>${this._decode(item.name || item.title)}</span></strong>
            <small>${this._decode(item.primaryArtists || item.description || item.subtitle || 'Music')}</small>`;
        return div;
    },
    _renderMessage(container, message, type = 'loading') {
      container.innerHTML = `<div class="${type}">${message}</div>`;
    },
    songCard(song, options = { playOnly: false }) {
      const div = document.createElement('div');
      div.className = 'song';

      const img = document.createElement('img');
      img.src = this._getImageUrl(song.image);
      img.alt = this._decode(song.title);
      img.onerror = () => { img.src = 'default_cover.jpg'; };

      const infoDiv = document.createElement('div');
      const strong = document.createElement('strong');
      const span = document.createElement('span');
      span.textContent = this._decode(song.name || song.title);
      strong.appendChild(span);
      const small = document.createElement('small');
      small.textContent = this._decode(song.primaryArtists || song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist');
      infoDiv.append(strong, small);

      // Add draggable attribute and data-id for queue items
      const inQueue = options.inQueue;
      if (inQueue) {
          div.draggable = true;
          div.dataset.songId = song.id;
      }

      const durationSpan = document.createElement('span');
      durationSpan.className = 'song-duration';
      durationSpan.textContent = Musify.player.formatTime(song.duration || 0);
      const contextBtn = inQueue 
        ? this._createButton('options-btn', `Musify.utils.removeFromQueue(event, '${song.id}')`, 'Remove from queue', 'fas fa-times')
        : this._createButton('options-btn', `Musify.utils.showSongContextMenu(event, '${song.id}')`, 'More options', 'fas fa-ellipsis-v');
      const playBtn = this._createButton('play-btn', `Musify.player.playSongFromCard(event, '${song.id}')`, `Play ${song.title}`, 'fas fa-play');
      div.append(img, infoDiv, durationSpan, contextBtn, playBtn);
      return div;
    },
    playlistCard(pl) {
      const div = document.createElement('div');
      div.className = 'playlist';

      // If it's a user playlist with no songs, show a placeholder icon instead of an image.
      const isNewUserPlaylist = pl.id.startsWith('user_') && (!pl.songs || pl.songs.length === 0);
      const imageContent = isNewUserPlaylist
        ? `<div class="playlist-placeholder"><i class="fas fa-music"></i></div>`
        : `<img src="${this._getImageUrl(pl.image)}" alt="${this._decode(pl.name || pl.title)}" onerror="this.src='default_cover.jpg'" loading="lazy"/>`;

      div.innerHTML = ` 
        ${imageContent}
        <div><strong><span>${this._decode(pl.name || pl.title)}</span></strong></div>
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
        <img src="${this._getImageUrl(album.image)}" alt="${this._decode(album.name || album.title)}" onerror="this.src='default_cover.jpg'" loading="lazy"/>
        <div><strong><span>${this._decode(album.name || album.title)}</span></strong></div>
        <small>${this._decode(album.primaryArtists || 'Various Artists')}</small>
        <button onclick="Musify.navigation.showAlbum('${album.id}')" title="View Album"><i class="fas fa-info-circle"></i></button>
      `;
      return div;
    },
    timelineCard(artist) {
      const div = document.createElement('div');
      div.className = 'artist';
      div.innerHTML = `
        <img src="${this._getImageUrl(artist.image)}" alt="${this._decode(artist.title)}" onerror="this.src='default_artist.jpg'" loading="lazy"/>
        <div><strong><span>${this._decode(artist.name || artist.title)}</span></strong><small>${this._decode(artist.description || artist.role || 'Artist')}</small></div>
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
        const description = this._decode(playlist.description || '');
        header.innerHTML = `
            <div class="details-header-content">
                <img src="${this._getImageUrl(playlist.image)}" alt="${this._decode(playlist.name)}"/>
                <div class="details-header-text">
                    <span class="details-type">Playlist</span>
                    <h1>${this._decode(playlist.name)}</h1>
                    <p class="description">${description}</p>
                    <p class="meta-info">${playlist.songCount} songs &bull; ${playlist.followerCount} followers</p>
                </div>
            </div>
            <div class="details-header-actions">
                <button class="nav-btn active" onclick="Musify.player.playFromQueue(Musify.state.songQueue[0].id)"><i class="fas fa-play"></i> Play All</button>
            </div>
        `;
    },
    albumHeader(album) {
        const header = Musify.ui.albumDetailsHeader;
        header.innerHTML = `
            <div class="details-header-content">
                <img src="${this._getImageUrl(album.image)}" alt="${this._decode(album.name)}"/>
                <div class="details-header-text">
                    <span class="details-type">Album</span>
                    <h1>${this._decode(album.name)}</h1>
                    <p class="meta-info">${this._decode(album.artists?.primary?.map(a => a.name).join(', ') || '')} &bull; ${album.songCount} songs &bull; ${album.year}</p>
                </div>
            </div>
            <div class="details-header-actions">
                <button class="nav-btn active" onclick="Musify.player.playFromQueue(Musify.state.songQueue[0].id)"><i class="fas fa-play"></i> Play All</button>
            </div>
        `;
        // Add show more/less functionality
        const description = header.querySelector('.description.expandable');
        if (description && description.scrollHeight > description.clientHeight) {
            const showMoreBtn = document.createElement('button');
            showMoreBtn.className = 'show-more-btn';
            showMoreBtn.textContent = 'Show More';
            showMoreBtn.onclick = () => {
                description.classList.toggle('expanded');
                showMoreBtn.textContent = description.classList.contains('expanded') ? 'Show Less' : 'Show More';
            };
            description.after(showMoreBtn);
        }
    },
    artistHeader(artist) {
        const header = Musify.ui.artistDetailsHeader;
        header.innerHTML = `
            <div class="details-header-content">
                <img src="${this._getImageUrl(artist.image)}" alt="${this._decode(artist.name)}" style="border-radius: 50%;"/>
                <div class="details-header-text">
                    <span class="details-type">Artist</span>
                    <h1>${this._decode(artist.name)}</h1>
                    <p class="meta-info">${artist.fanCount} followers</p>
                    <p class="description expandable">${artist.bio ? this._decode(artist.bio[0]?.text || '') : ''}</p>
                </div>
            </div>
            <div class="details-header-actions">
                <button class="nav-btn active" onclick="Musify.player.playFromQueue(Musify.state.songQueue[0].id)"><i class="fas fa-play"></i> Play Top Songs</button>
            </div>
        `;
        const description = header.querySelector('.description.expandable');
        if (description && description.scrollHeight > description.clientHeight) {
            const showMoreBtn = document.createElement('button');
            showMoreBtn.className = 'show-more-btn';
            showMoreBtn.textContent = 'Show More';
            showMoreBtn.onclick = () => {
                description.classList.toggle('expanded');
                showMoreBtn.textContent = description.classList.contains('expanded') ? 'Show Less' : 'Show More';
            };
            description.after(showMoreBtn);
        }
    },
  },

  player: {
    playSongFromCard(event, songId) {
        event.stopPropagation(); // Prevent card's parent click events
        const card = event.target.closest('.song, .discover-card');
        if (!card) return; // Exit if the click wasn't on a song or discover card
        const songListContainer = card.parentElement;
        
        // Determine the source list of songs
        let sourceList;
        switch (songListContainer.id) {
            case 'recommendedSongs': // This was the missing case
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
    async playFromCardContext(event, itemId, itemType) {
        event.stopPropagation(); // Don't trigger the card's navigation
        
        // Clear search and hide suggestions when an item is played
        Musify.ui.searchBar.value = '';
        Musify.ui.searchSuggestions.classList.remove('active');

        let songs = [];
        let data;

        Musify.utils.showNotification(`Loading ${itemType}...`);

        try {
            switch (itemType) {
                case 'playlist':
                    data = await Musify.api.getPlaylistDetails(itemId, 1, 100); // Fetch a good chunk initially
                    songs = data?.data?.songs || [];
                    break;
                case 'album':
                    data = await Musify.api.getAlbumDetails(itemId);
                    songs = data?.data?.songs || [];
                    break;
                case 'artist':
                    data = await Musify.api.getArtistDetails(itemId);
                    songs = data?.data?.topSongs || [];
                    break;
                case 'song':
                    data = await Musify.api.getSongDetails(itemId);
                    songs = data?.data || [];
                    Musify.state.songQueue = Musify.state.discover.songs; // Set context to all recommended songs
                    break;
            }

            if (songs.length > 0) {
                Musify.state.songQueue = songs;
                this.playFromQueue(songs[0].id);
            } else {
                Musify.utils.showNotification(`Could not find any songs for this ${itemType}.`, 'error');
            }
        } catch (error) {
            Musify.utils.showNotification(`Failed to load ${itemType}.`, 'error');
            console.error(`Error playing from ${itemType} card:`, error);
        }
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

      if (songDetails && Array.isArray(songDetails.downloadUrl) && songDetails.downloadUrl.length > 0) {
        const quality = Musify.state.audioQuality;
        const bestQuality = songDetails.downloadUrl.find(u => u.quality === quality) || songDetails.downloadUrl.at(-1);
        Musify.ui.audioPlayer.src = bestQuality.url || bestQuality.link;
        Musify.ui.audioPlayer.load(); // Explicitly load the new source

        try {
          await Musify.ui.audioPlayer.play();
          state.isPlaying = true;
          Musify.ui.playPauseIcon.className = 'fas fa-pause';
          Musify.ui.mobilePlayPauseIcon.className = 'fas fa-pause';
          Musify.ui.likeBtn.classList.toggle('active', Musify.utils.isFavourited(song.id));
          this.addToHistory(songDetails);
          this.updateMediaSession(songDetails);
        } catch (e) {
          state.isPlaying = false;
          Musify.ui.playPauseIcon.className = 'fas fa-play';
          Musify.ui.mobilePlayPauseIcon.className = 'fas fa-play';
          console.error("Playback failed", e);
        }
      } else {
        Musify.ui.playPauseIcon.className = 'fas fa-play';
        Musify.ui.mobilePlayPauseIcon.className = 'fas fa-play';
        console.error('Song object from queue is missing downloadUrl:', songDetails);
        Musify.utils.showNotification(`Unable to get a playable link for "${song.name || song.title}".`, 'error');
      }
    },
    updateInfo(song) {
      const title = Musify.render._decode(song.name || song.title || 'Unknown Title');
      Musify.ui.currentSongTitle.innerHTML = `<span>${title}</span>`;
      Musify.ui.currentSongArtist.textContent = Musify.render._decode(song.primaryArtists || song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist');
      Musify.ui.currentSongImg.src = Musify.render._getImageUrl(song.image);
      Musify.ui.likeBtn.classList.toggle('active', Musify.utils.isFavourited(song.id));
      Musify.ui.playPauseIcon.className = Musify.state.isPlaying ? 'fas fa-pause' : 'fas fa-play';
      Musify.utils.updatePlayerTheme(Musify.render._getImageUrl(song.image));

      // Update Now Playing View
      const isPlaying = Musify.state.isPlaying;
      Musify.ui.mobilePlayPauseIcon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
      Musify.ui.nowPlayingPlayPauseIcon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';

      Musify.ui.nowPlayingImg.src = Musify.render._getImageUrl(song.image);
      Musify.ui.nowPlayingTitle.textContent = title;
      Musify.ui.nowPlayingArtist.textContent = Musify.render._decode(song.primaryArtists || song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist');
      document.querySelector('.now-playing-bg').style.backgroundImage = `url(${Musify.render._getImageUrl(song.image)})`;

      // Highlight current song in queue view
      document.querySelectorAll('#queueList .song').forEach(el => el.classList.remove('is-playing'));
      const currentQueueItem = document.querySelector(`#queueList .song[data-song-id="${song.id}"]`);
      if (currentQueueItem) currentQueueItem.classList.add('is-playing');
    },
    updateMediaSession(song) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: Musify.render._decode(song.name || song.title),
                artist: Musify.render._decode(song.primaryArtists || song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist'),
                album: Musify.render._decode(song.album?.name || ''),
                artwork: song.image.map(img => ({ src: img.url, sizes: `${img.quality.split('x')[0]}x${img.quality.split('x')[1]}`, type: 'image/jpeg' }))
            });

            navigator.mediaSession.setActionHandler('play', () => this.togglePlayPause());
            navigator.mediaSession.setActionHandler('pause', () => this.togglePlayPause());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
        }
    },
    togglePlayPause() {
      const { audioPlayer } = Musify.ui;
      if (!audioPlayer.src && Musify.state.songQueue.length > 0) {
        Musify.state.currentSongIndex = 0;
        this.playCurrent();
        return;
      }
      if (audioPlayer.paused) audioPlayer.play();
      else audioPlayer.pause();
    },
    updatePlayPauseIcons(isPlaying) {
        const { playPauseIcon, mobilePlayPauseIcon } = Musify.ui;
        const iconClass = isPlaying ? 'fa-pause' : 'fa-play';
        if (playPauseIcon) playPauseIcon.className = `fas ${iconClass}`;
        if (mobilePlayPauseIcon) mobilePlayPauseIcon.className = `fas ${iconClass}`;
        if (Musify.ui.nowPlayingPlayPauseIcon) {
            Musify.ui.nowPlayingPlayPauseIcon.className = `fas ${iconClass}`;
        }
    },
    next() {
      // Mobile-only: if player is compact, show next/prev buttons briefly on song change
      if (window.innerWidth <= 768) {
          // this.showMobileControlsTemporarily(); // Removed as this function no longer exists
      }
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
      if (window.innerWidth <= 768) {
          // this.showMobileControlsTemporarily(); // Removed as this function no longer exists
      }
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
      const isActive = Musify.state.isShuffle;
      Musify.ui.shuffleBtn.classList.toggle('active', isActive);
      Musify.ui.nowPlayingShuffleBtn.classList.toggle('active', isActive);
      Musify.ui.shuffleBtn.title = `Shuffle ${isActive ? 'On' : 'Off'}`;
    },
    toggleRepeat() {
      const { repeatBtn, repeatIcon, nowPlayingRepeatBtn, nowPlayingRepeatIcon } = Musify.ui;
      const state = Musify.state;
      if (state.repeatMode === 'off') {
        state.repeatMode = 'all';
        repeatBtn.classList.add('active'); // Re-add active class
        repeatBtn.title = 'Repeat All';
        repeatIcon.className = 'fas fa-repeat';
      } else if (state.repeatMode === 'all') {
        state.repeatMode = 'one';
        repeatIcon.className = 'fas fa-1';
        repeatBtn.title = 'Repeat One';
      } else {
        state.repeatMode = 'off';
        repeatBtn.classList.remove('active');
        repeatIcon.className = 'fas fa-repeat';
        repeatBtn.title = 'Repeat Off';
      }
      // Sync expanded player
      nowPlayingRepeatBtn.classList.toggle('active', state.repeatMode !== 'off');
      nowPlayingRepeatIcon.className = repeatIcon.className;
    },
    updateProgressBar() {
      const { audioPlayer, progressBar, mobileProgressBar, currentTime, totalDuration, nowPlayingProgressBar, nowPlayingCurrentTime, nowPlayingTotalDuration } = Musify.ui;
      if (!audioPlayer.duration) return;
      const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
      const safeProgress = isNaN(progress) ? 0 : progress;
      progressBar.value = safeProgress;
      nowPlayingProgressBar.value = safeProgress;
      if (mobileProgressBar) mobileProgressBar.style.width = `${safeProgress}%`;
      currentTime.textContent = this.formatTime(audioPlayer.currentTime);
      totalDuration.textContent = this.formatTime(audioPlayer.duration);
      nowPlayingCurrentTime.textContent = this.formatTime(audioPlayer.currentTime);
      nowPlayingTotalDuration.textContent = this.formatTime(audioPlayer.duration);
    },
    seek(sourceProgressBar) {
      const { audioPlayer, progressBar, nowPlayingProgressBar } = Musify.ui;
      // If no specific progress bar is passed, default to the main one
      sourceProgressBar = sourceProgressBar || progressBar;
      if (!audioPlayer.duration) return;
      audioPlayer.currentTime = (sourceProgressBar.value / 100) * audioPlayer.duration;
    },
    setVolume(value) {
        Musify.ui.audioPlayer.volume = value;
        localStorage.setItem('musify_volume', value);
        Musify.ui.volumeSlider.value = value;
        Musify.ui.nowPlayingVolumeSlider.value = value;
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
      const currentActive = document.querySelector('.content-section.active');
      if (currentActive) {
          currentActive.classList.remove('active');
          if (currentActive.id.includes('-details')) currentActive.classList.add('slide-out');
      }

      const { navigation } = Musify.state;
      if (navigation.currentSection !== sectionId) {
        navigation.previousSection = navigation.currentSection;
        navigation.currentSection = sectionId;
        if (sectionId.includes('-details')) navigation.loadedSections.delete(sectionId);
      }
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

      const newSection = document.getElementById(sectionId);
      if (newSection) {
          // Only load content if it hasn't been loaded before
          if (sectionId === 'history' || !navigation.loadedSections.has(sectionId)) {
              if (loadAction) loadAction();
              navigation.loadedSections.add(sectionId);
          }
          newSection.classList.remove('slide-out'); // Remove slide-out class if it exists
          newSection.classList.add('active');
      }
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

    toggleNowPlayingView(show) {
        const { nowPlayingView } = Musify.ui;
        nowPlayingView.classList.toggle('active', show);
    },

    toggleLyrics(show) {
        const { lyricsContainer } = Musify.ui;
        lyricsContainer.classList.toggle('active', show);
    },

    toggleQueueView(show) {
        const { queueContainer, queueList } = Musify.ui;
        queueContainer.classList.toggle('active', show);
        if (show) {
            Musify.render.populate(queueList, Musify.state.songQueue, (s) => Musify.render.songCard(s, { inQueue: true }), 'The queue is empty.', 'Could not load queue.');
            const currentSong = Musify.state.songQueue[Musify.state.currentSongIndex];
            if (currentSong) this.player.updateInfo(currentSong); // Re-apply highlight
        }
    },

    async loadDiscover() {
      const { recommendedSongs, recommendedAlbums, recommendedPlaylists, recommendedArtists } = Musify.ui;
      Musify.render._renderMessage(recommendedSongs, 'Loading Recommended Songs...');
      Musify.render._renderMessage(recommendedAlbums, 'Loading Recommended Albums...');
      Musify.render._renderMessage(recommendedPlaylists, 'Loading Recommended Playlists...');
      Musify.render._renderMessage(recommendedArtists, 'Loading Recommended Artists...');

      const [songData, albumData, playlistData, artistData] = await Promise.all([
        Musify.api._fetch('/search/songs?query=latest hits&limit=30'),
        Musify.api._fetch('/search/albums?query=top albums&limit=30'),
        Musify.api._fetch('/search/playlists?query=top playlists&limit=30'),
        Musify.api._fetch('/search/artists?query=popular artists&limit=30')
      ]);

      // Store the fetched data in the state for the player to use
      Musify.state.discover = {
          songs: songData?.data?.results || [],
          albums: albumData?.data?.results || [],
          playlists: playlistData?.data?.results || [],
          artists: artistData?.data?.results || [],
      };

      // Populate the new "Recommended" sections
      Musify.render.populate(recommendedSongs, Musify.state.discover.songs, Musify.render.discoverCard, 'No recommended songs found.', 'Failed to load songs.');
      Musify.render.populate(recommendedAlbums, Musify.state.discover.albums, Musify.render.discoverCard, 'No recommended albums found.', 'Failed to load albums.');
      Musify.render.populate(recommendedPlaylists, Musify.state.discover.playlists, Musify.render.discoverCard, 'No recommended playlists found.', 'Failed to load playlists.');
      Musify.render.populate(recommendedArtists, Musify.state.discover.artists, Musify.render.discoverCard, 'No recommended artists found.', 'Failed to load artists.');
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
      // Do not clear the search bar here, so the user can see what they searched for.
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

      const uniqueSuggestions = Array.from(new Map(suggestions.map(item => [item.id, item])).values()).slice(0, 8);

      if (uniqueSuggestions.length === 0) {
          container.classList.remove('active');
          return;
      }

      container.innerHTML = uniqueSuggestions.map(s => {
          const imageUrl = Musify.render._getImageUrl(s.image);
          const title = Musify.render._decode(s.title);
          const subtitle = Musify.render._decode(s.subtitle || s.description || '');
          let onclickAction = `Musify.navigation.selectSuggestion('${s.title}')`; // Default for top query

          if (s.type === 'song') onclickAction = `Musify.player.playFromCardContext(event, '${s.id}', 'song')`;
          if (s.type === 'album') onclickAction = `Musify.navigation.showAlbum('${s.id}')`;
          if (s.type === 'artist') onclickAction = `Musify.navigation.showArtist(event, '${s.id}')`;

          return `<div class="suggestion-item" onclick="${onclickAction}"><img src="${imageUrl}" loading="lazy" onerror="this.src='default_cover.jpg'"/><div><strong>${title}</strong><small>${subtitle}</small></div></div>`;
      }).join('');

      container.innerHTML = uniqueSuggestions.map(s => {
          let iconClass = 'fa-search';
          if (s.type === 'song') iconClass = 'fa-music';
          if (s.type === 'album') iconClass = 'fa-compact-disc';
          if (s.type === 'artist') iconClass = 'fa-user';
          let onclickAction = `Musify.navigation.selectSuggestion('${s.title}')`;
          if (s.type === 'song') onclickAction = `Musify.player.playFromCardContext(event, '${s.id}', 'song')`;
          if (s.type === 'album') onclickAction = `Musify.navigation.showAlbum('${s.id}')`;
          if (s.type === 'artist') onclickAction = `Musify.navigation.showArtist(event, '${s.id}')`;

          const imageUrl = Musify.render._getImageUrl(s.image);
          return `<div class="suggestion-item" onclick="${onclickAction}"><img src="${imageUrl}" loading="lazy" onerror="this.src='default_cover.jpg'"/><div><strong>${Musify.render._decode(s.title)}</strong><small>${Musify.render._decode(s.subtitle || s.description || '')}</small></div></div>`;
      }).join('');
      container.classList.toggle('active', uniqueSuggestions.length > 0);
    },
    selectSuggestion(query) {
        Musify.ui.searchBar.value = query;
        // Hide suggestions after selecting one to perform a full search
        if (Musify.ui.searchSuggestions) {
            Musify.ui.searchSuggestions.classList.remove('active');
        }
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
        const playlistData = await Musify.api.getPlaylistDetails(playlistId, 1);
        const data = playlistData?.data;
        if (data && data.songs) {
            Musify.render.playlistHeader(data);
            const initialSongs = data.songs;
            Musify.render.populate(playlistSongs, initialSongs, Musify.render.songCard, 'This playlist is empty.', 'Could not load songs.');
            Musify.state.songQueue = [...initialSongs];

            // Fetch all remaining songs if the playlist is paginated
            if (data.songCount > initialSongs.length) {
                this.fetchAllPlaylistSongs(playlistId, initialSongs.length, data.songCount);
            }
        } else {
            Musify.render._renderMessage(playlistSongs, 'Failed to load playlist.', 'error');
        }
    },

    async fetchAllPlaylistSongs(playlistId, initialCount, totalCount) {
        const { playlistSongs } = Musify.ui;
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading';
        loadingIndicator.textContent = 'Loading more...';
        playlistSongs.appendChild(loadingIndicator);

        let page = 2; // Start from the second page
        let fetchedCount = initialCount;
        while (fetchedCount < totalCount) {
            const songData = await Musify.api.getPlaylistDetails(playlistId, page);
            if (songData?.data?.songs && songData.data.songs.length > 0) {
                Musify.render.append(playlistSongs, songData.data.songs, Musify.render.songCard);
                Musify.state.songQueue.push(...songData.data.songs);
                fetchedCount += songData.data.songs.length;
                page++;
            } else {
                break; // Stop if there are no more results or an error occurs
            }
        }
        loadingIndicator.remove();
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

    async showArtist(event, artistId) {
        if (event && event.target.closest('button')) {
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
            const initialSongs = data.topSongs;
            Musify.render.populate(artistTopSongs, initialSongs, Musify.render.songCard, 'No top songs found.', 'Could not load songs.');
            Musify.state.songQueue = [...initialSongs];

            // Fetch all remaining songs if there are more than the top songs
            if (data.songCount > initialSongs.length) {
                this.fetchAllArtistSongs(artistId, initialSongs.length, data.songCount);
            }
        } else {
            Musify.render._renderMessage(artistTopSongs, 'Failed to load artist details.', 'error');
        }
    },
    async fetchAllArtistSongs(artistId, initialCount, totalCount) {
        const { artistTopSongs } = Musify.ui;
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading';
        loadingIndicator.textContent = 'Loading more...';
        artistTopSongs.appendChild(loadingIndicator);

        let page = 1;
        let fetchedCount = initialCount;
        while (fetchedCount < totalCount) {
            const songData = await Musify.api.getArtistSongs(artistId, page);
            if (songData?.data?.results && songData.data.results.length > 0) {
                Musify.render.append(artistTopSongs, songData.data.results, Musify.render.songCard);
                Musify.state.songQueue.push(...songData.data.results);
                fetchedCount += songData.data.results.length;
                page++;
            } else {
                break; // Stop if there are no more results or an error occurs
            }
        }
        loadingIndicator.remove();
    },
  },

  utils: {
    addMobileGestures() {
        const player = document.querySelector('.bottom-player');
        let touchStartX = 0;
        let touchEndX = 0;

        player.addEventListener('touchstart', (event) => {
            // Ignore touch if it's on a button or the progress bar
            if (event.target.closest('button, input[type="range"], .mobile-progress-bar')) return;
            touchStartX = event.changedTouches[0].screenX;
        }, { passive: true });

        player.addEventListener('touchend', (event) => {
            if (touchStartX === 0) return; // Touch was ignored
            touchEndX = event.changedTouches[0].screenX;
            const deltaX = touchEndX - touchStartX;
            if (Math.abs(deltaX) > 50) { // Minimum swipe distance
                if (deltaX < 0) Musify.player.next(); // Swipe left
                if (deltaX > 0) Musify.player.prev(); // Swipe right
            }
            touchStartX = 0; // Reset
        }, { passive: true });

        // Make mobile progress bar seekable
        const mobileProgressBar = Musify.ui.mobileProgressBar;
        const seek = (e) => {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const rect = mobileProgressBar.getBoundingClientRect();
            let percentage = (clientX - rect.left) / rect.width;
            percentage = Math.max(0, Math.min(1, percentage)); // Clamp between 0 and 1
            Musify.ui.audioPlayer.currentTime = Musify.ui.audioPlayer.duration * percentage;
        };

        let isDragging = false;
        mobileProgressBar.addEventListener('touchstart', (e) => {
            isDragging = true;
            seek(e);
        }, { passive: true });
        mobileProgressBar.addEventListener('touchmove', (e) => {
            if (isDragging) seek(e);
        }, { passive: true });
        mobileProgressBar.addEventListener('touchend', () => {
            isDragging = false;
        });
        mobileProgressBar.addEventListener('click', seek);
    },
    applyRippleEffect(event) {
        const button = event.target.closest('button');

        if (button) {
            // Prevent ripple on settings buttons if desired
            if (button.closest('.settings-option')) return;

            const circle = document.createElement('span');
            const diameter = Math.max(button.clientWidth, button.clientHeight);
            const radius = diameter / 2;

            circle.style.width = circle.style.height = `${diameter}px`;
            circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
            circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
            circle.classList.add('ripple');

            const ripple = button.getElementsByClassName('ripple')[0];
            if (ripple) ripple.remove();
            
            button.appendChild(circle);
        }
    },
    addQueueDragHandlers() {
        const queueList = Musify.ui.queueList;
        let draggedItem = null;

        queueList.addEventListener('dragstart', e => {
            draggedItem = e.target.closest('.song');
            if (!draggedItem) return;
            // Add a slight delay to allow the browser to create the drag image
            setTimeout(() => {
                if (draggedItem) draggedItem.classList.add('dragging');
            }, 0);
        });

        queueList.addEventListener('dragend', () => {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
            }
        });

        queueList.addEventListener('dragover', e => {
            e.preventDefault();
            const target = e.target.closest('.song');
            if (target && target !== draggedItem) {
                const rect = target.getBoundingClientRect();
                const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
                if (next) {
                    queueList.insertBefore(draggedItem, target.nextSibling);
                } else {
                    queueList.insertBefore(draggedItem, target);
                }
            }
        });

        queueList.addEventListener('drop', e => {
            e.preventDefault();
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                const newOrderIds = [...queueList.querySelectorAll('.song')].map(el => el.dataset.songId);
                const newQueue = newOrderIds.map(id => Musify.state.songQueue.find(s => s.id === id));
                
                // Update state and current index
                const currentSongId = Musify.state.songQueue[Musify.state.currentSongIndex]?.id;
                Musify.state.songQueue = newQueue;
                Musify.state.currentSongIndex = newQueue.findIndex(s => s.id === currentSongId);
                
                draggedItem = null;
            }
        });
    },
    addNowPlayingGestures() {
        const artElement = Musify.ui.nowPlayingImg;
        let touchStartX = 0;

        artElement.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        artElement.addEventListener('touchend', e => {
            if (touchStartX === 0) return;
            const touchEndX = e.changedTouches[0].screenX;
            const deltaX = touchEndX - touchStartX;

            if (Math.abs(deltaX) > 60) { // Minimum swipe distance
                if (deltaX < 0) Musify.player.next(); // Swipe Left
                else Musify.player.prev(); // Swipe Right
            }
            touchStartX = 0; // Reset
        }, { passive: true });
    },
    applyRippleEffect(event) {
        const button = event.target.closest('button');

        if (button) {
            const circle = document.createElement('span');
            const diameter = Math.max(button.clientWidth, button.clientHeight);
            const radius = diameter / 2;

            circle.style.width = circle.style.height = `${diameter}px`;
            circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
            circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
            circle.classList.add('ripple');

            const ripple = button.getElementsByClassName('ripple')[0];
            if (ripple) ripple.remove();
            
            button.appendChild(circle);
        }
    },
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
        
        const isFavourited = Musify.utils.isFavourited(songId); // Corrected reference
        let playlistItems = '';
        if (Musify.state.userPlaylists.length > 0) {
            playlistItems = Musify.state.userPlaylists.map(p => `<li onclick="addSongToPlaylist('${songId}', '${p.id}')"><i class="fas fa-list"></i> Add to ${p.name}</li>`).join('');
        }

        menu.innerHTML = `
            <ul>
                <li onclick="Musify.utils.startRadio('${songId}')"><i class="fas fa-broadcast-tower"></i> Start Radio</li>
                <li onclick="Musify.utils.downloadSong('${songId}')"><i class="fas fa-download"></i> Download</li>
                ${playlistItems ? '<li class="separator"></li>' : ''}
                ${playlistItems}
                <li onclick="Musify.utils.toggleFavourite('${songId}')">
                    <i class="fas fa-heart" style="color: ${isFavourited ? 'var(--accent)' : 'inherit'}"></i>
                    ${isFavourited ? 'Remove from Favourites' : 'Add to Favourites'}
                </li>
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
                <li onclick="Musify.navigation.showPlaylist(event, '${playlistId}')"><i class="fas fa-eye"></i> View Playlist</li>
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
    removeFromQueue(event, songId) {
        event.stopPropagation();
        const state = Musify.state;
        const indexToRemove = state.songQueue.findIndex(s => s.id === songId);

        if (indexToRemove > -1) {
            state.songQueue.splice(indexToRemove, 1);
            // Adjust current index if needed
            if (indexToRemove < state.currentSongIndex) {
                state.currentSongIndex--;
            }
            // Re-render the queue
            Musify.navigation.toggleQueueView(true);
        }
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
        const volume = localStorage.getItem('musify_volume');
        if (volume !== null) {
            const volumeValue = parseFloat(volume);
            Musify.ui.volumeSlider.value = volumeValue;
            Musify.ui.nowPlayingVolumeSlider.value = volumeValue;
            Musify.player.setVolume(volumeValue);
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
                    Musify.player.updateMediaSession(songDetails);
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
    async startRadio(songId, append = false) {
        const suggestionsData = await Musify.api.getSongSuggestions(songId, 20);
        const originalSong = Musify.state.songQueue.find(s => s.id === songId)
            || Musify.state.history.find(s => s.id === songId)
            || Musify.state.favourites.find(s => s.id === songId);

        if (suggestionsData?.data && originalSong) {
            if (append) {
                Musify.state.songQueue.push(...suggestionsData.data);
            } else {
                Musify.state.songQueue = [originalSong, ...suggestionsData.data];
                Musify.state.currentSongIndex = 0;
                Musify.player.playCurrent();
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
    clearQueue() {
        if (confirm('Are you sure you want to clear the queue?')) {
            Musify.state.songQueue = [Musify.state.songQueue[Musify.state.currentSongIndex]].filter(Boolean);
            Musify.state.currentSongIndex = Musify.state.songQueue.length > 0 ? 0 : -1;
            Musify.navigation.toggleQueueView(true); // Refresh view
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
