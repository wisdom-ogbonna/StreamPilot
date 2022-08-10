/**
 * VideoOverlay
 * @version 1.3.19
 * @param options
 * @constructor
 */
var VideoOverlay = function (options) {

    var self = this;

    this.device = {};
    this.players = {};
    this.timers = {};
    this.playingId = null;
    
    var cssTopPanelClassName = 'video-autoplay-overlay-top';
    var cssBottomPanelClassName = 'video-autoplay-overlay-bottom';
    var cssPlayButtonClassName = 'video-autoplay-overlay-play';

    var mainOptions = {
        debug: false,
        targetClassName: 'video-autoplay',
        width: '100%',
        height: 350,
        iconImageUrl: 'hand-pointer.png',
        playImageUrl: 'play-circle.png',
        colorBars: '#3269a8',
        colorPlayButton: '#3269a8',
        colorProgressBar: '#eddd00',
        unmuteText: 'Video is Playing…<br><img src="IMAGE_URL"><br>Click For Sound',
        textPaused: 'paused',
        textEnded: 'ended',
        skin: '',
        allow: '',
        autoPlayShakeAnimation: true,
        pauseOthersWhenPlaying: true,
        regularPlayerForMobileFirefox: true,
        disableSeek: false
    };

    this.init = function() {
        this.extend(mainOptions, options);
        if (mainOptions.skin) {
            cssTopPanelClassName += '-' + mainOptions.skin;
            cssBottomPanelClassName += '-' + mainOptions.skin;
            cssPlayButtonClassName += '-' + mainOptions.skin;
        }
        this.debugLog('[INIT]', mainOptions);
        this.deviceDetectInit();
        if (mainOptions.autoPlayShakeAnimation) {
            this.createAnimationStyleSheet();
        }
        this.onReady(function() {
            self.debugLog('[DOCUMENT_READY]');
            self.embedVideos();
        });
    };

    /**
     * Call function on content ready
     * @param {function} fn
     */
    this.onReady = function(fn) {
        this.debugLog('[ON_READY_STATE]', document.readyState);
        if (document.attachEvent
            ? document.readyState === 'complete'
            : document.readyState !== 'loading') {
                fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    };

    /**
     * Embed videos
     */
    this.embedVideos = function() {
        var elements = document.querySelectorAll('.' + mainOptions.targetClassName),
            iframeIds = {vimeo: [], youtube: []},
            videoVimeoId, videoYoutubeId, width, height, autoplay, controls, html, position, player;

        var isMobileFirefox = !!(self.device.isMobile && self.device.browser === 'firefox');
        
        elements.forEach(function(el) {
            videoVimeoId = el.dataset.vimeoId;
            videoYoutubeId = el.dataset.youtubeId;
            width = el.dataset.width || mainOptions.width;
            height = el.dataset.height || mainOptions.height;
            position = el.dataset.position || 'relative';
            controls = el.dataset.controls || '0';
            autoplay = el.dataset.autoplay || '1';
            if (self.playingId) {
                autoplay = '0';
            }
            
            if (mainOptions.allow && (
                (videoVimeoId && mainOptions.allow.indexOf('vimeo') === -1)
                || (videoYoutubeId && mainOptions.allow.indexOf('youtube') === -1))) {
                return;
            }
            
            var origin = window.location.origin;
            self.debugLog('[ORIGIN]', origin);

            if (videoVimeoId) {
                html = '<iframe id="vimeo-' + videoVimeoId + '" src="https://player.vimeo.com/video/' + videoVimeoId;
                html += '?autoplay=' + autoplay + '&muted=0&title=0&api=1&transparent=0&byline=0&background=0&controls=' + controls + '&origin=' + window.location.origin + '"';
                html += ' style="position: absolute; width: 100%; height: 100%;"';
                html += ' frameborder="0" allow="autoplay" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>';
                iframeIds.vimeo.push('vimeo-' + videoVimeoId);
            } else if (videoYoutubeId) {
                
                if (!isMobileFirefox && !window.onYouTubeIframeAPIReady && (!window.YT || !window.YT.loaded)) {
                    self.debugLog('[YOUTUBE_PLAYER] IFRAME READY');
                    window.onYouTubeIframeAPIReady = function() {
                        if ((isMobileFirefox && mainOptions.regularPlayerForMobileFirefox)
                            || self.device.browser === 'opera-touch') {
                            return;
                        }
                        self.playersInit(iframeIds.youtube, 'youtube');
                    };
                }
                html = '<iframe id="yt-' + videoYoutubeId + '" width="560" height="315" src="https://www.youtube.com/embed/' + videoYoutubeId;
                html += '?autoplay=' + autoplay + '&enablejsapi=1&modestbranding=1&showinfo=0&rel=0&controls=' + controls + '&origin=' + origin + '"';
                html += ' style="position: absolute; width: 100%; height: 100%;"';
                html += ' allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"';
                html += ' frameborder="0" allow="autoplay" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>';
                iframeIds.youtube.push('yt-' + videoYoutubeId);
            }

            el.innerHTML = html;
            el.style.position = position;
            if (position === 'absolute') {
                el.style.left = '0';
                el.style.top = '0';
            }
            el.style.width = width.indexOf('%') > -1 ? width : width + 'px';
            el.style.height = height.indexOf('%') > -1 ? height : height + 'px';
        });

        if ((isMobileFirefox && mainOptions.regularPlayerForMobileFirefox)
            || this.device.browser === 'opera-touch') {
                return;
        }
        this.playersInit(iframeIds.vimeo, 'vimeo');
        this.playersInit(iframeIds.youtube, 'youtube');
        
        window.addEventListener('resize', this.onResize.bind(this));
        this.onResize();
    };

    /**
     * Initialize players
     * @param iframeIds
     * @param type
     */
    this.playersInit = function(iframeIds, type) {
        if (iframeIds.length === 0 || (type === 'youtube' && (!window.YT || !window.YT.loaded))) {
            return;
        }
        var player;
        iframeIds.forEach(function(iframeId) {
            var iframeEl = document.getElementById(iframeId);
            if (!iframeEl) {
                return;
            }
            var parentEl = iframeEl.parentNode;
            if (type === 'vimeo') {
                if (!window.Vimeo) {
                    return;
                }
                self.debugLog('[IFRAME_ID] ' + iframeId);
                player = new Vimeo.Player(iframeEl);
                player.ready().then(function () {
                    self.debugLog('[VIMEO_PLAYER] onReady');
                    self.addOverlay(parentEl, player);
                });
                player.on('ended', function() {
                    self.onStateChange(parentEl, player, 'ended');
                });
                player.on('play', function() {
                    self.onStateChange(parentEl, player, 'play');
                });
                player.on('pause', function() {
                    self.onStateChange(parentEl, player, 'pause');
                });
                self.players[iframeId] = player;
            }
            else if (type === 'youtube') {
                if (!window.YT) {
                    return;
                }
                self.debugLog('[IFRAME_ID] ' + iframeId);
                player = new YT.Player(iframeId, {
                    events: {
                        onReady: function(event) {
                            self.debugLog('[YOUTUBE_PLAYER] onReady');
                            self.addOverlay(parentEl, player);
                        },
                        onStateChange: function(event) {
                            self.debugLog('[YOUTUBE_PLAYER] onStateChange', event.data, event.data === YT.PlayerState.PLAYING ? 'PLAYING' : 'NOT_PLAYING');
                            self.onStateChange(parentEl, event.target, event.data);
                        }
                    }
                });
                self.players[iframeId] = player;
            }
        });
    };

    /**
     * Add overlay
     * @param el
     * @param player
     */
    this.addOverlay = function (el, player) {
        var unmuteMessage = mainOptions.unmuteText.replace('IMAGE_URL', mainOptions.iconImageUrl),
            unmuteButton = self.createElement('div', {
                className: 'video-autoplay-overlay',
                innerHTML: '<div class="video-autoplay-overlay-image" style="position: absolute; left: 50%; top: 50%; pointer-events: none;">' + unmuteMessage + '</div>'
            }, {
                position: 'absolute',
                left: '0',
                top: '0',
                width: '100%',
                height: '100%',
                display: 'block',
                boxSizing: 'border-box',
                backgroundColor: 'rgba(0,0,0,0.25)',
                color: 'rgba(255,255,255,0.75)',
                textAlign: 'center',
                fontFamily: 'sans-serif',
                fontSize: '20px',
                lineHeight: '1.4',
                padding: '0',
                cursor: 'pointer'
            });
        el.appendChild(unmuteButton);

        if (mainOptions.autoPlayShakeAnimation) {
            unmuteButton.querySelector('.video-autoplay-overlay-image').classList.add('video-autoplay-animation-shake');
        }
        this.overlaySetSize(el.offsetHeight, unmuteButton);

        unmuteButton.addEventListener('click', function(e) {
            e.preventDefault();
            var isToggle = !el.querySelector('.video-autoplay-overlay-image');
            unmuteButton.style.backgroundColor = 'transparent';
            if (el.querySelector('.video-autoplay-overlay-image')) {
                self.removeEl(el.querySelector('.video-autoplay-overlay-image'));
            }
            self.playingId = null;
            
            if (isToggle) {
                self.playToggle(el, player);
            } else {
                if (self.isPlayerYouTube(player)) {
                    player.pauseVideo();
                    player.seekTo(0);
                    player.unMute();
                    player.setVolume(100);
                    player.playVideo();
                    setTimeout(function() {
                        if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
                            player.playVideo();
                        }
                    }, 200);
                } else {
                    player.pause();
                    player.setCurrentTime(0);
                    player.setVolume(1);
                    player.play();
                    setTimeout(function() {
                        player.getPaused().then(function (paused) {
                            if (paused) {
                                player.play();
                            }
                        });
                    }, 200)
                }
            }
        });
        
        setTimeout(function() {
            var isMobileFirefox = !!(self.device.isMobile && self.device.browser === 'firefox');
            if (!self.playingId && !isMobileFirefox && self.isPlayerYouTube(player) && player.getPlayerState() !== YT.PlayerState.PLAYING) {
                player.mute();
                player.playVideo();
            } else {
                if (self.isPlayerYouTube(player)) {
                    if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
                        self.onPause(el, player);
                    }
                } else {
                    player.getPaused().then(function (paused) {
                        if (paused) {
                            self.onPause(el, player);
                        }
                    });
                }
            }
        }, 1500);
    };

    /**
     * Play toggle
     * @param el
     * @param player
     */
    this.playToggle = function(el, player) {
        if (this.isPlayerYouTube(player)) {
            if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
                player.unMute();
                player.setVolume(100);
                player.playVideo();
            } else {
                player.pauseVideo();
            }
        } else {
            player.getPaused().then(function (paused) {
                if (paused) {
                    player.setVolume(1);
                    player.play();
                } else {
                    player.pause();
                }
            });
        }
    };

    /**
     * Update progress bar
     */
    this.updateProgress = function(el, player, autoUpdate) {
        if (typeof autoUpdate === 'undefined') {
            autoUpdate = true;
        }
        var progressLine = el.querySelector('.video-autoplay-progress-line');
        if (!progressLine) {
            return;
        }
        var duration, currentTime, percent;
        if (self.isPlayerYouTube(player)) {
            duration = player.getDuration();
            currentTime = player.getCurrentTime();
            percent = Math.round(100 / (duration / currentTime));
            progressLine.style.width = percent + '%';
            self.debugLog('[UPDATE_PROGRESS] youtube');
            clearTimeout(self.timers[self.getTimerKey(el, player, 'progress-')]);
            if (autoUpdate) {
                self.timers[self.getTimerKey(el, player, 'progress-')] = setTimeout(function() {
                    self.updateProgress(el, player);
                }, 200);
            }
        } else {
            player.getCurrentTime().then(function(currentTime) {
                player.getDuration().then(function(duration) {
                    percent = Math.round(100 / (duration / currentTime));
                    progressLine.style.width = percent + '%';
                    self.debugLog('[UPDATE_PROGRESS] vimeo');
                    clearTimeout(self.timers[self.getTimerKey(el, player, 'progress-')]);
                    if (autoUpdate) {
                        self.timers[self.getTimerKey(el, player, 'progress-')] = setTimeout(function() {
                            self.updateProgress(el, player);
                        }, 200);
                    }
                });
            });
        }
    };

    /**
     * Progress bar initialization
     * @param el
     * @param player
     */
    this.progressBarInit = function(el, player) {
        this.debugLog('[PROGRESS_BAR_INIT]', this.isPlayerYouTube(player) ? 'youtube' : 'vimeo');
        
        var overlayEl = el.querySelector('.video-autoplay-overlay');
        if (!overlayEl) {
            return;
        }
        if (!overlayEl.querySelector('.video-autoplay-progress-line')) {
            
            var progressStyles = mainOptions.skin
                ? ''
                : ' style="height: 10px; width: 100%; background-color: #fff;"';
            var lineStyles = mainOptions.skin
                ? ''
                : 'style="height: 10px; width: 0%; pointer-events: none; background-color: ' + mainOptions.colorProgressBar + ';"';
            
            var divBottom = this.createElement('div', {
                className: cssBottomPanelClassName,
                innerHTML: '<div class="video-autoplay-progress"' + progressStyles + '>'
                    + '<div class="video-autoplay-progress-line"' + lineStyles + '></div></div>'
            }, mainOptions.skin ? {} : {
                position: 'absolute',
                left: 0,
                bottom: 0,
                width: '100%',
                height: '10px',
                backgroundColor: mainOptions.colorBars,
                color: '#fff',
                fontSize: '20px',
                boxSizing: 'border-box'
            });
            overlayEl.appendChild(divBottom);

            if (!mainOptions.disableSeek) {
                overlayEl.querySelector('.video-autoplay-progress').addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    var clientRect = e.target.getBoundingClientRect(),
                        width = clientRect.width,
                        clickPosX = e.clientX - clientRect.left,
                        percent = 100 / (width / clickPosX);

                    if (self.isPlayerYouTube(player)) {
                        var duration = player.getDuration();
                        var newTime = duration / (100 / percent);
                        player.seekTo(newTime);
                        setTimeout(function() {
                            self.updateProgress(el, player, false);
                        }, 200);
                    } else {
                        player.getDuration().then(function(duration) {
                            var newTime = duration / (100 / percent);
                            player.setCurrentTime(newTime);
                            setTimeout(function() {
                                self.updateProgress(el, player, false);
                            }, 200);
                        });
                    }
                });
            }
        }
        
        if (this.isPlayerYouTube(player)) {
            self.debugLog('[YOUTUBE_PLAYER] progressBarInit - paused?', player.getPlayerState() !== YT.PlayerState.PLAYING);
            if (player.getPlayerState() === YT.PlayerState.PLAYING && !el.querySelector('.video-autoplay-overlay-image')) {
                this.updateProgress(el, player);
            }
        } else {
            player.getPaused().then(function (paused) {
                self.debugLog('[VIMEO_PLAYER] progressBarInit - paused?', paused);
                if (!paused && !el.querySelector('.video-autoplay-overlay-image')) {
                    self.updateProgress(el, player);
                }
            });
        }
    };

    /**
     * On player state change
     * @param el
     * @param player
     * @param state
     */
    this.onStateChange = function(el, player, state) {
        if (this.isPlayerYouTube(player)) {
            if (state === YT.PlayerState.PLAYING) {
                this.onPlay(el, player);
            } else if (state === YT.PlayerState.PAUSED) {
                this.onPause(el, player);
            } else if (state === YT.PlayerState.ENDED) {
                self.playingId = null;
                if (el.querySelector('.video-autoplay-overlay-image')) {
                    this.removeEl(el.querySelector('.video-autoplay-overlay-image'));
                }
                this.onPause(el, player, mainOptions.textEnded);
            }
        } else {
            if (state === 'play') {
                this.onPlay(el, player);
            } else if (state === 'pause') {
                this.onPause(el, player);
            } else if (state === 'ended') {
                self.playingId = null;
                if (el.querySelector('.video-autoplay-overlay-image')) {
                    this.removeEl(el.querySelector('.video-autoplay-overlay-image'));
                }
                this.onPause(el, player, mainOptions.textEnded);
            }
        }
    };
    
    /**
     * On play
     * @param el
     * @param player
     */
    this.onPlay = function(el, player) {
        var isYouTubePlayer = this.isPlayerYouTube(player);
        this.debugLog('[ON_PLAY]', isYouTubePlayer ? 'youtube' : 'vimeo');
        
        var notMutedCallback = function() {
            if (el.querySelector('.video-autoplay-overlay-image')) {
                self.removeEl(el.querySelector('.video-autoplay-overlay-image'));
            }
            if (el.querySelector('.video-autoplay-overlay')) {
                el.querySelector('.video-autoplay-overlay').style.backgroundColor = 'transparent';
            }
            clearTimeout(self.timers[self.getTimerKey(el, player, 'play-')]);
            self.timers[self.getTimerKey(el, player, 'play-')] = setTimeout(function() {
                el.classList.remove('video-autoplay-paused');
                if (!mainOptions.skin) {
                    if (el.querySelector('.' + cssTopPanelClassName)) {
                        el.querySelector('.' + cssTopPanelClassName).style.display = 'none';
                    }
                    if (el.querySelector('.' + cssPlayButtonClassName)) {
                        el.querySelector('.' + cssPlayButtonClassName).style.display = 'none';
                    }
                    if (el.querySelector('.' + cssBottomPanelClassName)) {
                        el.querySelector('.' + cssBottomPanelClassName).style.display = 'block';
                        el.querySelector('.' + cssBottomPanelClassName).style.height= '10px';
                    }
                }
            }, 500);
            self.progressBarInit(el, player);
            if (mainOptions.pauseOthersWhenPlaying) {
                if (!self.playingId) {
                    self.playingId = self.getElementVideoId(el);
                    self.pauseOthers();
                }
            }
        };
        
        var mutedCallback = function() {
            clearTimeout(self.timers[self.getTimerKey(el, player, 'play-')]);
            self.timers[self.getTimerKey(el, player, 'play-')] = setTimeout(function() {
                if (el.querySelector('.' + cssTopPanelClassName)) {
                    el.querySelector('.' + cssTopPanelClassName).style.display = 'none';
                }
                if (el.querySelector('.' + cssPlayButtonClassName)) {
                    el.querySelector('.' + cssPlayButtonClassName).style.display = 'none';
                }
                if (el.querySelector('.' + cssBottomPanelClassName)) {
                    el.querySelector('.' + cssBottomPanelClassName).style.display = 'none';
                }
            }, 500);
        };
        
        if (isYouTubePlayer) {
            self.debugLog('[YOUTUBE_MUTED_VOLUME]', player.isMuted(), player.getVolume());
            if (!player.isMuted() && player.getVolume() > 0) {
                notMutedCallback();
            } else {
                mutedCallback();
            }
        } else {
            player.getVolume().then(function(volume) {
                self.debugLog('[VIMEO_VOLUME]', volume);
                if (volume > 0) {
                    notMutedCallback();
                } else {
                    mutedCallback();
                }
            });
        }
    };

    /**
     * On pause
     * @param el
     * @param player
     * @param {string} text
     */
    this.onPause = function(el, player, text) {
        var isYouTubePlayer = this.isPlayerYouTube(player);
        this.debugLog('[ON_PAUSE]', isYouTubePlayer ? 'youtube' : 'vimeo');

        el.classList.add('video-autoplay-paused');
        
        clearTimeout(self.timers[self.getTimerKey(el, player, 'play-')]);
        clearTimeout(self.timers[self.getTimerKey(el, player, 'progress-')]);
        if (typeof text === 'undefined') {
            text = mainOptions.textPaused;
        }
        this.progressBarInit(el, player);
        var overlayEl = el.querySelector('.video-autoplay-overlay');
        if (!overlayEl) {
            return;
        }

        if (el.querySelector('.video-autoplay-overlay-image')) {
            self.removeEl(el.querySelector('.video-autoplay-overlay-image'));
        }
        
        if (!overlayEl.querySelector('.' + cssTopPanelClassName)) {
            var divTop = this.createElement('div', {
                className: cssTopPanelClassName,
                textContent: text
            }, mainOptions.skin ? {} : {
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: isYouTubePlayer ? '60px' : '50px',
                padding: '0 30px',
                textAlign: 'left',
                backgroundColor: mainOptions.colorBars,
                color: '#fff',
                fontSize: '20px',
                lineHeight: isYouTubePlayer ? '60px' : '50px',
                boxSizing: 'border-box',
                pointerEvents: 'none'
            });
            overlayEl.appendChild(divTop);
            
            var divPlay = this.createElement('div', {
                className: cssPlayButtonClassName
            }, mainOptions.skin ? {} : {
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: '120px',
                height: '120px',
                margin: '-60px 0 0 -60px',
                background: 'url("' + mainOptions.playImageUrl + '") no-repeat 50% 50% ' + mainOptions.colorPlayButton,
                color: '#fff',
                boxSizing: 'border-box',
                borderRadius: '50%',
                pointerEvents: 'none'
            });
            overlayEl.appendChild(divPlay);
        } else if (!mainOptions.skin) {
            overlayEl.querySelector('.' + cssTopPanelClassName).textContent = text;
            overlayEl.querySelector('.' + cssTopPanelClassName).style.display = 'block';
            overlayEl.querySelector('.' + cssPlayButtonClassName).style.display = 'block';
        }
        if (!mainOptions.skin) {
            if (overlayEl.querySelector('.' + cssBottomPanelClassName)) {
                overlayEl.querySelector('.' + cssBottomPanelClassName).style.height = isYouTubePlayer
                    ? '60px'
                    : '50px';
            }
        }
    };

    /**
     * Pause others players when play one
     */
    this.pauseOthers = function() {
        if (!this.playingId) {
            return;
        }
        self.debugLog('[PAUSE_OTHERS] playing: ', this.playingId);
        var elements = document.querySelectorAll('.' + mainOptions.targetClassName);
        var player;
        elements.forEach(function(el) {
            var videoId = self.getElementVideoId(el);
            if (videoId === self.playingId) {
                return;
            }
            var iframeEl = el.querySelector('iframe');
            if (iframeEl) {
                var iframeId = iframeEl.getAttribute('id');
                player = self.players[iframeId];
                if (player) {
                    var isYouTubePlayer = self.isPlayerYouTube(player);
                    
                    clearTimeout(self.timers[self.getTimerKey(el, player, 'pause-others-')]);
                    self.timers[self.getTimerKey(el, player, 'pause-others-')] = setTimeout(function() {
                        if (isYouTubePlayer) {
                            if (player.getPlayerState() === YT.PlayerState.PLAYING) {
                                player.pauseVideo();
                            }
                        } else {
                            player.getPaused().then(function (paused) {
                                if (!paused) {
                                    player.pause();
                                }
                            });
                        }
                        self.debugLog('[PAUSE_OTHERS] video paused:', videoId);
                    }, 800);
                }
            }
        });
    };

    /**
     * Detect player type
     * @param player
     * @returns {boolean}
     */
    this.isPlayerYouTube = function(player) {
        return !!(window.YT && player instanceof YT.Player);
    };

    /**
     *
     * @param tagName
     * @param attributes
     * @param css
     * @returns {HTMLElement}
     */
    this.createElement = function(tagName, attributes, css) {
        var el = document.createElement(tagName);
        if (attributes) {
            Object.keys(attributes).forEach(function (key) {
                if (attributes[key] !== null) {
                    if (['className', 'innerHTML', 'outerHTML', 'innerText', 'textContent'].indexOf(key) > -1) {
                        el[key] = attributes[key];
                    } else {
                        el.setAttribute(key, attributes[key]);
                    }
                }
            });
        }
        if (css) {
            Object.keys(css).forEach(function (key) {
                el.style[key] = css[key];
            });
        }
        return el;
    };

    /**
     * Remove HTML element
     * @param {HTMLElement} el
     */
    this.removeEl = function(el) {
        el.parentNode.removeChild(el);
    };

    /**
     * AutoPlay detection
     * @param {function} resolve
     * @param {function} reject
     */
    this.getIsAutoPlayAvailable = function(resolve, reject) {
        this.debugLog('[CALL-isAutoPlayAvailable]');
        if (this.device.isMobile) {
            resolve();
            return;
        }
        var videoEl = this.createElement('video', {
            src: 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAs1tZGF0AAACrgYF//+q3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE0OCByMjYwMSBhMGNkN2QzIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxNSAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTMgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MzoweDExMyBtZT1oZXggc3VibWU9NyBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0xIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MSA4eDhkY3Q9MSBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0tMiB0aHJlYWRzPTEgbG9va2FoZWFkX3RocmVhZHM9MSBzbGljZWRfdGhyZWFkcz0wIG5yPTAgZGVjaW1hdGU9MSBpbnRlcmxhY2VkPTAgYmx1cmF5X2NvbXBhdD0wIGNvbnN0cmFpbmVkX2ludHJhPTAgYmZyYW1lcz0zIGJfcHlyYW1pZD0yIGJfYWRhcHQ9MSBiX2JpYXM9MCBkaXJlY3Q9MSB3ZWlnaHRiPTEgb3Blbl9nb3A9MCB3ZWlnaHRwPTIga2V5aW50PTI1MCBrZXlpbnRfbWluPTEwIHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAAD2WIhAA3//728P4FNjuZQQAAAu5tb292AAAAbG12aGQAAAAAAAAAAAAAAAAAAAPoAAAAZAABAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAACGHRyYWsAAABcdGtoZAAAAAMAAAAAAAAAAAAAAAEAAAAAAAAAZAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAgAAAAIAAAAAACRlZHRzAAAAHGVsc3QAAAAAAAAAAQAAAGQAAAAAAAEAAAAAAZBtZGlhAAAAIG1kaGQAAAAAAAAAAAAAAAAAACgAAAAEAFXEAAAAAAAtaGRscgAAAAAAAAAAdmlkZQAAAAAAAAAAAAAAAFZpZGVvSGFuZGxlcgAAAAE7bWluZgAAABR2bWhkAAAAAQAAAAAAAAAAAAAAJGRpbmYAAAAcZHJlZgAAAAAAAAABAAAADHVybCAAAAABAAAA+3N0YmwAAACXc3RzZAAAAAAAAAABAAAAh2F2YzEAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAgACAEgAAABIAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY//8AAAAxYXZjQwFkAAr/4QAYZ2QACqzZX4iIhAAAAwAEAAADAFA8SJZYAQAGaOvjyyLAAAAAGHN0dHMAAAAAAAAAAQAAAAEAAAQAAAAAHHN0c2MAAAAAAAAAAQAAAAEAAAABAAAAAQAAABRzdHN6AAAAAAAAAsUAAAABAAAAFHN0Y28AAAAAAAAAAQAAADAAAABidWR0YQAAAFptZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAAC1pbHN0AAAAJal0b28AAAAdZGF0YQAAAAEAAAAATGF2ZjU2LjQwLjEwMQ==',
            width: '200',
            height: '100',
            id: 'cp-test-video'
        }, {
            opacity: '0.01',
            position: 'fixed',
            right: 0,
            bottom: 0,
            pointerEvents: 'none'
        });
        var failCallback = function (e) {
            self.debugLog('[VIDEO CHECK AUTOPLAY] FAIL', e && e.message ? e.message : 'ERROR');
            self.removeEl(document.getElementById('cp-test-video'));
            reject();
        };
        document.body.appendChild(videoEl);
        var promiseState = '';
        try {
            self.debugLog('[INSIDE_TRY]');
            setTimeout(function() {
                self.debugLog('[TIMEOUT]', promiseState);
                if (!promiseState) {
                    failCallback();
                }
            }, 1000);
            videoEl.play().then(function(){
                    self.debugLog('[VIDEO CHECK AUTOPLAY] SUCCESS');
                    self.removeEl(document.getElementById('cp-test-video'));
                    promiseState = 'resolved';
                    resolve();
                })
                .catch(function(e) {
                    promiseState = 'rejected';
                    failCallback(e);
                })
                .finally(function(e) {
                    self.debugLog('[PLAY_PROMISE_FINALLY]', e, promiseState);
                });
        } catch (e) {
            self.debugLog('[PLAY PROMISE ERROR]');
            promiseState = 'rejected';
            failCallback(e);
        } finally {
            self.debugLog('[TRY_FINALLY]', promiseState);
        }
        this.debugLog('[AFTER-isAutoPlayAvailable]');
    };

    /**
     * Create animation style sheet
     */
    this.createAnimationStyleSheet = function() {
        var style = document.createElement('style');
        style.setAttribute('type', 'text/css');
        document.querySelector('head').appendChild(style);
        
        var stylesContent = '.video-autoplay-animation-shake { display: block; animation: shake 1.5s; animation-iteration-count: infinite; }\n' +
        '@keyframes shake {\n' +
        '    0% { transform: translate(1px, 1px) rotate(0deg); }\n' +
        '    10% { transform: translate(-2px, -3px) rotate(-2deg); }\n' +
        '    20% { transform: translate(-4px, 0px) rotate(2deg); }\n' +
        '    30% { transform: translate(4px, 2px) rotate(0deg); }\n' +
        '    40% { transform: translate(2px, -2px) rotate(2deg); }\n' +
        '    50% { transform: translate(-2px, 3px) rotate(-2deg); }\n' +
        '    60% { transform: translate(-4px, 2px) rotate(0deg); }\n' +
        '    70% { transform: translate(4px, 2px) rotate(-2deg); }\n' +
        '    80% { transform: translate(-2px, -2px) rotate(2deg); }\n' +
        '    90% { transform: translate(2px, 3px) rotate(0deg); }\n' +
        '    100% { transform: translate(2px, 2px) rotate(-2deg); }\n' +
        '}';
        style.appendChild(document.createTextNode(stylesContent));
    };

    /**
     * @param el
     * @returns {string}
     */
    this.getElementVideoId = function(el) {
        return el.dataset.youtubeId || el.dataset.vimeoId;
    };

    /**
     * Get timer variable
     * @param el
     * @param player
     * @param prefix
     * @returns {string}
     */
    this.getTimerKey = function(el, player, prefix) {
        var videoId = this.getElementVideoId(el);
        if (!this.timers[prefix + videoId]) {
            this.timers[prefix + videoId] = null;
        }
        return prefix + videoId;
    };

    /**
     * Detect device platform
     */
    this.deviceDetectInit = function () {
        var userAgent = window.navigator.userAgent.toLowerCase(),
            platform = window.navigator.platform;

        this.device.isAndroid = userAgent.indexOf('android') > -1;
        this.device.isIOS = /iP(hone|od|ad)/.test(platform);
        this.device.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        this.device.isEdge = navigator.userAgent.indexOf('Edge') !== -1 && (!!navigator.msSaveOrOpenBlob || !!navigator.msSaveBlob);
        this.device.browser = '';
        this.device.version = 0;
        this.device.isAutoPlayAvailable = !this.device.isMobile;

        if (userAgent.indexOf('firefox') > -1) {
            this.device.browser = 'firefox';
        } else if (userAgent.indexOf(' opt/') !== -1) {
            this.device.browser = 'opera-touch';
        } else if (userAgent.indexOf('chrome') > -1
            || userAgent.indexOf('crios') > -1) {
            this.device.browser = 'chrome';
            this.device.isAutoPlayAvailable = false;
        } else if (userAgent.indexOf('safari') !== -1) {
            this.device.browser = 'safari';
            var matches = /version\/(\d+)/.exec(userAgent);
            this.device.version = matches.length >= 1
                ? parseInt(matches[1])
                : 0;
            if(this.device.browser === 'safari'
                && this.device.version === 11){
                this.device.isAutoPlayAvailable = false;
            }
        }
    };

    this.onResize = function() {
        var elements = document.querySelectorAll('.' + mainOptions.targetClassName);
        elements.forEach(function(el) {
            var height = el.offsetHeight,
                overlayEl = el.querySelector('.video-autoplay-overlay');
            if (!overlayEl) {
                return;
            }
            if (overlayEl.querySelector('.video-autoplay-overlay-image')) {
                self.overlaySetSize(height, overlayEl);
            }
        });
    };

    /**
     * Overlay content size update
     * @param height
     * @param overlayEl
     */
    this.overlaySetSize = function(height, overlayEl) {
        if (!overlayEl) {
            return;
        }
        var innerEl = overlayEl.querySelector('div'),
            innerImageEl = overlayEl.querySelector('div > img');
        if (height < 185) {
            innerEl.style.width = '200px';
            innerEl.style.height = '104px';
            innerEl.style.margin = '-52px 0 0 -100px';
            innerEl.style.fontSize = '16px';
            if (innerImageEl) {
                innerImageEl.style.width = 'auto';
                innerImageEl.style.height = '60px';
            }
        } else {
            innerEl.style.width = '200px';
            innerEl.style.height = 'height: 160px';
            innerEl.style.margin = '-80px 0 0 -100px';
            innerEl.style.fontSize = '20px';
            if (innerImageEl) {
                innerImageEl.style.width = 'auto';
                innerImageEl.style.height = '100px';
            }
        }
    };

    /**
     * Extend object
     * @param obj
     * @param props
     */
    this.extend = function(obj, props) {
        for (var prop in props) {
            if (props.hasOwnProperty(prop)) {
                obj[prop] = props[prop];
            }
        }
    };

    /**
     * Display debug info in console
     */
    this.debugLog = function() {
        if (mainOptions.debug) {
            console.log.apply(this, arguments);
        }
    };

    this.init();
};
