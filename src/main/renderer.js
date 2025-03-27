// renderer.js
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('visualizer-canvas');
  const ctx = canvas.getContext('2d');
  const audioPlayer = document.getElementById('audio-player');
  const selectFileBtn = document.getElementById('select-file-btn');
  const trackInfo = document.getElementById('track-info');
  const colorThemeSelect = document.getElementById('color-theme');
  const playPauseBtn = document.getElementById('play-pause-btn');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const progressFill = document.getElementById('progress-fill');
  const timeDisplay = document.getElementById('time-display');
  const volumeSlider = document.getElementById('volume-slider');
  
  const setCanvasDimensions = () => {
    canvas.width = 160;
    canvas.height = 40;
  };
  
  setCanvasDimensions();
  

  // Window control buttons
  document.getElementById('close-btn').addEventListener('click', () => {
    window.electronAPI.closeWindow();
  });

  // document.getElementById('minimize-btn').addEventListener('click', () => {
  //   window.electronAPI.minimizeWindow();
  // });

  // document.getElementById('maximize-btn').addEventListener('click', () => {
  //   window.electronAPI.maximizeWindow();
  // });
  
  // Audio context and analyzer setup
  let audioContext;
  let analyser;
  let audioSource;
  let dataArray;
  let currentTrack = null;
  let playlist = [];
  let currentTrackIndex = -1;
  
  // Color themes
  const colorThemes = {
    retro: ['#ff8800', '#ffaa00', '#ffcc00', '#ffdd00', '#ffee00'],
    cyberpunk: ['#ff00ff', '#00ffff', '#ffff00', '#00ff99', '#ff0066'],
    pastel: ['#ffcccc', '#ccffcc', '#ccccff', '#ffffcc', '#ffccff'],
    monochrome: ['#ffffff', '#dddddd', '#bbbbbb', '#999999', '#777777']
  };
  
  let currentTheme = colorThemes.retro;
  
  // Handle color theme change
  colorThemeSelect.addEventListener('change', () => {
    currentTheme = colorThemes[colorThemeSelect.value];
  });
  
  // Setup audio context and analyzer
  const setupAudio = () => {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      
      const bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
      
      audioSource = audioContext.createMediaElementSource(audioPlayer);
      audioSource.connect(analyser);
      analyser.connect(audioContext.destination);
    }
  };
  
  // Format time from seconds to MM:SS
  const formatTime = (seconds) => {
    seconds = Math.floor(seconds);
    const minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Update playback progress
  const updateProgress = () => {
    if (audioPlayer.duration) {
      const percentage = (audioPlayer.currentTime / audioPlayer.duration) * 100;
      progressFill.style.width = `${percentage}%`;
      
      timeDisplay.textContent = `${formatTime(audioPlayer.currentTime)} / ${formatTime(audioPlayer.duration)}`;
    } else {
      timeDisplay.textContent = '00:00 / 00:00';
    }
  };
  
  // Update playback progress regularly
  setInterval(updateProgress, 100);
  
  // Play/Pause toggle
  playPauseBtn.addEventListener('click', () => {
    if (!currentTrack) return;
    
    if (audioPlayer.paused) {
      audioPlayer.play();
      playPauseBtn.innerHTML = '⏸';
      
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
    } else {
      audioPlayer.pause();
      playPauseBtn.innerHTML = '▶';
    }
  });
  
  // Previous track
  prevBtn.addEventListener('click', () => {
    if (playlist.length === 0) return;
    
    if (audioPlayer.currentTime > 3) {
      // If more than 3 seconds into the song, restart current song
      audioPlayer.currentTime = 0;
    } else {
      // Go to previous track
      currentTrackIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
      loadTrack(playlist[currentTrackIndex]);
    }
  });
  
  // Next track
  nextBtn.addEventListener('click', () => {
    if (playlist.length === 0) return;
    
    currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
    loadTrack(playlist[currentTrackIndex]);
  });
  
  // Volume control
  volumeSlider.addEventListener('input', () => {
    audioPlayer.volume = volumeSlider.value / 100;
    document.querySelector('.volume-display').textContent = `VOL: ${Math.round(volumeSlider.value / 10)}`;
  });
  
  // Initial volume setup
  audioPlayer.volume = volumeSlider.value / 100;
  
  // Load a track
  const loadTrack = (filePath) => {
    currentTrack = filePath;
    audioPlayer.src = `file://${filePath}`;
    
    // Extract filename for display
    const fileName = filePath.split('\\').pop().split('/').pop();
    trackInfo.innerHTML = `<span class="scrolling-text">Now playing: ${fileName}</span>`;
    
    // Auto-play and update UI
    audioPlayer.play()
      .then(() => {
        playPauseBtn.innerHTML = '⏸';
        
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume();
        }
      })
      .catch(error => {
        console.error('Failed to play audio:', error);
      });
  };
  
  // Select music file
  selectFileBtn.addEventListener('click', async () => {
    
    if (!window.electronAPI) {
      console.error('electronAPI not found in window object');
      return;
    }
    
    try {
      const filePath = await window.electronAPI.selectMusicFile();
      console.log('Selected file path:', filePath);
      
      if (filePath) {
        // Add to playlist if not already there
        if (!playlist.includes(filePath)) {
          playlist.push(filePath);
        }
        
        currentTrackIndex = playlist.indexOf(filePath);
        setupAudio();
        loadTrack(filePath);
      } else {
      }
    } catch (error) {
      console.error('Error selecting music file:', error);
    }
  });
  
  // Track ended event
  audioPlayer.addEventListener('ended', () => {
    // Play next track
    nextBtn.click();
  });
  
  // Progress bar click to seek
  document.querySelector('.progress-bar').addEventListener('click', (e) => {
    if (!audioPlayer.duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percentage = x / width;
    
    audioPlayer.currentTime = percentage * audioPlayer.duration;
    updateProgress();
  });
  
  // Draw pixel art visualizer
  const draw = () => {
    requestAnimationFrame(draw);
    
    if (!analyser) return;
    
    analyser.getByteFrequencyData(dataArray);
    
    // Clear canvas
    ctx.fillStyle = '#072d07';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw pixelated frequency bars
    const barWidth = Math.ceil(canvas.width / (dataArray.length / 4));
    let x = 0;
    
    for (let i = 0; i < dataArray.length / 4; i++) {
      const barHeight = Math.max(2, (dataArray[i] / 255) * canvas.height);
      
      const colorIndex = i % currentTheme.length;
      ctx.fillStyle = currentTheme[colorIndex];
      
      const pixelSize = 2;
      const pixelBarHeight = Math.floor(barHeight / pixelSize);
      
      for (let py = 0; py < pixelBarHeight; py++) {
        for (let px = 0; px < Math.floor(barWidth / pixelSize); px++) {
          if (Math.random() > 0.1) {
            ctx.fillRect(
              x + (px * pixelSize), 
              canvas.height - ((py + 1) * pixelSize), 
              pixelSize - 1, 
              pixelSize - 1
            );
          }
        }
      }
      
      ctx.globalAlpha = 0.3;
      for (let py = 0; py < Math.min(5, pixelBarHeight); py++) {
        for (let px = 0; px < Math.floor(barWidth / pixelSize); px++) {
          if (Math.random() > 0.3) {
            ctx.fillRect(
              x + (px * pixelSize),
              (py + 1) * pixelSize,
              pixelSize - 1,
              pixelSize - 1
            );
          }
        }
      }
      ctx.globalAlpha = 1.0;
      
      x += barWidth;
    }
    
    if (dataArray[0] > 200) {
      const bassIntensity = dataArray[0] / 255;
      drawEqualizer(bassIntensity);
    }
  };
  

  const drawEqualizer = (intensity) => {
    const dotSize = 2;
    const rows = 3;
    const dotsPerRow = 15;
    const spacing = Math.floor(canvas.width / dotsPerRow);
    
    for (let row = 0; row < rows; row++) {
      for (let i = 0; i < dotsPerRow; i++) {
        const height = Math.sin((i + row * 3) * 0.5 + Date.now() * 0.005) * intensity * 8;
        
        if (height > 0.2) {
          const colorIndex = (i + row) % currentTheme.length;
          ctx.fillStyle = currentTheme[colorIndex];
          ctx.fillRect(
            i * spacing,
            Math.floor(canvas.height / 2) + row * 4 + height,
            dotSize,
            dotSize
          );
        }
      }
    }
  };
  
  draw();
  
  window.addEventListener('resize', setCanvasDimensions);
});