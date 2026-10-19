// 元素引用
const video = document.getElementById('my-video');
const videoPlayer = document.getElementById('video-player');
const controls = document.getElementById('controls');
const playPauseBtn = document.getElementById('play-pause');
const timeDisplay = document.getElementById('time-display');
const progressBar = document.getElementById('progress-bar');
const progressFilled = document.getElementById('progress-filled');
const progressThumb = document.getElementById('progress-thumb');
const volumeBtn = document.getElementById('volume-btn');
const volumeSlider = document.getElementById('volume-slider');
const volumeValue = document.getElementById('volume-value');

const speedBtn = document.getElementById('speed');
const fullscreenBtn = document.getElementById('fullscreen');
const loadingEl = document.getElementById('loading');

// 状态变量
let speedIndex = 2;
const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
let isDragging = false;
let hideControlsTimer = null;
let isMouseOverControls = false;
let loadingTimer = null;
let isInFullscreen = false;

// 快捷键相关
const seekStep = 5; // 进度步长（秒）
const volumeStep = 0.05; // 音量调节步长

// 工具函数
function formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateVolumeDisplay() {
    const volumePercent = Math.round(video.volume * 100);
    
    if (video.volume === 0) {
        volumeBtn.textContent = '🔇';
    } else if (video.volume < 0.3) {
        volumeBtn.textContent = '🔈';
    } else if (video.volume < 0.7) {
        volumeBtn.textContent = '🔉';
    } else {
        volumeBtn.textContent = '🔊';
    }
    
    volumeValue.textContent = volumePercent;
}

// 显示/隐藏控制栏
function showControls() {
    clearTimeout(hideControlsTimer);
    controls.style.opacity = '1';
}

function hideControls() {
    if (!video.paused && !isMouseOverControls) {
        controls.style.opacity = '0';
    }
}

function scheduleHideControls() {
    clearTimeout(hideControlsTimer);
    
    if (!video.paused && !isMouseOverControls) {
        hideControlsTimer = setTimeout(() => {
            hideControls();
        }, 2000);
    }
}

// 播放控制
function togglePlay() {
    if (video.paused || video.ended) {
        video.play();
        playPauseBtn.textContent = '❚❚';
        scheduleHideControls();
    } else {
        video.pause();
        playPauseBtn.textContent = '▶';
        showControls();
    }
}

// 进度控制
function updateProgress() {
    if (isDragging || !video.duration) return;
    
    const percent = (video.currentTime / video.duration) * 100;
    progressFilled.style.width = `${percent}%`;
    
    if (progressThumb) {
        progressThumb.style.left = `${percent}%`;
    }
    
    timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
}

function seek(e) {
    const rect = progressBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = percent * video.duration;
}

function startDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    
    isDragging = true;
    progressBar.classList.add('dragging');
    showControls();
    
    const handleMouseMove = (moveEvent) => {
        if (!isDragging) return;
        
        const rect = progressBar.getBoundingClientRect();
        let percent = ((moveEvent.clientX - rect.left) / rect.width) * 100;
        percent = Math.max(0, Math.min(100, percent));
        
        const targetTime = (percent / 100) * video.duration;
        timeDisplay.textContent = `${formatTime(targetTime)} / ${formatTime(video.duration)}`;
        
        progressFilled.style.transition = 'none';
        progressFilled.style.width = `${percent}%`;
        
        if (progressThumb) {
            progressThumb.style.transition = 'none';
            progressThumb.style.left = `${percent}%`;
        }
    };
    
    const handleMouseUp = (upEvent) => {
        isDragging = false;
        progressBar.classList.remove('dragging');
        
        progressFilled.style.transition = '';
        if (progressThumb) {
            progressThumb.style.transition = '';
        }
        
        const rect = progressBar.getBoundingClientRect();
        let percent = ((upEvent.clientX - rect.left) / rect.width) * 100;
        percent = Math.max(0, Math.min(100, percent));
        video.currentTime = (percent / 100) * video.duration;
        
        scheduleHideControls();
        
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };
    
    handleMouseMove(e);
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}

// 音量控制
function updateVolume() {
    video.volume = parseFloat(volumeSlider.value);
    updateVolumeDisplay();
}

function toggleMute() {
    if (video.volume > 0) {
        video.dataset.lastVolume = video.volume;
        video.volume = 0;
        volumeSlider.value = 0;
    } else {
        const lastVolume = video.dataset.lastVolume || 1;
        video.volume = parseFloat(lastVolume);
        volumeSlider.value = lastVolume;
        delete video.dataset.lastVolume;
    }
    updateVolumeDisplay();
}

// 调节音量
function adjustVolume(delta) {
    let newVolume = video.volume + delta;
    newVolume = Math.max(0, Math.min(1, newVolume)); // 限制在0-1之间
    
    video.volume = newVolume;
    volumeSlider.value = newVolume;
    updateVolumeDisplay();
    
    showVolumeChangeHint(newVolume);
}

