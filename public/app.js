const MTUNE = {
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
    notifications: true,
    dynamicTheme: true,
    dynamicButtons: true,
    dynamicBackground: true,
    search: {
      currentPage: 0,
      totalResults: 0,
      isLoading: false,
      query: '',
      songs: { currentPage: 1, results: [], total: 0 },
      albums: { currentPage: 1, results: [], total: 0 },
      artists: { currentPage: 1, results: [], total: 0 },
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

    searchAll: (query) => MTUNE.api._fetch(`/search?query=${encodeURIComponent(query)}`),
    getSongDetails: (id) => MTUNE.api._fetch(`/songs/${id}`),
    getPlaylistDetails: (id, page = 1, limit = 50) => MTUNE.api._fetch(`/playlists?id=${id}&page=${page}&limit=${limit}`),
    getAlbumDetails: (id) => MTUNE.api._fetch(`/albums?id=${id}`),
    getArtistDetails: (id) => MTUNE.api._fetch(`/artists?id=${id}`),
    getArtistSongs: (id, page) => MTUNE.api._fetch(`/artists/${id}/songs?page=${page}&limit=50`),
    getSongSuggestions: (songId, limit = 10) => MTUNE.api._fetch(`/songs/${songId}/suggestions?limit=${limit}`),
    getCharts: () => MTUNE.api._fetch('/charts'),
    getNewReleases: () => MTUNE.api._fetch('/modules?language=hindi,english'),
    getTopPlaylists: () => MTUNE.api._fetch('/modules?language=hindi,english'),
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
      playlistSearchResults: document.getElementById('playlistSearchResults'),
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
      dynamicButtonsToggle: document.getElementById('dynamicButtonsToggle'),
      dynamicBackgroundToggle: document.getElementById('dynamicBackgroundToggle'),
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
      nowPlayingLikeBtn: document.getElementById('nowPlayingLikeBtn'),
      nowPlayingOptionsBtn: document.getElementById('nowPlayingOptionsBtn'),
      nowPlayingVolumeSlider: document.getElementById('nowPlayingVolumeSlider'),
      lyricsContainer: document.getElementById('lyricsContainer'),
      lyricsContent: document.getElementById('lyricsContent'),
      queueContainer: document.getElementById('queueContainer'),
      queueList: document.getElementById('queueList'),
      queueNowPlaying: document.getElementById('queueNowPlaying'),
      // Playlist Modal
      playlistModal: document.getElementById('playlistModal'),
      modalPlaylistList: document.getElementById('modalPlaylistList'),
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
    // Data-driven settings toggles
    Object.keys(this.utils.settingsConfig).forEach(settingKey => {
        const toggle = document.querySelector(`[data-setting="${settingKey}"]`);
        if (toggle) {
            toggle.addEventListener('change', (e) => this.utils.handleSettingToggle(settingKey, e.target.checked));
        }
    });
    document.querySelectorAll('.settings-nav-item').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.settings-nav-item').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.settings-pane').forEach(pane => pane.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(button.dataset.target).classList.add('active');
        });
    });
    // Add mobile-specific gesture listeners
    this.utils.addMobileGestures();
    this.utils.addNowPlayingGestures();

    // Use event delegation for marquee effect and infinite scroll
    this.ui.mainContent.addEventListener('mouseover', this.utils.handleMarquee);
    this.ui.mainContent.addEventListener('mouseout', this.utils.handleMarquee);
    this.ui.mainContent.addEventListener('scroll', this.utils.handleInfiniteScroll);
    // Add ripple effect to all buttons
    this.utils.addQueueDragHandlers();
    this.utils.addSongCardInteractionHandlers();
    this.utils.addQueueInteractionHandlers();
    document.addEventListener('click', this.utils.applyRippleEffect);


    // Load initial state
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
      return imageArray?.[2]?.url || imageArray?.[1]?.url || imageArray?.[0]?.url || '/default_cover.jpg';
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
        let playButtonClickAction = `MTUNE.player.playFromCardContext(event, '${item.id}', '${type}')`;

        if (type === 'song') {
            cardClickAction = `MTUNE.player.playSongFromCard(event, '${item.id}')`;
        } else if (type === 'artist' && item.songs && item.songs.length > 0) {
            playButtonClickAction = `MTUNE.player.playFromCardContext(event, '${item.id}', 'artist', true)`;
        } else {
            const functionMap = { 'playlist': 'showPlaylist', 'album': 'showAlbum', 'artist': 'showArtist' };
            cardClickAction = `MTUNE.navigation.${functionMap[type]}(event, '${item.id}')`;
        }

        div.innerHTML = `
            <div class="discover-card-art" onclick="${cardClickAction}">
                <img src="${this._getImageUrl(item.image)}" alt="${this._decode(item.name || item.title)}" loading="lazy" onerror="this.src='/default_cover.jpg'"/>
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

      div.dataset.songId = song.id;
      const img = document.createElement('img');
      img.src = this._getImageUrl(song.image);
      img.alt = this._decode(song.title);
      img.onerror = () => { img.src = '/default_cover.jpg'; };

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
	  durationSpan.textContent = MTUNE.player.formatTime(song.duration || 0);
      const contextBtn = inQueue 
        ? this._createButton('options-btn remove-from-queue-btn', `MTUNE.utils.removeFromQueue(event, '${song.id}')`, 'Remove from queue', 'fas fa-times') : null;
      const playBtn = this._createButton('play-btn', `MTUNE.player.playSongFromCard(event, '${song.id}')`, `Play ${this._decode(song.name || song.title)}`, 'fas fa-play');
      img.insertAdjacentElement('afterend', playBtn);
      div.append(img, infoDiv, durationSpan);
      if (contextBtn) div.appendChild(contextBtn);
      return div;
    },
    playlistCard(pl) {
      const div = document.createElement('div');
      div.className = 'playlist';

      // If it's a user playlist with no songs, show a placeholder icon instead of an image.
      const isNewUserPlaylist = pl.id.startsWith('user_') && (!pl.songs || pl.songs.length === 0);
      const imageContent = isNewUserPlaylist
        ? `<div class="playlist-placeholder"><i class="fas fa-music"></i></div>`
        : `<img src="${this._getImageUrl(pl.image)}" alt="${this._decode(pl.name || pl.title)}" onerror="this.src='/default_cover.jpg'" loading="lazy"/>`;

      div.innerHTML = ` 
        ${imageContent}
        <div><strong><span>${this._decode(pl.name || pl.title)}</span></strong></div>
      `;
      div.onclick = (e) => MTUNE.navigation.showPlaylist(e, pl.id, false);
      return div;
    },
    albumCard(album) {
      const div = document.createElement('div');
      div.className = 'album';
      div.innerHTML = `
        <img src="${this._getImageUrl(album.image)}" alt="${this._decode(album.name || album.title)}" onerror="this.src='/default_cover.jpg'" loading="lazy"/>
        <div><strong><span>${this._decode(album.name || album.title)}</span></strong></div>
        <small>${this._decode(album.primaryArtists || 'Various Artists')}</small>
        <button onclick="MTUNE.navigation.showAlbum('${album.id}')" title="View Album"><i class="fas fa-info-circle"></i></button>
      `;
      return div;
    },
    timelineCard(artist) {
      const div = document.createElement('div');
      div.className = 'artist';
      div.innerHTML = `
        <img src="${this._getImageUrl(artist.image)}" alt="${this._decode(artist.title)}" onerror="this.src='/default_artist.jpg'" loading="lazy"/>
        <div>
            <strong><span>${this._decode(artist.name || artist.title)}</span></strong>
            <small class="card-meta">
                <span>${this._decode(artist.role || 'Artist')}</span>
            </small>
        </div>
        <button onclick="MTUNE.navigation.showArtist(event, '${artist.id}')" title="View artist"><i class="fas fa-info-circle"></i></button>
      `;
      div.onclick = (e) => MTUNE.navigation.showArtist(e, artist.id);
      return div;
    },


    createPlaylistCard() {
        const div = document.createElement('div');
        div.className = 'album'; // Reuse album card styling
        div.style.cursor = 'pointer';
        div.onclick = () => MTUNE.navigation.createNewPlaylist();
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
      items.forEach(item => container.appendChild(cardRenderer.call(MTUNE.render, item)));
    },
    append(container, items, cardRenderer) {
      const loading = container.querySelector('.loading, .error');
      if (loading) loading.remove();
      items.forEach(item => container.appendChild(cardRenderer(item)));
    },
    playlistHeader(playlist) {
        const header = MTUNE.ui.playlistDetailsHeader;
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
                <button class="nav-btn active" onclick="MTUNE.player.playFromQueue(MTUNE.state.songQueue[0].id)"><i class="fas fa-play"></i> Play All</button>
            </div>
        `;
    },
    albumHeader(album) {
        const header = MTUNE.ui.albumDetailsHeader;
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
                <button class="nav-btn active" onclick="MTUNE.player.playFromQueue(MTUNE.state.songQueue[0].id)"><i class="fas fa-play"></i> Play All</button>
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
        const header = MTUNE.ui.artistDetailsHeader;
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
                <button class="nav-btn active" onclick="MTUNE.player.playFromQueue(MTUNE.state.songQueue[0].id)"><i class="fas fa-play"></i> Play Top Songs</button>
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
        let sourceList, shouldReplaceQueue = true;
        switch (songListContainer.id) {
            case 'recommendedSongs': // This was the missing case
                sourceList = MTUNE.state.discover?.songs || [];
                break;
            case 'queueList':
                shouldReplaceQueue = false;
                break;
            case 'historyList':
                sourceList = MTUNE.state.history;
                break;
            case 'favouriteSongsList':
                sourceList = MTUNE.state.favourites;
                break;
            default: // Includes search, playlist, album, artist, and queue views
                sourceList = MTUNE.state.songQueue;
        }
	
        if (shouldReplaceQueue && sourceList && sourceList.length > 0) {
            MTUNE.state.songQueue = sourceList;
        }
        this.playFromQueue(songId);
    },
    async playFromCardContext(event, itemId, itemType, useDiscoverContext = false) {
        event.stopPropagation(); // Don't trigger the card's navigation
        
        // Clear search and hide suggestions when an item is played
        MTUNE.ui.searchBar.value = '';
        MTUNE.ui.searchSuggestions.classList.remove('active');

        let songs = [];
        let data;

        MTUNE.utils.showNotification(`Loading ${itemType}...`);

        try {
            switch (itemType) {
                case 'playlist':
                    data = await MTUNE.api.getPlaylistDetails(itemId, 1, 100); // Fetch a good chunk initially
                    songs = data?.data?.songs || [];
                    break;
                case 'album':
                    data = await MTUNE.api.getAlbumDetails(itemId);
                    songs = data?.data?.songs || [];
                    break;
                case 'artist':
                    songs = useDiscoverContext ? MTUNE.state.discover.artists.find(a => a.id === itemId)?.topSongs || [] : (await MTUNE.api.getArtistDetails(itemId))?.data?.topSongs || [];
                    break;
                case 'song':
                    data = await MTUNE.api.getSongDetails(itemId);
                    songs = data?.data || [];
                    MTUNE.state.songQueue = MTUNE.state.discover.songs; // Set context to all recommended songs
                    break;
            }

            if (songs.length > 0) {
                MTUNE.state.songQueue = songs;
                this.playFromQueue(songs[0].id);
            } else {
                MTUNE.utils.showNotification(`Could not find any songs for this ${itemType}.`, 'error');
            }
        } catch (error) {
            MTUNE.utils.showNotification(`Failed to load ${itemType}.`, 'error');
            console.error(`Error playing from ${itemType} card:`, error);
        }
    },
    playFromQueue(songId) {
      const index = MTUNE.state.songQueue.findIndex(s => s.id === songId);
      if (index !== -1) {
        MTUNE.state.currentSongIndex = index;
        this.playCurrent();
      }
    },
    async _getPlayableSong(songFromQueue) {
        // If the song from the queue doesn't have a downloadUrl, fetch the full details.
        if (!songFromQueue.downloadUrl || songFromQueue.downloadUrl.length === 0) {
            try {
                const fullDetails = await MTUNE.api.getSongDetails(songFromQueue.id);
                const songDetails = fullDetails?.data?.[0];
                if (songDetails) {
                    // Update the queue with full details for future use
                    const queueIndex = MTUNE.state.songQueue.findIndex(s => s.id === songDetails.id);
                    if (queueIndex > -1) {
                        MTUNE.state.songQueue[queueIndex] = songDetails;
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
      const state = MTUNE.state;
      if (state.currentSongIndex < 0 || state.currentSongIndex >= state.songQueue.length) return;

      const song = state.songQueue[state.currentSongIndex];
      this.updateInfo(song);
      MTUNE.ui.playPauseIcon.className = 'fas fa-spinner fa-spin';

      const songDetails = await this._getPlayableSong(song);

      if (songDetails && Array.isArray(songDetails.downloadUrl) && songDetails.downloadUrl.length > 0) {
        const quality = MTUNE.state.audioQuality;
        const bestQuality = songDetails.downloadUrl.find(u => u.quality === quality) || songDetails.downloadUrl.at(-1);
        MTUNE.ui.audioPlayer.src = bestQuality.url || bestQuality.link;
        MTUNE.ui.audioPlayer.load(); // Explicitly load the new source

        try {
          await MTUNE.ui.audioPlayer.play();
          state.isPlaying = true;
          MTUNE.ui.playPauseIcon.className = 'fas fa-pause';
          MTUNE.ui.mobilePlayPauseIcon.className = 'fas fa-pause';
          MTUNE.ui.likeBtn.classList.toggle('active', MTUNE.utils.isFavourited(song.id));
          this.addToHistory(songDetails);
          this.updateMediaSession(songDetails);
        } catch (e) {
          state.isPlaying = false;
          MTUNE.ui.playPauseIcon.className = 'fas fa-play';
          MTUNE.ui.mobilePlayPauseIcon.className = 'fas fa-play';
          console.error("Playback failed", e);
        }
      } else {
        MTUNE.ui.playPauseIcon.className = 'fas fa-play';
        MTUNE.ui.mobilePlayPauseIcon.className = 'fas fa-play';
        console.error('Song object from queue is missing downloadUrl:', songDetails);
        MTUNE.utils.showNotification(`Unable to get a playable link for "${song.name || song.title}".`, 'error');
      }
    },
    updateInfo(song) {
      const title = MTUNE.render._decode(song.name || song.title || 'Unknown Title');
      MTUNE.ui.currentSongTitle.innerHTML = `<strong><span>${title}</span></strong>`;
      MTUNE.ui.currentSongArtist.textContent = MTUNE.render._decode(song.primaryArtists || song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist');
      MTUNE.ui.currentSongImg.src = MTUNE.render._getImageUrl(song.image);
      MTUNE.ui.nowPlayingLikeBtn.classList.toggle('active', MTUNE.utils.isFavourited(song.id));
      MTUNE.ui.likeBtn.classList.toggle('active', MTUNE.utils.isFavourited(song.id));
      MTUNE.ui.playPauseIcon.className = MTUNE.state.isPlaying ? 'fas fa-pause' : 'fas fa-play';
      MTUNE.utils.updatePlayerTheme(MTUNE.render._getImageUrl(song.image));

      // Update Now Playing View
      const isPlaying = MTUNE.state.isPlaying;
      MTUNE.ui.mobilePlayPauseIcon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
      MTUNE.ui.nowPlayingPlayPauseIcon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';

      MTUNE.ui.nowPlayingImg.src = MTUNE.render._getImageUrl(song.image);
      MTUNE.ui.nowPlayingTitle.textContent = title;
      MTUNE.ui.nowPlayingArtist.textContent = MTUNE.render._decode(song.primaryArtists || song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist');
      document.querySelector('.now-playing-bg').style.backgroundImage = `url(${MTUNE.render._getImageUrl(song.image)})`;

      // Highlight current song in queue view
      // Remove highlight from any currently highlighted song across the app
      document.querySelectorAll('.song.is-playing').forEach(el => el.classList.remove('is-playing'));
      // Add highlight to the new current song in any visible list
      const currentQueueItem = document.querySelector(`.song[data-song-id="${song.id}"]`);
      if (currentQueueItem) currentQueueItem.classList.add('is-playing');
    },
    updateMediaSession(song) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: MTUNE.render._decode(song.name || song.title),
                artist: MTUNE.render._decode(song.primaryArtists || song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist'),
                album: MTUNE.render._decode(song.album?.name || ''),
                artwork: song.image.map(img => ({ src: img.url, sizes: `${img.quality.split('x')[0]}x${img.quality.split('x')[1]}`, type: 'image/jpeg' }))
            });

            navigator.mediaSession.setActionHandler('play', () => this.togglePlayPause());
            navigator.mediaSession.setActionHandler('pause', () => this.togglePlayPause());
            navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
        }
    },
    togglePlayPause() {
      const { audioPlayer } = MTUNE.ui;
      if (!audioPlayer.src && MTUNE.state.songQueue.length > 0) {
        MTUNE.state.currentSongIndex = 0;
        this.playCurrent();
        return;
      }
      if (audioPlayer.paused) audioPlayer.play();
      else audioPlayer.pause();
    },
    updatePlayPauseIcons(isPlaying) {
        const { playPauseIcon, mobilePlayPauseIcon } = MTUNE.ui;
        const iconClass = isPlaying ? 'fa-pause' : 'fa-play';
        if (playPauseIcon) playPauseIcon.className = `fas ${iconClass}`;
        if (mobilePlayPauseIcon) mobilePlayPauseIcon.className = `fas ${iconClass}`;
        if (MTUNE.ui.nowPlayingPlayPauseIcon) {
            MTUNE.ui.nowPlayingPlayPauseIcon.className = `fas ${iconClass}`;
        }
    },
    next() {
      // Mobile-only: if player is compact, show next/prev buttons briefly on song change
      if (window.innerWidth <= 768) {
      }
      const state = MTUNE.state;
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
      }
      const state = MTUNE.state;
      if (state.songQueue.length === 0) return;
      if (state.isShuffle) {
        state.currentSongIndex = Math.floor(Math.random() * state.songQueue.length);
      } else {
        state.currentSongIndex = (state.currentSongIndex - 1 + state.songQueue.length) % state.songQueue.length;
      }
      this.playCurrent();
    },
    toggleShuffle() {
      MTUNE.state.isShuffle = !MTUNE.state.isShuffle;
      const isActive = MTUNE.state.isShuffle;
      MTUNE.ui.shuffleBtn.classList.toggle('active', isActive);
      MTUNE.ui.nowPlayingShuffleBtn.classList.toggle('active', isActive);
      MTUNE.ui.shuffleBtn.title = `Shuffle ${isActive ? 'On' : 'Off'}`;
    },
    toggleRepeat() {
      const { repeatBtn, repeatIcon, nowPlayingRepeatBtn, nowPlayingRepeatIcon } = MTUNE.ui;
      const state = MTUNE.state;
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
      const { audioPlayer, progressBar, mobileProgressBar, currentTime, totalDuration, nowPlayingProgressBar, nowPlayingCurrentTime, nowPlayingTotalDuration } = MTUNE.ui;
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
      const { audioPlayer, progressBar, nowPlayingProgressBar } = MTUNE.ui;
      // If no specific progress bar is passed, default to the main one
      sourceProgressBar = sourceProgressBar || progressBar;
      if (!audioPlayer.duration) return;
      audioPlayer.currentTime = (sourceProgressBar.value / 100) * audioPlayer.duration;
    },
    setVolume(value) {
        MTUNE.ui.audioPlayer.volume = value;
        localStorage.setItem('musify_volume', value);
        MTUNE.ui.volumeSlider.value = value;
        MTUNE.ui.nowPlayingVolumeSlider.value = value;
    },
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    },
    handleSongEnd() {
      if (MTUNE.state.repeatMode === 'one') {
        MTUNE.ui.audioPlayer.currentTime = 0;
        MTUNE.ui.audioPlayer.play();
      } else {
        this.next();
      }

      // Check for endless queue
      const state = MTUNE.state;
      if (state.endlessQueue && state.currentSongIndex === state.songQueue.length - 1) {
          MTUNE.utils.startRadio(state.songQueue[state.currentSongIndex].id, true); // Start radio without replacing queue
      }
    },
    playFromHistory(songId) {
        // Set the history as the current queue and play the selected song
        MTUNE.state.songQueue = MTUNE.state.history;
        const index = MTUNE.state.songQueue.findIndex(s => s.id === songId);
        if (index !== -1) this.playFromQueue(songId);
    },
    addToHistory(song) {
        // Add to history only if it's not the last song added
        if (MTUNE.state.history[0]?.id !== song.id) {
            MTUNE.state.history.unshift(song);
            if (MTUNE.state.history.length > 50) { // Limit history size
                MTUNE.state.history.pop();
            }
            localStorage.setItem('musify_history', JSON.stringify(MTUNE.state.history));
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

      const { navigation } = MTUNE.state;
      if (navigation.currentSection !== sectionId) {
        navigation.previousSection = navigation.currentSection;
        navigation.currentSection = sectionId;
        if (sectionId.includes('-details')) navigation.loadedSections.delete(sectionId);
      }
      document.querySelectorAll('.nav-btn').forEach(btn => {
        const btnSection = btn.dataset.section;
        btn.classList.toggle('active', btnSection === sectionId);
      });

      // Toggle a class on the main content area for responsive CSS to handle the search bar
      if (sectionId === 'search') {
        MTUNE.ui.mainContent.classList.add('search-active');
      } else {
        MTUNE.ui.mainContent.classList.remove('search-active');
      }

      const loadAction = {
        'discover': MTUNE.navigation.loadDiscover,
        'search': MTUNE.navigation.loadSongs,
        'library': MTUNE.navigation.loadLibrary,
        'favourites': MTUNE.navigation.loadFavourites,
        'saved-playlists': MTUNE.navigation.loadSavedPlaylists,
        'downloads': () => {}, // Placeholder
        'history': MTUNE.navigation.loadHistory,
        'timeline': MTUNE.navigation.loadTimeline,
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
        const current = MTUNE.state.navigation.currentSection;
        if (current.includes('-details')) {
            this.showSection(MTUNE.state.navigation.previousSection || 'discover');
        } else {
            this.showSection('discover');
        }
    },

    toggleNowPlayingView(show) {
        const { nowPlayingView } = MTUNE.ui;
        nowPlayingView.classList.toggle('active', show);
    },

    toggleLyrics(show) {
        const { lyricsContainer } = MTUNE.ui;
        lyricsContainer.classList.toggle('active', show);
    },

    toggleQueueView(show) {
        const { queueContainer, queueList, queueNowPlaying } = MTUNE.ui;
        queueContainer.classList.toggle('active', show);
        if (show) {
            const currentSongId = MTUNE.state.songQueue[MTUNE.state.currentSongIndex]?.id;
            const currentSong = MTUNE.state.songQueue.find(s => s.id === currentSongId);
            if (currentSong) {
                queueNowPlaying.innerHTML = '';
                queueNowPlaying.appendChild(MTUNE.render.songCard(currentSong, { inQueue: true }));
            }
            const upcomingSongs = MTUNE.state.songQueue.slice(MTUNE.state.currentSongIndex + 1);
            MTUNE.render.populate(queueList, upcomingSongs, (s) => MTUNE.render.songCard(s, { inQueue: true }), 'The queue is empty.', 'Could not load queue.');
            const currentQueueItem = queueList.querySelector(`.song[data-song-id="${currentSongId}"]`);
            if (currentQueueItem) currentQueueItem.classList.add('is-playing');
        }
    },

    async loadDiscover() {
      const { recommendedSongs, recommendedAlbums, recommendedPlaylists, recommendedArtists, contentSections } = MTUNE.ui;
      const discoverSection = contentSections[0]; // Assuming discover is the first section
      const recommendedSongsHeader = discoverSection.querySelector('section:first-of-type h2');

      MTUNE.render._renderMessage(recommendedSongs, 'Loading Recommendations...');
      MTUNE.render._renderMessage(recommendedAlbums, 'Loading Recommended Albums...');
      MTUNE.render._renderMessage(recommendedPlaylists, 'Loading Recommended Playlists...');
      MTUNE.render._renderMessage(recommendedArtists, 'Loading Recommended Artists...');

      // --- Enhanced Smart Recommendation Logic ---
      const history = MTUNE.state.history.slice(0, 10);
      const favourites = MTUNE.state.favourites.slice(0, 10);
      const seedSongs = [...new Map([...favourites, ...history].map(song => [song.id, song])).values()].slice(0, 20);
      let songData = null;

      if (seedSongs.length > 0) {
          const randomSeedSong = seedSongs[Math.floor(Math.random() * seedSongs.length)];
          songData = await MTUNE.api.getSongSuggestions(randomSeedSong.id, 30);
          if (songData?.data) {
              if (MTUNE.utils.isFavourited(randomSeedSong.id)) {
                  recommendedSongsHeader.textContent = 'Because You Like ' + MTUNE.render._decode(randomSeedSong.name);
              } else {
                  recommendedSongsHeader.textContent = 'Based on Your Recent Listening';
              }
          }
      }

      const [albumData, playlistData, artistData] = await Promise.all([
        MTUNE.api._fetch('/search/albums?query=top albums&limit=30'),
        MTUNE.api._fetch('/search/playlists?query=top playlists&limit=30'),
        MTUNE.api._fetch('/search/artists?query=popular artists&limit=10') // Fetch fewer artists to get their songs
      ]);

      // Fetch songs for each recommended artist
      if (artistData?.data?.results) {
          const artistSongPromises = artistData.data.results.map(artist => 
              MTUNE.api.getArtistDetails(artist.id).then(details => ({...artist, topSongs: details?.data?.topSongs || [] }))
          );
          artistData.data.results = await Promise.all(artistSongPromises);
      }

      // Store the fetched data in the state for the player to use
      MTUNE.state.discover = {
          songs: songData?.data || (await MTUNE.api._fetch('/search/songs?query=latest hits&limit=30'))?.data?.results || [],
          albums: albumData?.data?.results || [],
          playlists: playlistData?.data?.results || [],
          artists: artistData?.data?.results || [],
      };

      // Populate the new "Recommended" sections
      MTUNE.render.populate(recommendedSongs, MTUNE.state.discover.songs, MTUNE.render.discoverCard, 'No recommended songs found.', 'Failed to load songs.');
      MTUNE.render.populate(recommendedAlbums, MTUNE.state.discover.albums, MTUNE.render.discoverCard, 'No recommended albums found.', 'Failed to load albums.');
      MTUNE.render.populate(recommendedPlaylists, MTUNE.state.discover.playlists, MTUNE.render.discoverCard, 'No recommended playlists found.', 'Failed to load playlists.');
      MTUNE.render.populate(recommendedArtists, MTUNE.state.discover.artists, MTUNE.render.discoverCard, 'No recommended artists found.', 'Failed to load artists.');
    },

    loadSongs() {
      // This function is called when switching to the search tab.
      // We'll just show the initial prompt and wait for the user to search.
      document.getElementById('searchResultsContainer').style.display = 'none';
      const searchSection = document.getElementById('search');
      if (!searchSection.querySelector('.initial-prompt')) searchSection.insertAdjacentHTML('beforeend', '<div class="initial-prompt loading">Use the search bar to find songs, albums, and artists.</div>');
    },

    triggerSearch() {
      if (MTUNE.ui.searchSuggestions) MTUNE.ui.searchSuggestions.classList.remove('active');
      // Do not clear the search bar here, so the user can see what they searched for.
      this.search(true);
    },

    async search(isNewSearch = false) {
      const { search } = MTUNE.state;
      const { songList, albumSearchResults, playlistSearchResults, artistSearchResults } = MTUNE.ui;
      const query = MTUNE.ui.searchBar.value.trim();

      if (search.isLoading || !query) {
        if (isNewSearch) {
            search.songs = { currentPage: 1, results: [], total: 0 };
            search.albums = { currentPage: 1, results: [], total: 0 };
            search.playlists = { currentPage: 1, results: [], total: 0 };
            search.artists = { currentPage: 1, results: [], total: 0 };
            document.getElementById('searchResultsContainer').style.display = 'none';
            const searchSection = document.getElementById('search');
            if (!searchSection.querySelector('.initial-prompt')) searchSection.insertAdjacentHTML('beforeend', '<div class="initial-prompt loading">Use the search bar to find songs, albums, and artists.</div>');
        }
        return;
      }

      if (isNewSearch) {
        search.query = query;
        search.songs = { currentPage: 1, results: [], total: 0 };
        search.albums = { currentPage: 1, results: [], total: 0 };
        search.playlists = { currentPage: 1, results: [], total: 0 };
        search.artists = { currentPage: 1, results: [], total: 0 };
        MTUNE.state.songQueue = [];
        const initialPrompt = document.querySelector('#search .initial-prompt');
        if (initialPrompt) initialPrompt.remove();
        document.getElementById('searchResultsContainer').style.display = 'flex';
        songList.innerHTML = '';
        albumSearchResults.innerHTML = '';
        playlistSearchResults.innerHTML = '';
        artistSearchResults.innerHTML = '';
        MTUNE.render._renderMessage(songList, 'Searching for songs...');
        MTUNE.render._renderMessage(albumSearchResults, 'Searching for albums...');
        MTUNE.render._renderMessage(playlistSearchResults, 'Searching for playlists...');
        MTUNE.render._renderMessage(artistSearchResults, 'Searching for artists...');
      }

      search.isLoading = true;

      // Increase the limit to fetch more results initially
      const songData = await MTUNE.api._fetch(`/search/songs?query=${search.query}&page=${search.songs.currentPage}&limit=50`);
      const albumData = await MTUNE.api._fetch(`/search/albums?query=${search.query}&page=${search.albums.currentPage}&limit=24`);
      const playlistData = await MTUNE.api._fetch(`/search/playlists?query=${search.query}&page=${search.playlists.currentPage}&limit=24`);
      const artistData = await MTUNE.api._fetch(`/search/artists?query=${search.query}&page=${search.artists.currentPage}&limit=24`);

      if (isNewSearch) {
          // Populate songs
          search.songs.results = songData?.data?.results || [];
          search.songs.total = songData?.data?.total || 0;
          MTUNE.render.populate(songList, search.songs.results, MTUNE.render.discoverCard, 'No songs found.', 'Song search failed.');
          if (search.songs.results.length > 0) MTUNE.state.songQueue = search.songs.results;

          // Populate albums
          search.albums.results = albumData?.data?.results || [];
          search.albums.total = albumData?.data?.total || 0;
          MTUNE.render.populate(albumSearchResults, search.albums.results, MTUNE.render.discoverCard, 'No albums found.', 'Album search failed.');

          // Populate playlists
          search.playlists.results = playlistData?.data?.results || [];
          search.playlists.total = playlistData?.data?.total || 0;
          MTUNE.render.populate(playlistSearchResults, search.playlists.results, MTUNE.render.discoverCard, 'No playlists found.', 'Playlist search failed.');

          // Populate artists
          search.artists.results = artistData?.data?.results || [];
          search.artists.total = artistData?.data?.total || 0;
          MTUNE.render.populate(artistSearchResults, search.artists.results, MTUNE.render.timelineCard, 'No artists found.', 'Artist search failed.');
      } else { // This block is for infinite scroll
          if (songData?.data?.results) {
              search.songs.results.push(...songData.data.results);
              MTUNE.state.songQueue.push(...songData.data.results);
              MTUNE.render.append(songList, songData.data.results, MTUNE.render.discoverCard);
          }
          if (albumData?.data?.results) {
              search.albums.results.push(...albumData.data.results);
              MTUNE.render.append(albumSearchResults, albumData.data.results, MTUNE.render.discoverCard);
          }
          if (playlistData?.data?.results) {
              search.playlists.results.push(...playlistData.data.results);
              MTUNE.render.append(playlistSearchResults, playlistData.data.results, MTUNE.render.discoverCard);
          }
          if (artistData?.data?.results) {
              search.artists.results.push(...artistData.data.results);
              MTUNE.render.append(artistSearchResults, artistData.data.results, MTUNE.render.timelineCard);
          }
      }

      search.songs.currentPage++;
      search.albums.currentPage++;
      search.playlists.currentPage++;
      search.artists.currentPage++;
      search.isLoading = false;
    },

    async showSearchSuggestions() {
       const query = MTUNE.ui.searchBar.value.trim();
      const container = MTUNE.ui.searchSuggestions;
      if (query.length < 2) {
          container.classList.remove('active');
          return;
      }
      const data = await MTUNE.api.searchAll(query);
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
          const imageUrl = MTUNE.render._getImageUrl(s.image);
          const title = MTUNE.render._decode(s.title);
          const subtitle = MTUNE.render._decode(s.subtitle || s.description || '');
          let onclickAction = `MTUNE.navigation.selectSuggestion('${s.title}')`; // Default for top query

          if (s.type === 'song') onclickAction = `MTUNE.player.playFromCardContext(event, '${s.id}', 'song')`;
          if (s.type === 'album') onclickAction = `MTUNE.navigation.showAlbum('${s.id}')`;
          if (s.type === 'artist') onclickAction = `MTUNE.navigation.showArtist(event, '${s.id}')`;

          return `<div class="suggestion-item" onclick="${onclickAction}"><img src="${imageUrl}" loading="lazy" onerror="this.src='/default_cover.jpg'"/><div><strong>${title}</strong><small>${subtitle}</small></div></div>`;
      }).join('');

      container.innerHTML = uniqueSuggestions.map(s => {
          let iconClass = 'fa-search';
          if (s.type === 'song') iconClass = 'fa-music';
          if (s.type === 'album') iconClass = 'fa-compact-disc';
          if (s.type === 'artist') iconClass = 'fa-user';
          let onclickAction = `MTUNE.navigation.selectSuggestion('${s.title}')`;
          if (s.type === 'song') onclickAction = `MTUNE.player.playFromCardContext(event, '${s.id}', 'song')`;
          if (s.type === 'album') onclickAction = `MTUNE.navigation.showAlbum('${s.id}')`;
          if (s.type === 'artist') onclickAction = `MTUNE.navigation.showArtist(event, '${s.id}')`;

          const imageUrl = MTUNE.render._getImageUrl(s.image);
          return `<div class="suggestion-item" onclick="${onclickAction}"><img src="${imageUrl}" loading="lazy" onerror="this.src='/default_cover.jpg'"/><div><strong>${MTUNE.render._decode(s.title)}</strong><small>${MTUNE.render._decode(s.subtitle || s.description || '')}</small></div></div>`;
      }).join('');
      container.classList.toggle('active', uniqueSuggestions.length > 0);
    },
    selectSuggestion(query) {
        MTUNE.ui.searchBar.value = query;
        // Hide suggestions after selecting one to perform a full search
        if (MTUNE.ui.searchSuggestions) {
            MTUNE.ui.searchSuggestions.classList.remove('active');
        }
        this.triggerSearch();
    },
    loadLibrary() {
        const container = MTUNE.ui.userPlaylists;
        container.innerHTML = ''; // Clear existing content
        
        // Render existing user playlists
        MTUNE.state.userPlaylists.forEach(p => {
            container.appendChild(MTUNE.render.playlistCard(p));
        });

        // Always show the "Create Playlist" card
        container.appendChild(MTUNE.render.createPlaylistCard());
    },

    createNewPlaylist() {
        const playlistName = prompt("Enter a name for your new playlist:", "My Playlist");
        if (playlistName) {
            const newPlaylist = { id: `user_${Date.now()}`, name: playlistName, songs: [], image: null };
            MTUNE.state.userPlaylists.push(newPlaylist);
            MTUNE.utils.saveUserPlaylists();
            this.loadLibrary(); // Refresh the library view
        }
    },

    loadHistory() {
        const { historyList } = MTUNE.ui;
        MTUNE.render.populate(historyList, MTUNE.state.history, (s) => MTUNE.render.songCard(s, { playFromHistory: true }), 'Your listening history is empty.', 'Could not load history.');
    },

    loadFavourites() {
        const { favouriteSongsList } = MTUNE.ui;
        MTUNE.render.populate(favouriteSongsList, MTUNE.state.favourites, MTUNE.render.songCard, 'You have no favourite songs yet. Click the heart icon on a song to add it!', 'Could not load favourites.');
    },

    loadSavedPlaylists() {
        const { savedPlaylistsContainer } = MTUNE.ui;
        MTUNE.render.populate(savedPlaylistsContainer, MTUNE.state.savedPlaylists, MTUNE.render.playlistCard, 'You have no saved playlists yet. Find a playlist and save it!', 'Could not load saved playlists.');
    },

    async loadTimeline() {
      const { timelineList } = MTUNE.ui;
      MTUNE.render._renderMessage(timelineList, 'Loading top artists...');
      // The modules endpoint doesn't reliably contain artists, so we'll do a general search.
      const data = await MTUNE.api._fetch(`/search/artists?query=top`);
      MTUNE.render.populate(timelineList, data?.data?.results, MTUNE.render.timelineCard, 'No top artists found.', 'Failed to load artists.');
    },

    async showPlaylist(event, playlistId, buttonClicked = false) {
        if (event && event.target.closest('button') && !buttonClicked) return;
        this.showSection('playlist-details');
        const { playlistDetailsHeader, playlistSongs } = MTUNE.ui;
        MTUNE.render._renderMessage(playlistDetailsHeader, '');
        MTUNE.render._renderMessage(playlistSongs, 'Loading playlist songs...');

        // Check if it's a user-created playlist
        if (playlistId.startsWith('user_')) {
            const userPlaylist = MTUNE.state.userPlaylists.find(p => p.id === playlistId);
            if (userPlaylist) {
                // Manually construct a data object that matches the API structure
                const data = { ...userPlaylist, songCount: userPlaylist.songs.length, followerCount: 0, description: 'A playlist created by you.' };
                MTUNE.render.playlistHeader(data);
                MTUNE.render.populate(playlistSongs, data.songs, MTUNE.render.songCard, 'This playlist is empty. Add songs via the context menu!', 'Could not load songs.');
                MTUNE.state.songQueue = data.songs;
            } else {
                MTUNE.render._renderMessage(playlistSongs, 'Could not find this playlist.', 'error');
            }
            return;
        }

        // Otherwise, fetch from the API
        const playlistData = await MTUNE.api.getPlaylistDetails(playlistId, 1);
        const data = playlistData?.data;
        if (data && data.songs) {
            MTUNE.render.playlistHeader(data);
            const initialSongs = data.songs;
            MTUNE.render.populate(playlistSongs, initialSongs, MTUNE.render.songCard, 'This playlist is empty.', 'Could not load songs.');
            MTUNE.state.songQueue = [...initialSongs];

            // Fetch all remaining songs if the playlist is paginated
            if (data.songCount > initialSongs.length) {
                this.fetchAllPlaylistSongs(playlistId, initialSongs.length, data.songCount);
            }
        } else {
            MTUNE.render._renderMessage(playlistSongs, 'Failed to load playlist.', 'error');
        }
    },

    async fetchAllPlaylistSongs(playlistId, initialCount, totalCount) {
        const { playlistSongs } = MTUNE.ui;
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading';
        loadingIndicator.textContent = 'Loading more...';
        playlistSongs.appendChild(loadingIndicator);

        let page = 2; // Start from the second page
        let fetchedCount = initialCount;
        while (fetchedCount < totalCount) {
            const songData = await MTUNE.api.getPlaylistDetails(playlistId, page);
            if (songData?.data?.songs && songData.data.songs.length > 0) {
                MTUNE.render.append(playlistSongs, songData.data.songs, MTUNE.render.songCard);
                MTUNE.state.songQueue.push(...songData.data.songs);
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
        const { albumDetailsHeader, albumSongs } = MTUNE.ui;
        MTUNE.render._renderMessage(albumDetailsHeader, '');
        MTUNE.render._renderMessage(albumSongs, 'Loading album songs...');

        const albumData = await MTUNE.api.getAlbumDetails(albumId);
        const data = albumData?.data;

        if (data) {
            // If the initial response doesn't contain all songs, fetch them separately.
            if (data.songs.length < data.songCount) {
                const albumSongsData = await MTUNE.api.getAlbumDetails(albumId);
                if (albumSongsData?.data?.songs) {
                    data.songs = albumSongsData.data.songs;
                }
            }
            MTUNE.render.albumHeader(data);
            MTUNE.render.populate(albumSongs, data.songs, MTUNE.render.songCard, 'This album is empty.', 'Could not load songs.');
            MTUNE.state.songQueue = data.songs;
        } else {
            MTUNE.render._renderMessage(albumSongs, 'Failed to load album.', 'error');
        }
    },

    async showArtist(event, artistId) {
        if (event && event.target.closest('button')) {
            event.stopPropagation();
            return; // Don't navigate if a button inside the card was clicked
        }
        this.showSection('artist-details');
        const { artistDetailsHeader, artistTopSongs } = MTUNE.ui;
        MTUNE.render._renderMessage(artistDetailsHeader, '');
        MTUNE.render._renderMessage(artistTopSongs, 'Loading top songs...');

        const [artistDetailsData, artistSongsData] = await Promise.all([
            MTUNE.api.getArtistDetails(artistId),
            MTUNE.api.getArtistSongs(artistId, 1) // Fetch first page of songs
        ]);

        const details = artistDetailsData?.data;
        const songs = artistSongsData?.data?.songs;

        if (details) {
            MTUNE.render.artistHeader(details);
        }

        if (songs) {
            MTUNE.render.populate(artistTopSongs, songs, MTUNE.render.songCard, 'No songs found for this artist.', 'Could not load songs.');
            MTUNE.state.songQueue = songs;
        } else {
            MTUNE.render._renderMessage(artistTopSongs, 'Failed to load artist details.', 'error');
        }
    },
    async fetchAllArtistSongs(artistId, initialCount, totalCount) {
        const { artistTopSongs } = MTUNE.ui;
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading';
        loadingIndicator.textContent = 'Loading more...';
        artistTopSongs.appendChild(loadingIndicator);

        let page = 1;
        let fetchedCount = initialCount;
        while (fetchedCount < totalCount) {
            const songData = await MTUNE.api.getArtistSongs(artistId, page);
            if (songData?.data?.results && songData.data.results.length > 0) {
                MTUNE.render.append(artistTopSongs, songData.data.results, MTUNE.render.songCard);
                MTUNE.state.songQueue.push(...songData.data.results);
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
    settingsConfig: {
        dynamicButtons: {
            stateKey: 'dynamicButtons',
            storageKey: 'musify_dynamicButtons',
            onChange: () => MTUNE.utils.updatePlayerTheme(MTUNE.ui.currentSongImg.src),
        },
        dynamicBackground: {
            stateKey: 'dynamicBackground',
            storageKey: 'musify_dynamicBackground',
            onChange: () => MTUNE.utils.updatePlayerTheme(MTUNE.ui.currentSongImg.src),
        },
        endlessQueue: {
            stateKey: 'endlessQueue',
            storageKey: 'musify_endlessQueue',
        },
        notifications: {
            stateKey: 'notifications',
            storageKey: 'musify_notifications',
        },
    },
    handleSettingToggle(settingKey, isEnabled) {
        const config = this.settingsConfig[settingKey];
        MTUNE.state[config.stateKey] = isEnabled;
        localStorage.setItem(config.storageKey, isEnabled);
        if (config.onChange) config.onChange(isEnabled);
    },
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
        const mobileProgressBar = MTUNE.ui.mobileProgressBar;
        const seek = (e) => {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const rect = mobileProgressBar.getBoundingClientRect();
            let percentage = (clientX - rect.left) / rect.width;
            percentage = Math.max(0, Math.min(1, percentage)); // Clamp between 0 and 1
            MTUNE.ui.audioPlayer.currentTime = MTUNE.ui.audioPlayer.duration * percentage;
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
    addSongCardInteractionHandlers() {
        const mainContent = MTUNE.ui.mainContent;
        let longPressTimer;

        mainContent.addEventListener('mousedown', e => {
            const songCard = e.target.closest('.song');
            if (songCard) {
                e.preventDefault(); // Prevent default browser actions like text selection
            }
        });

        mainContent.addEventListener('click', e => {
            const songCard = e.target.closest('.song');
            if (!songCard) return;
            
            const songId = songCard.dataset.songId;
            if (e.target.closest('.remove-from-queue-btn')) return; // Let the remove button do its job

            if (e.target.closest('img')) {
                MTUNE.player.playSongFromCard(e, songId);
            }
        });

        mainContent.addEventListener('contextmenu', e => {
            const songCard = e.target.closest('.song');
            if (songCard) { // Apply to all devices
                e.preventDefault();
                const songId = songCard.dataset.songId;
                this.showSongBottomSheet(songId); // Use bottom sheet for desktop too
            }
        });

        mainContent.addEventListener('contextmenu', e => {
            const playlistCard = e.target.closest('.playlist');
            if (playlistCard) {
                e.preventDefault();
                const playlistId = playlistCard.querySelector('button')?.onclick.toString().match(/'(.*?)'/)[1];
                this.showPlaylistContextMenu(e, playlistId);
            }
        });

        // Add a separate click listener for the queue container
        const queueContainer = MTUNE.ui.queueContainer;

        // Long press for mobile
        mainContent.addEventListener('touchstart', e => {
            if (window.innerWidth > 768) return;
            const songCard = e.target.closest('.song');
            const playlistCard = e.target.closest('.playlist');
            if (songCard) {
                longPressTimer = setTimeout(() => {
                    const songId = songCard.dataset.songId;
                    this.showSongBottomSheet(songId);
                }, 500); // 500ms for long press
            }
            if (playlistCard) {
                const playlistId = playlistCard.querySelector('button')?.onclick.toString().match(/'(.*?)'/)[1];
                this.showPlaylistContextMenu(e, playlistId, { isMobile: true });
            }
        });

        const clearLongPress = () => clearTimeout(longPressTimer);
        mainContent.addEventListener('touchend', clearLongPress);
        mainContent.addEventListener('touchcancel', clearLongPress);
        mainContent.addEventListener('touchmove', clearLongPress);


        queueContainer.addEventListener('click', e => {
            const songCard = e.target.closest('.song');
            if (!songCard) return;

            const songId = songCard.dataset.songId;
            if (e.target.closest('.play-btn, img')) {
                MTUNE.player.playSongFromCard(e, songId);
            }
        });
    },
    addQueueInteractionHandlers() {
        const queueList = MTUNE.ui.queueList;
        let touchStartX = 0;
        let touchCurrentX = 0;
        let swipedItem = null;

        queueList.addEventListener('touchstart', e => {
            const songCard = e.target.closest('.song');
            if (songCard) {
                touchStartX = e.changedTouches[0].clientX;
                swipedItem = songCard;
                // Add a class to disable transitions during swipe
                swipedItem.classList.add('swiping');
            }
        }, { passive: true });

        queueList.addEventListener('touchmove', e => {
            if (!swipedItem) return;
            touchCurrentX = e.changedTouches[0].clientX;
            const deltaX = touchCurrentX - touchStartX;
            // Only allow right-to-left swipe
            if (deltaX < 0) {
                swipedItem.style.transform = `translateX(${deltaX}px)`;
            }
        }, { passive: true });

        queueList.addEventListener('touchend', e => {
            if (!swipedItem) return;
            const deltaX = e.changedTouches[0].clientX - touchStartX;
            swipedItem.classList.remove('swiping');

            // If swipe is more than 1/3 of the card width, remove it
            if (deltaX < -50) { // A small swipe is enough to trigger options
                const songId = swipedItem.dataset.songId;
                this.showSongBottomSheet(songId);
            } else {
                // Reset position if swipe was not enough
                swipedItem.style.transform = 'translateX(0)';
            }
            swipedItem = null;
            touchStartX = 0;
        });
    },
    addQueueDragHandlers() {
        const queueList = MTUNE.ui.queueList;
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
                const newQueue = newOrderIds.map(id => MTUNE.state.songQueue.find(s => s.id === id));
                
                // Update state and current index
                const currentSongId = MTUNE.state.songQueue[MTUNE.state.currentSongIndex]?.id;
                MTUNE.state.songQueue = newQueue;
                MTUNE.state.currentSongIndex = newQueue.findIndex(s => s.id === currentSongId);
                
                draggedItem = null;
            }
        });
    },
    addNowPlayingGestures() {
        const artElement = MTUNE.ui.nowPlayingImg;
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
    handleInfiniteScroll(event) {
        const element = event.target;
        const { search, navigation } = MTUNE.state;
        // Trigger when user is 250px from the bottom
        if (navigation.currentSection === 'search' && !search.isLoading && element.scrollHeight - element.scrollTop - element.clientHeight < 250) {
            MTUNE.navigation.search(false);
        }
    },
    handleMarquee(event) {
        const container = event.target.closest('.song strong, .playlist strong, .album strong, .artist strong, #currentSongTitle strong, #nowPlayingTitle');
        if (!container) return;
        const span = container.querySelector('span') || container; // Handle h2 directly or span inside strong
        if (!span) return;

        if (event.type === 'mouseover' && container.scrollWidth > container.clientWidth) {
            // Calculate duration based on text length for a consistent speed
            const duration = container.scrollWidth / 40; // Adjust 40 to control speed
            span.style.animation = `marquee ${duration}s linear 1s infinite`;
            span.classList.add('marquee');
        } else if (event.type === 'mouseout') {
            span.style.animation = '';
            span.classList.remove('marquee');
        }
    },
    showSongContextMenu(event, songId, options = {}) {
        event.stopPropagation();
        event.preventDefault();
        this.removeContextMenu(); // Close any existing menu
    
        const song = MTUNE.state.songQueue.find(s => s.id === songId) || 
                     MTUNE.state.history.find(s => s.id === songId) || 
                     MTUNE.state.favourites.find(s => s.id === songId);
        if (!song) return;
    
        const isFavourited = MTUNE.utils.isFavourited(songId);
    
        const queueOptions = `
            <li onclick="MTUNE.utils.playNext('${songId}')"><i class="fas fa-level-up-alt"></i> Play Next</li>
            <li onclick="MTUNE.utils.addToQueue('${songId}')"><i class="fas fa-plus-square"></i> Add to Queue</li>
        `;
    
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
            <ul>
                <li onclick="MTUNE.utils.startRadio('${songId}')"><i class="fas fa-broadcast-tower"></i> Start Radio</li>
                ${queueOptions}
                <li class="separator"></li>
                <li onclick="MTUNE.utils.toggleFavourite('${songId}')">
                    <i class="fas fa-heart" style="color: ${isFavourited ? 'var(--accent)' : 'inherit'}"></i>
                    ${isFavourited ? 'Remove from Favourites' : 'Add to Favourites'}
                </li>
                <li onclick="MTUNE.utils.downloadSong('${songId}')"><i class="fas fa-download"></i> Download</li>
                <li class="separator"></li>
                <li onclick="MTUNE.utils.showPlaylistModal('${songId}')"><i class="fas fa-plus"></i> Add to Playlist...</li>
            </ul>
        `;
    
        document.body.appendChild(menu);
        menu.style.top = `${event.pageY}px`;
        menu.style.left = `${event.pageX}px`;
        // Use a timeout to allow the element to be in the DOM before adding the class
        setTimeout(() => menu.classList.add('active'), 10);
    
        // Add a single listener to close the menu
        document.addEventListener('click', this.removeContextMenu, { once: true });
    },
    showSongBottomSheet(songId) {
        const song = MTUNE.state.songQueue.find(s => s.id === songId) || 
                     MTUNE.state.history.find(s => s.id === songId) || 
                     MTUNE.state.favourites.find(s => s.id === songId);
        if (!song) return;

        const sheetContent = document.querySelector('#bottomSheet .bottom-sheet-content');
        const isFavourited = MTUNE.utils.isFavourited(songId);

        const close = () => this.hideBottomSheet();

        sheetContent.innerHTML = `
            <ul>
                <li onclick="MTUNE.utils.playNext('${songId}'); ${close.toString()}()"><i class="fas fa-level-up-alt"></i> Play Next</li>
                <li onclick="MTUNE.utils.addToQueue('${songId}'); ${close.toString()}()"><i class="fas fa-plus-square"></i> Add to Queue</li>
                <li class="separator"></li>
                <li onclick="MTUNE.utils.startRadio('${songId}'); ${close.toString()}()"><i class="fas fa-broadcast-tower"></i> Start Radio</li>
                <li onclick="MTUNE.utils.toggleFavourite('${songId}'); ${close.toString()}()">
                    <i class="fas fa-heart" style="color: ${isFavourited ? 'var(--accent)' : 'inherit'}"></i>
                    ${isFavourited ? 'Remove from Favourites' : 'Add to Favourites'}
                </li>
                <li onclick="MTUNE.utils.downloadSong('${songId}'); ${close.toString()}()"><i class="fas fa-download"></i> Download</li>
                <li class="separator"></li>
                <li onclick="MTUNE.utils.showPlaylistModal('${songId}'); ${close.toString()}()"><i class="fas fa-plus"></i> Add to Playlist...</li>
            </ul>
        `;

        document.getElementById('bottomSheet').classList.add('active');
    },
    hideBottomSheet() {
        document.getElementById('bottomSheet').classList.remove('active');
    },
    showPlaylistContextMenu(event, playlistId, options = {}) {
        event.stopPropagation();
        this.removeContextMenu();

        const playlist = MTUNE.state.userPlaylists.find(p => p.id === playlistId);
        const isApiPlaylist = !playlistId.startsWith('user_');

        const saveOption = isApiPlaylist ? `<li onclick="MTUNE.utils.savePlaylist('${playlistId}')"><i class="fas fa-bookmark"></i> Save to Library</li>` : '';
        const deleteOption = playlist ? `<li onclick="MTUNE.utils.deletePlaylist('${playlistId}')"><i class="fas fa-trash"></i> Delete Playlist</li>` : '';
        const renameOption = playlist ? `<li onclick="MTUNE.utils.renamePlaylist('${playlistId}')"><i class="fas fa-pencil-alt"></i> Rename Playlist</li>` : '';

        const menuItems = `
            <ul>
                <li onclick="MTUNE.navigation.showPlaylist(event, '${playlistId}')"><i class="fas fa-eye"></i> View Playlist</li>
                ${saveOption ? `<li class="separator"></li>${saveOption}` : ''}
                ${renameOption ? `<li class="separator"></li>${renameOption}` : ''}
                ${deleteOption ? `<li class="separator"></li>${deleteOption}` : ''}
            </ul>
        `;

        if (options.isMobile) {
            const sheetContent = document.querySelector('#bottomSheet .bottom-sheet-content');
            sheetContent.innerHTML = menuItems.replace(/MTUNE.utils.(.*?)\((.*?)\)/g, "MTUNE.utils.$1($2); MTUNE.utils.hideBottomSheet()");
            document.getElementById('bottomSheet').classList.add('active');
            return;
        }

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = menuItems;
        document.body.appendChild(menu);
        menu.style.top = `${event.pageY}px`;
        menu.style.left = `${event.pageX}px`;

        document.addEventListener('click', this.removeContextMenu, { once: true });
    },
    deletePlaylist(playlistId) {
        this.removeContextMenu();
        const playlist = MTUNE.state.userPlaylists.find(p => p.id === playlistId);
        if (!playlist) return;

        if (confirm(`Delete "${playlist.name}"? This cannot be undone.`)) {
            MTUNE.state.userPlaylists = MTUNE.state.userPlaylists.filter(p => p.id !== playlistId);
            this.saveUserPlaylists();
            if (MTUNE.state.navigation.currentSection === 'library') MTUNE.navigation.loadLibrary();
        }
    },
    renamePlaylist(playlistId) {
        this.removeContextMenu();
        const playlist = MTUNE.state.userPlaylists.find(p => p.id === playlistId);
        const newName = prompt("Enter new playlist name:", playlist.name);
        if (newName && newName.trim() !== "") {
            playlist.name = newName.trim();
            this.saveUserPlaylists();
            if (MTUNE.state.navigation.currentSection === 'library') MTUNE.navigation.loadLibrary();
        }
    },
    removeContextMenu() {
        const menu = document.querySelector('.context-menu');
        if (menu) menu.remove();
    },
    isFavourited(songId) {
        return MTUNE.state.favourites.some(s => s.id === songId);
    },
    removeFromQueue(event, songId, element) {
        if (event) event.stopPropagation();
        const state = MTUNE.state;
        const indexToRemove = state.songQueue.findIndex(s => s.id === songId);

        if (indexToRemove > -1) {
            const songElement = element || document.querySelector(`#queueList .song[data-song-id="${songId}"]`);
            if (songElement) {
                songElement.classList.add('removing');
                songElement.addEventListener('transitionend', () => {
                    state.songQueue.splice(indexToRemove, 1);
                    if (indexToRemove < state.currentSongIndex) {
                        state.currentSongIndex--;
                    }
                    songElement.remove();
                }, { once: true });
            }
        }
    },
    toggleFavourite(songId) {
        const song = MTUNE.state.songQueue.find(s => s.id === songId) || MTUNE.state.history.find(s => s.id === songId) || MTUNE.state.favourites.find(s => s.id === songId);
        if (!song) return;

        if (this.isFavourited(songId)) {
            MTUNE.state.favourites = MTUNE.state.favourites.filter(s => s.id !== songId);
        } else {
            MTUNE.state.favourites.unshift(song);
        }
        this.saveFavourites();
        
        // Update UI if visible
        if (MTUNE.state.navigation.currentSection === 'favourites') MTUNE.navigation.loadFavourites();
        if (MTUNE.state.currentSongIndex > -1 && MTUNE.state.songQueue[MTUNE.state.currentSongIndex].id === songId) MTUNE.ui.nowPlayingLikeBtn.classList.toggle('active');
        if (MTUNE.state.currentSongIndex > -1 && MTUNE.state.songQueue[MTUNE.state.currentSongIndex].id === songId) MTUNE.ui.likeBtn.classList.toggle('active');
    },
    updatePlayerTheme(imageUrl) {
      const resetTheme = () => {
          document.documentElement.style.setProperty('--dynamic-primary', 'var(--primary-default)');
          document.documentElement.style.setProperty('--dynamic-primary-light', 'var(--primary-light-default)');
          document.documentElement.style.setProperty('--dynamic-primary-dark', 'var(--primary-dark-default)');
          document.documentElement.style.setProperty('--dynamic-accent', 'var(--accent)');
      };

      if (!imageUrl || !window.ColorThief || (!MTUNE.state.dynamicButtons && !MTUNE.state.dynamicBackground)) {
          // When all dynamic themes are off, reset everything.
          const allPlayerButtons = document.querySelectorAll('.player-controls button, .player-mobile-controls button, .now-playing-controls button, .now-playing-actions button, .volume-control i, .player-like-btn');
          allPlayerButtons.forEach(btn => {
              btn.style.color = '';
              btn.style.background = '';
          });
          const progressBars = [
              document.getElementById('progressBar'),
              document.getElementById('nowPlayingProgressBar'),
              document.getElementById('volumeSlider'),
              document.getElementById('nowPlayingVolumeSlider')
          ];
          progressBars.forEach(bar => {
              if (bar) bar.style.accentColor = '';
          });
          const mobileProgressBar = document.getElementById('mobile-progress-bar');
          if (mobileProgressBar) mobileProgressBar.style.background = '';
          
          document.body.style.background = '';
          MTUNE.ui.nowPlayingImg.style.boxShadow = '';
          resetTheme();

          return;
      }

      const img = new Image();
      img.crossOrigin = "Anonymous";
      // Use a CORS proxy if direct loading fails, but try direct first.
      img.src = imageUrl.replace(/^http:/, 'https');
      
      img.onload = () => {
          try {
              const colorThief = new ColorThief();
              let dominantColor = colorThief.getColor(img);
              const palette = colorThief.getPalette(img, 5);
              // --- New Logic to avoid black/white ---
              const isBlack = (c) => c[0] < 30 && c[1] < 30 && c[2] < 30;
              const isWhite = (c) => c[0] > 225 && c[1] > 225 && c[2] > 225;

              if (isBlack(dominantColor) || isWhite(dominantColor)) {
                  // Find the first color in the palette that isn't black or white
                  const alternativeColor = palette.find(c => !isBlack(c) && !isWhite(c));
                  if (alternativeColor) {
                      dominantColor = alternativeColor;
                  }
              }

              const accentColor = `rgb(${dominantColor.join(',')})`;
              const darkColor = `rgb(${palette.sort((a, b) => (0.299*a[0] + 0.587*a[1] + 0.114*a[2]) - (0.299*b[0] + 0.587*b[1] + 0.114*b[2]))[0].join(',')})`;

              if (MTUNE.state.dynamicBackground) {
                document.body.style.background = `linear-gradient(135deg, ${darkColor} 0%, ${accentColor} 100%)`;
              } else {
                document.body.style.background = 'var(--primary)';
              }

              if (MTUNE.state.dynamicButtons) {
                const dominantLuminance = (0.299*dominantColor[0] + 0.587*dominantColor[1] + 0.114*dominantColor[2]);
                const iconColor = dominantLuminance > 128 ? 'rgba(0,0,0,0.8)' : 'white';

                // --- New: Calculate complementary color for glow ---
                const complementaryColor = `rgb(${255 - dominantColor[0]}, ${255 - dominantColor[1]}, ${255 - dominantColor[2]})`;
                const glowStyle = `0 0 8px -2px ${complementaryColor}`;

                document.documentElement.style.setProperty('--dynamic-primary-dark', darkColor);
                document.documentElement.style.setProperty('--dynamic-primary', accentColor);
                document.documentElement.style.setProperty('--dynamic-primary-light', `rgb(${palette[palette.length - 1].join(',')})`);
                document.documentElement.style.setProperty('--dynamic-accent', accentColor);

                // Apply to all player buttons and icons
                const allPlayerButtons = document.querySelectorAll('.player-controls button, .player-mobile-controls button, .now-playing-controls button, .now-playing-actions button, .volume-control i, .player-like-btn');
                allPlayerButtons.forEach(btn => btn.style.color = accentColor);

                // Apply to filled/tonal buttons
                const filledButtons = document.querySelectorAll('#playPauseBtn, .player-mobile-controls .play-btn, #nowPlayingPlayPauseBtn');
                filledButtons.forEach(btn => {
                    btn.style.background = accentColor;
                    btn.style.color = iconColor;
                });

                // Apply to progress bars and sliders
                const progressBars = [MTUNE.ui.progressBar, MTUNE.ui.nowPlayingProgressBar, MTUNE.ui.volumeSlider, MTUNE.ui.nowPlayingVolumeSlider];
                progressBars.forEach(bar => { if(bar) bar.style.accentColor = accentColor; });

                // Apply to mobile progress bar
                const mobileProgressBar = document.getElementById('mobile-progress-bar');
                if (mobileProgressBar) mobileProgressBar.style.background = accentColor;
              } else {
                  // Reset button styles if dynamic buttons are off
                  const allPlayerButtons = document.querySelectorAll('.player-controls button, .player-mobile-controls button, .now-playing-controls button, .now-playing-actions button, .volume-control i, .player-like-btn');
                  allPlayerButtons.forEach(btn => {
                      btn.style.color = '';
                      btn.style.background = '';
                      btn.style.boxShadow = ''; // Reset glow
                  });
                  const progressBars = [ MTUNE.ui.progressBar, MTUNE.ui.nowPlayingProgressBar, MTUNE.ui.volumeSlider, MTUNE.ui.nowPlayingVolumeSlider ];
                  progressBars.forEach(bar => { if(bar) bar.style.accentColor = ''; });
                  const mobileProgressBar = document.getElementById('mobile-progress-bar');
                  if (mobileProgressBar) mobileProgressBar.style.background = '';
                  document.documentElement.style.setProperty('--dynamic-accent', 'var(--accent)');
              }

              // Apply album art glow
              MTUNE.ui.nowPlayingImg.style.boxShadow = MTUNE.state.dynamicBackground ? `0 0 40px -5px ${accentColor}` : '';
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
      // This function is no longer needed as light mode is removed.
    },
    async savePlaylist(playlistId) {
        const existing = MTUNE.state.savedPlaylists.find(p => p.id === playlistId);
        if (existing) {
            this.showNotification('Playlist already saved!', 'info');
            return;
        }
        const playlistData = await MTUNE.api.getPlaylistDetails(playlistId);
        if (playlistData?.data) {
            MTUNE.state.savedPlaylists.unshift(playlistData.data); // Corrected from Musify to MTUNE
            localStorage.setItem('musify_saved_playlists', JSON.stringify(MTUNE.state.savedPlaylists));
            this.showNotification('Playlist saved to library!', 'success');
            if (MTUNE.state.navigation.currentSection === 'saved-playlists') MTUNE.navigation.loadSavedPlaylists();
        } else {
            this.showNotification('Failed to save playlist.', 'error');
        }
    },
    loadState() {
        const history = localStorage.getItem('musify_history');
        if (history) {
            MTUNE.state.history = JSON.parse(history);
        }
        const favourites = localStorage.getItem('musify_favourites');
        if (favourites) {
            MTUNE.state.favourites = JSON.parse(favourites);
        }
        const userPlaylists = localStorage.getItem('musify_userPlaylists');
        if (userPlaylists) {
            MTUNE.state.userPlaylists = JSON.parse(userPlaylists);
        }
        const savedPlaylists = localStorage.getItem('musify_savedPlaylists');
        if (savedPlaylists) {
            MTUNE.state.savedPlaylists = JSON.parse(savedPlaylists);
        }
        const quality = localStorage.getItem('musify_quality');
        if (quality) {
            MTUNE.state.audioQuality = quality;
            MTUNE.ui.audioQuality.value = quality;
        }
        const notifications = localStorage.getItem('musify_notifications');
        if (notifications !== null) {
            const isEnabled = notifications === 'true';
            MTUNE.state.notifications = isEnabled;
            if (MTUNE.ui.notificationsToggle) MTUNE.ui.notificationsToggle.checked = isEnabled;
        }
        const dynamicButtons = localStorage.getItem('musify_dynamicButtons');
        if (dynamicButtons !== null) {
            MTUNE.state.dynamicButtons = dynamicButtons === 'true';
            MTUNE.ui.dynamicButtonsToggle.checked = MTUNE.state.dynamicButtons;
        }
        const dynamicBackground = localStorage.getItem('musify_dynamicBackground');
        if (dynamicBackground !== null) {
            MTUNE.state.dynamicBackground = dynamicBackground === 'true';
            MTUNE.ui.dynamicBackgroundToggle.checked = MTUNE.state.dynamicBackground;
        }
        const volume = localStorage.getItem('musify_volume');
        if (volume !== null) {
            const volumeValue = parseFloat(volume);
            MTUNE.ui.volumeSlider.value = volumeValue;
            MTUNE.ui.nowPlayingVolumeSlider.value = volumeValue;
            MTUNE.player.setVolume(volumeValue);
        }
    },
    savePlaybackState() {
        const state = MTUNE.state;
        if (state.currentSongIndex > -1 && state.songQueue.length > 0) {
            const playbackState = {
                songQueue: state.songQueue,
                currentSongIndex: state.currentSongIndex,
                currentTime: MTUNE.ui.audioPlayer.currentTime
            };
            localStorage.setItem('musify_playbackState', JSON.stringify(playbackState));
        }
    },
    async applyPlaybackState() {
        const playbackStateJSON = localStorage.getItem('musify_playbackState');
        if (playbackStateJSON) {
            const playbackState = JSON.parse(playbackStateJSON);
            if (playbackState.songQueue && playbackState.songQueue.length > 0 && playbackState.currentSongIndex > -1) {
                MTUNE.state.songQueue = playbackState.songQueue;
                MTUNE.state.currentSongIndex = playbackState.currentSongIndex;
                
                const song = MTUNE.state.songQueue[MTUNE.state.currentSongIndex];
                const fullDetails = await MTUNE.api.getSongDetails(song.id);
                const songDetails = fullDetails?.data?.[0] || song;
                
                if (songDetails && Array.isArray(songDetails.downloadUrl) && songDetails.downloadUrl.length > 0) {
                    MTUNE.player.updateInfo(songDetails);
                    const bestQuality = songDetails.downloadUrl.find(u => u.quality === MTUNE.state.audioQuality) || songDetails.downloadUrl.at(-1);
                    MTUNE.ui.audioPlayer.src = bestQuality.url || bestQuality.link;
                    MTUNE.ui.audioPlayer.currentTime = playbackState.currentTime || 0;
                } else {
                    MTUNE.player.updateMediaSession(songDetails);
                    // If we can't get a playable link, clear the state to avoid a broken player.
                    localStorage.removeItem('musify_playbackState');
                }
            }
        }
    },
    addSongToPlaylist(songId, playlistId) {
        const song = MTUNE.state.songQueue.find(s => s.id === songId)
            || MTUNE.state.history.find(s => s.id === songId)
            || MTUNE.state.favourites.find(s => s.id === songId);

        const playlist = MTUNE.state.userPlaylists.find(p => p.id === playlistId);

        if (song && playlist) {
            if (playlist.songs.some(s => s.id === song.id)) {
                MTUNE.utils.showNotification(`"${song.name}" is already in "${playlist.name}".`);
                return;
            }
            playlist.songs.unshift(song); // Add to the beginning
            // If this is the first song, update the playlist cover
            if (playlist.songs.length === 1) {
                playlist.image = song.image;
            }
            this.saveUserPlaylists();
            MTUNE.utils.showNotification(`Added to ${playlist.name}`, 'success');
        }
    },
    playNext(songId) {
        const { songQueue, currentSongIndex } = MTUNE.state;
        const songIndex = songQueue.findIndex(s => s.id === songId);
        const song = MTUNE.state.songQueue.find(s => s.id === songId) 
            || MTUNE.state.history.find(s => s.id === songId) 
            || MTUNE.state.favourites.find(s => s.id === songId);

        if (!song) return;

        if (songIndex > -1) {
            // Song is already in the queue, just move it
            const [song] = songQueue.splice(songIndex, 1);
            songQueue.splice(currentSongIndex + 1, 0, song);
        } else {
            // Song is not in the queue, add it
            songQueue.splice(currentSongIndex + 1, 0, song);
        }

        // Re-render the queue to show the new order if it's open
        if (MTUNE.ui.queueContainer.classList.contains('active')) {
            MTUNE.navigation.toggleQueueView(true);
        }
        MTUNE.utils.showNotification(`"${song.name || song.title}" will play next.`, 'success');
    },
    addToQueue(songId) {
        const song = MTUNE.state.songQueue.find(s => s.id === songId) || MTUNE.state.history.find(s => s.id === songId) || MTUNE.state.favourites.find(s => s.id === songId);
        if (song && !MTUNE.state.songQueue.some(s => s.id === songId)) MTUNE.state.songQueue.push(song);
        if (MTUNE.ui.queueContainer.classList.contains('active')) MTUNE.navigation.toggleQueueView(true);
        MTUNE.utils.showNotification(`Added "${song.name || song.title}" to queue.`, 'success');
    },
    async savePlaylist(playlistId) {
        if (MTUNE.state.savedPlaylists.some(p => p.id === playlistId)) {
            MTUNE.utils.showNotification('This playlist is already in your library.');
            return;
        }
        const playlistData = await MTUNE.api.getPlaylistDetails(playlistId);
        if (playlistData?.data) {
            MTUNE.state.savedPlaylists.unshift(playlistData.data);
            this.saveSavedPlaylists();
            MTUNE.utils.showNotification('Playlist saved to library', 'success');
        }
    },
    showPlaylistModal(songId) {
        const modal = MTUNE.ui.playlistModal;
        const list = MTUNE.ui.modalPlaylistList;
        modal.style.display = 'flex';
        modal.dataset.songId = songId;

        list.innerHTML = '';
        if (MTUNE.state.userPlaylists.length > 0) {
            MTUNE.state.userPlaylists.forEach(p => {
                const li = document.createElement('li');
                li.innerHTML = `<i class="fas fa-music"></i> <span>${this._decode(p.name)}</span>`;
                li.onclick = () => {
                    this.addSongToPlaylist(songId, p.id);
                    this.hidePlaylistModal();
                };
                list.appendChild(li);
            });
        } else {
            list.innerHTML = '<p class="empty-modal-list">No playlists yet. Create one!</p>';
        }
        setTimeout(() => modal.classList.add('active'), 10);
    },
    hidePlaylistModal() {
        const modal = MTUNE.ui.playlistModal;
        modal.classList.remove('active');
        modal.addEventListener('transitionend', () => {
            modal.style.display = 'none';
        }, { once: true });
    },
    createNewPlaylistFromModal() {
        const songId = MTUNE.ui.playlistModal.dataset.songId;
        const playlistName = prompt("Enter a name for your new playlist:", "My Awesome Playlist");
        if (playlistName) {
            MTUNE.navigation.createNewPlaylist(playlistName, song => this.addSongToPlaylist(songId, song.id));
            this.hidePlaylistModal();
        }
    },
    async startRadio(songId, append = false) {
        const suggestionsData = await MTUNE.api.getSongSuggestions(songId, 20);
        const originalSong = MTUNE.state.songQueue.find(s => s.id === songId)
            || MTUNE.state.history.find(s => s.id === songId)
            || MTUNE.state.favourites.find(s => s.id === songId);

        if (suggestionsData?.data && originalSong) {
            if (append) {
                MTUNE.state.songQueue.push(...suggestionsData.data);
            } else {
                MTUNE.state.songQueue = [originalSong, ...suggestionsData.data];
                MTUNE.state.currentSongIndex = 0;
                MTUNE.player.playCurrent();
            }
        } else {
            MTUNE.utils.showNotification('Could not start radio for this song.', 'error');
        }
    },
    async selectDownloadFolder() {
        if ('showDirectoryPicker' in window) {
            try {
                const handle = await window.showDirectoryPicker();
                // We need to check if we have permission to write to the directory.
                if (await handle.queryPermission({ mode: 'readwrite' }) !== 'granted') {
                    if (await handle.requestPermission({ mode: 'readwrite' }) !== 'granted') {
                        MTUNE.utils.showNotification('Permission to save files was denied.', 'error');
                        return;
                    }
                }
                MTUNE.state.downloadFolderHandle = handle;
                alert(`Downloads will now be saved to "${handle.name}".`);
            } catch (error) {
                // This error is often triggered if the user cancels the picker.
                console.log('Directory picker was cancelled or failed.', error);
            }
        } else {
            MTUNE.utils.showNotification('Custom download folder not supported by your browser.');
        }
    },
    async downloadSong(songId) {
        MTUNE.utils.showNotification('Preparing download...');
        const fullDetails = await MTUNE.api.getSongDetails(songId);
        const song = fullDetails?.data?.[0];

        if (!song || !Array.isArray(song.downloadUrl) || song.downloadUrl.length === 0) {
            MTUNE.utils.showNotification('Could not find a downloadable link for this song.', 'error');
            return;
        }

        try {
            const bestQuality = song.downloadUrl.at(-1);
            const bestQualityUrl = bestQuality.url || bestQuality.link;

            if (!bestQualityUrl) {
                MTUNE.utils.showNotification('Download link was invalid.', 'error');
                return;
            }

            const songBuffer = await fetch(bestQualityUrl).then(res => res.arrayBuffer());
            const coverUrl = MTUNE.render._getImageUrl(song.image);
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
            MTUNE.utils.showNotification(`Downloaded "${fileName}"`, 'success');
        } catch (error) {
            console.error('Download failed:', error);
            MTUNE.utils.showNotification('An error occurred during download.', 'error');
        }
    },
    setAudioQuality(quality) {
        MTUNE.state.audioQuality = quality;
        localStorage.setItem('musify_quality', quality);
    },
    setNotifications(isEnabled) {
        MTUNE.state.notifications = isEnabled;
        localStorage.setItem('musify_notifications', isEnabled);
        // In a real app, you would initialize or tear down notification listeners here.
        console.log(`Notifications ${isEnabled ? 'enabled' : 'disabled'}`);
    },
    setDynamicTheme(isEnabled) {
        MTUNE.state.dynamicTheme = isEnabled;
        localStorage.setItem('musify_dynamicTheme', isEnabled);
        this.updatePlayerTheme(MTUNE.ui.currentSongImg.src); // Re-apply theme
    },
    setEndlessQueue(isEnabled) {
        MTUNE.state.endlessQueue = isEnabled;
        localStorage.setItem('musify_endlessQueue', isEnabled);
    },
    clearHistory() {
        if (confirm('Are you sure you want to clear your entire listening history? This cannot be undone.')) {
            MTUNE.state.history = [];
            localStorage.removeItem('musify_history');
            localStorage.removeItem('musify_playbackState'); // Also clear the last played song state
            MTUNE.utils.showNotification('Listening history cleared.', 'success');
            // If the history tab is active, re-render it to show it's empty
            if (MTUNE.state.navigation.currentSection === 'history') MTUNE.navigation.loadHistory();
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
            MTUNE.state.favourites = [];
            this.saveFavourites();
            MTUNE.utils.showNotification('Favourites cleared.', 'success');
            if (MTUNE.state.navigation.currentSection === 'favourites') MTUNE.navigation.loadFavourites();
        }
    },
    clearQueue() {
        if (confirm('Are you sure you want to clear the queue?')) {
            MTUNE.state.songQueue = [MTUNE.state.songQueue[MTUNE.state.currentSongIndex]].filter(Boolean);
            MTUNE.state.currentSongIndex = MTUNE.state.songQueue.length > 0 ? 0 : -1;
            MTUNE.navigation.toggleQueueView(true); // Refresh view
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
  MTUNE.navigation.showSection(sectionId);
}

function showArtist(event, artistId) {
    MTUNE.navigation.showArtist(event, artistId);
}

function playSongFromCard(event, songId) {
    MTUNE.player.playSongFromCard(event, songId);
}

function triggerSearch() {
  MTUNE.navigation.triggerSearch();
}

function togglePlayPause() {
  MTUNE.player.togglePlayPause();
}

function nextSong() {
  MTUNE.player.next();
}

function prevSong() {
  MTUNE.player.prev();
}

function toggleShuffle() {
  MTUNE.player.toggleShuffle();
}

function toggleRepeat() {
  MTUNE.player.toggleRepeat();
}

function toggleFavourite(songId) {
    MTUNE.utils.toggleFavourite(songId);
}





function filterSongList(query, containerId) {
    MTUNE.utils.filterSongList(query, containerId);
}

function addSongToPlaylist(songId, playlistId) {
    MTUNE.utils.addSongToPlaylist(songId, playlistId);
}

function clearHistory() {
  MTUNE.utils.clearHistory();
}

function clearFavourites() {
    MTUNE.utils.clearFavourites();
}

function clearAllData() {
    MTUNE.utils.clearAllData();
}

function likeCurrentSong() {
    const song = MTUNE.state.songQueue[MTUNE.state.currentSongIndex];
    if (song) {
        MTUNE.utils.toggleFavourite(song.id);
    }
}

function showCurrentSongOptions(event) {
    event.stopPropagation();
    const song = MTUNE.state.songQueue[MTUNE.state.currentSongIndex];
    if (song) {
        MTUNE.utils.showSongBottomSheet(song.id);
    }
}
// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => MTUNE.init());