// 用快捷键时显示音量提示
function showVolumeChangeHint(volume) {
    const percent = Math.round(volume * 100);
    const hint = document.createElement('div');
    hint.className = 'volume-hint';
    hint.textContent = `音量: ${percent}%`;
    hint.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        font-size: 14px;
        z-index: 1000;
        pointer-events: none;
        animation: fadeOut 2s ease forwards;
    `;
    
    // 添加淡出动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeOut {
            0% { opacity: 1; }
            70% { opacity: 1; }
            100% { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    videoPlayer.appendChild(hint);
    
    // 2秒后移除提示
    setTimeout(() => {
        if (hint.parentNode) {
            hint.parentNode.removeChild(hint);
        }
    }, 2000);
}

// 快进/快退
function seekVideo(seconds) {
    const newTime = video.currentTime + seconds;
    video.currentTime = Math.max(0, Math.min(video.duration, newTime));
    updateProgress();
}

// 播放速度控制
function toggleSpeed() {
    speedIndex = (speedIndex + 1) % speeds.length;
    video.playbackRate = speeds[speedIndex];
    speedBtn.textContent = `${speeds[speedIndex]}x`;
}

// 全屏控制
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        videoPlayer.requestFullscreen();
        isInFullscreen = true;
    } else {
        document.exitFullscreen();
        isInFullscreen = false;
    }
}

// 键盘快捷键处理
function handleKeyDown(e) {
    // 如果焦点在输入元素上，不处理快捷键
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    
    switch (e.key) {
        case ' ':
        case 'Spacebar':
            e.preventDefault();
            togglePlay();
            showControls();
            break;
            
        case 'ArrowLeft':
            e.preventDefault();
            seekVideo(-seekStep);
            showControls();
            break;
            
        case 'ArrowRight':
            e.preventDefault();
            seekVideo(seekStep);
            showControls();
            break;
            
        case 'ArrowUp':
            e.preventDefault();
            adjustVolume(volumeStep);
            showControls();
            break;
            
        case 'ArrowDown':
            e.preventDefault();
            adjustVolume(-volumeStep);
            showControls();
            break;
            
        case 'f':
        case 'F':
            e.preventDefault();
            toggleFullscreen();
            showControls();
            break;
            
        case 'm':
        case 'M':
            e.preventDefault();
            toggleMute();
            showControls();
            break;
    }
}

// 事件处理器
function handleVideoClick() {
    togglePlay();
}

function handlePlayPauseClick(e) {
    e.stopPropagation();
    togglePlay();
}

function handleVideoEnded() {
    playPauseBtn.textContent = '▶';
    showControls();
}

function handleWaiting() {
    loadingEl.style.display = 'block';
}

function handleCanPlay() {
    loadingEl.style.display = 'none';
}

function handleControlsMouseEnter() {
    isMouseOverControls = true;
    showControls();
}

function handleControlsMouseLeave() {
    isMouseOverControls = false;
    scheduleHideControls();
}

function handleFullscreenChange() {
    isInFullscreen = !!document.fullscreenElement;
    
    if (!video.paused) {
        scheduleHideControls();
    }
}

// 内存清理
function cleanup() {
    clearTimeout(hideControlsTimer);
    clearTimeout(loadingTimer);
    
    // 移除事件监听器
    video.removeEventListener('click', handleVideoClick);
    video.removeEventListener('ended', handleVideoEnded);
    video.removeEventListener('waiting', handleWaiting);
    video.removeEventListener('canplay', handleCanPlay);
    video.removeEventListener('timeupdate', updateProgress);
    video.removeEventListener('loadedmetadata', updateProgress);
    
    playPauseBtn.removeEventListener('click', handlePlayPauseClick);
    progressBar.removeEventListener('click', seek);
    progressBar.removeEventListener('mousedown', startDrag);
    
    if (progressThumb) {
        progressThumb.removeEventListener('mousedown', startDrag);
    }
    
    volumeSlider.removeEventListener('input', updateVolume);
    volumeBtn.removeEventListener('click', toggleMute);
    speedBtn.removeEventListener('click', toggleSpeed);
    fullscreenBtn.removeEventListener('click', toggleFullscreen);
    controls.removeEventListener('mouseenter', handleControlsMouseEnter);
    controls.removeEventListener('mouseleave', handleControlsMouseLeave);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('keydown', handleKeyDown);
}

// 初始化
function init() {
    cleanup();
    
    video.volume = parseFloat(volumeSlider.value);
    updateVolumeDisplay();
    
    video.addEventListener('click', handleVideoClick);
    video.addEventListener('ended', handleVideoEnded);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', updateProgress);
    
    playPauseBtn.addEventListener('click', handlePlayPauseClick);
    progressBar.addEventListener('click', seek);
    progressBar.addEventListener('mousedown', startDrag);
    
    if (progressThumb) {
        progressThumb.addEventListener('mousedown', startDrag);
    }
    
    volumeSlider.addEventListener('input', updateVolume);
    volumeBtn.addEventListener('click', toggleMute);
    speedBtn.addEventListener('click', toggleSpeed);
    fullscreenBtn.addEventListener('click', toggleFullscreen);
    controls.addEventListener('mouseenter', handleControlsMouseEnter);
    controls.addEventListener('mouseleave', handleControlsMouseLeave);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    document.addEventListener('keydown', handleKeyDown);
    
    showControls();
}

// 在页面卸载时清理
window.addEventListener('beforeunload', cleanup);
window.addEventListener('pagehide', cleanup);

// 启动
init();