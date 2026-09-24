/* 誉友科技 全站交互脚本 - 夜间模式 + 全局体验 */
(function() {
  'use strict';

  var THEME_KEY = 'yuyoo_theme';

  // 读取主题设置：跟随系统 / 浅色 / 深色
  function getTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(THEME_KEY, t);
  }

  // 初始化主题
  applyTheme(getTheme());

  // 监听系统主题变化
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    (mq.addEventListener || mq.addListener).call(mq, 'change', function() {
      if (!localStorage.getItem(THEME_KEY)) applyTheme(getTheme());
    });
  }

  // 页面加载完成后注入切换按钮（支持点击切换主题 + 拖拽移动位置）
  document.addEventListener('DOMContentLoaded', function() {
    var btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.textContent = getTheme() === 'dark' ? '☀️' : '🌙';
    btn.setAttribute('aria-label', '切换夜间模式');
    btn.setAttribute('title', '点击切换主题，拖动可移动位置');
    document.body.appendChild(btn);

    var POS_KEY = 'yuyoo_setting_theme_pos';
    var dragging = false;
    var moved = false;
    var startX = 0, startY = 0, baseX = 0, baseY = 0;

    function setBtnPos(x, y) {
      btn.style.left = x + 'px';
      btn.style.top = y + 'px';
      btn.style.right = 'auto';
      btn.style.bottom = 'auto';
    }

    // 恢复上次保存的按钮位置
    try {
      var saved = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
      if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
        setBtnPos(saved.x, saved.y);
      }
    } catch (e) {}

    // 点击切换主题（拖拽后不触发）
    btn.addEventListener('click', function() {
      if (moved) { moved = false; return; }
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      btn.textContent = next === 'dark' ? '☀️' : '🌙';
    });

    // 拖拽移动
    btn.addEventListener('pointerdown', function(e) {
      dragging = true;
      moved = false;
      startX = e.clientX;
      startY = e.clientY;
      var rect = btn.getBoundingClientRect();
      baseX = rect.left;
      baseY = rect.top;
      btn.classList.add('dragging');
      if (btn.setPointerCapture) { try { btn.setPointerCapture(e.pointerId); } catch (err) {} }
      e.preventDefault();
    });

    btn.addEventListener('pointermove', function(e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moved = true;
      var x = baseX + dx;
      var y = baseY + dy;
      var w = btn.offsetWidth, h = btn.offsetHeight;
      x = Math.max(4, Math.min(x, window.innerWidth - w - 4));
      y = Math.max(4, Math.min(y, window.innerHeight - h - 4));
      setBtnPos(x, y);
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      btn.classList.remove('dragging');
      var rect = btn.getBoundingClientRect();
      try {
        localStorage.setItem(POS_KEY, JSON.stringify({ x: Math.round(rect.left), y: Math.round(rect.top) }));
      } catch (e) {}
    }
    btn.addEventListener('pointerup', endDrag);
    btn.addEventListener('pointercancel', endDrag);
  });
})();

/* 誉友科技 全站背景音乐 - Web Audio 程序化生成（离线可用，无需音频文件） */
(function() {
  'use strict';

  var KEY = 'yuyoo_setting_music';
  var CHORD_MS = 9000;

  // 四段和弦循环：Cmaj7 - Am7 - Fmaj7 - G6
  var CHORDS = [
    [261.63, 329.63, 392.00, 493.88],
    [220.00, 261.63, 329.63, 392.00],
    [174.61, 220.00, 261.63, 329.63],
    [196.00, 246.94, 293.66, 329.63]
  ];

  var PROG_KEY = 'yuyoo_music_progress';
  var AUDIO_KEY = 'yuyoo_music_at';

  // 本地音乐文件（页面可能在根目录，也可能在 pages/ 子目录）
  var AUDIO_DIR = /\/pages\//.test(location.pathname) ? '../assets/audio/' : 'assets/audio/';
  var AUDIO_FILE = AUDIO_DIR + 'bgm.mp3';

  var ac = null, master = null, filter = null;
  var voices = [];
  var chordTimer = null;
  var want = false;     // 用户意愿：是否要音乐（持久化，只能由用户自己决定）
  var playing = false;  // 是否已调度播放
  var mode = null;      // 'audio' 本地音乐文件优先 / 'synth' 程序化音乐回落
  var audioEl = null;   // 本地音乐的播放元素
  var atSaver = null;
  var btn = null;
  var resumeBound = false;

  function ensureCtx() {
    if (ac) return;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ac = new Ctx();
    master = ac.createGain();
    master.gain.value = 0;
    filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    filter.Q.value = 0.6;
    filter.connect(master);
    master.connect(ac.destination);
  }

  // 播放一个和弦：每音两个轻微失谐振荡器，营造温暖厚度
  function playChord(idx, fadeIn) {
    var notes = CHORDS[idx % CHORDS.length];
    var now = ac.currentTime;
    var group = [];
    notes.forEach(function(f, i) {
      [-4, 4].forEach(function(detune) {
        var osc = ac.createOscillator();
        var g = ac.createGain();
        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.value = f;
        osc.detune.value = detune;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.16 / notes.length, now + fadeIn);
        osc.connect(g);
        g.connect(filter);
        osc.start(now);
        group.push({ osc: osc, g: g });
      });
    });
    voices.push(group);
  }

  // 淡出并回收振荡器
  function releaseVoices(ms) {
    if (!ac) return;
    var now = ac.currentTime;
    voices.forEach(function(group) {
      group.forEach(function(v) {
        try {
          v.g.gain.cancelScheduledValues(now);
          v.g.gain.setValueAtTime(v.g.gain.value, now);
          v.g.gain.linearRampToValueAtTime(0, now + ms / 1000);
          v.osc.stop(now + ms / 1000 + 0.05);
        } catch (e) {}
      });
    });
    voices = [];
  }

  // 记录 / 读取和弦进度，保证切换页面后音乐听起来是连续的（同一会话内）
  function readProgress() {
    try { return JSON.parse(sessionStorage.getItem(PROG_KEY) || 'null'); } catch (e) { return null; }
  }
  function writeProgress(n) {
    try { sessionStorage.setItem(PROG_KEY, JSON.stringify({ n: n, t: Date.now() })); } catch (e) {}
  }

  function scheduleNext(idx, delay) {
    chordTimer = setTimeout(function() {
      releaseVoices(3000);
      playChord(idx + 1, 3.5);
      writeProgress(idx + 1);
      scheduleNext(idx + 1, CHORD_MS);
    }, delay);
  }

  // 本地音乐播放位置的记忆（切页 / 刷新后从断点接着放）
  function readAt() {
    try { return JSON.parse(sessionStorage.getItem(AUDIO_KEY) || 'null'); } catch (e) { return null; }
  }
  function saveAt() {
    if (!audioEl || !audioEl.duration) return;
    try { sessionStorage.setItem(AUDIO_KEY, JSON.stringify({ t: audioEl.currentTime, ts: Date.now() })); } catch (e) {}
  }
  function applyResumePos() {
    var st = readAt();
    if (!st || typeof st.t !== 'number' || !audioEl || !audioEl.duration) return;
    var pos = st.t + (Date.now() - st.ts) / 1000;
    try { audioEl.currentTime = pos % audioEl.duration; } catch (e) {}
  }

  // 探测本地音乐文件：存在就用它，否则回落到程序化音乐（保证页面永远不会哑掉）
  function probeAudio(cb) {
    try {
      audioEl = new Audio();
      audioEl.preload = 'metadata';
      audioEl.loop = true;
      var settled = false;
      audioEl.addEventListener('loadedmetadata', function() {
        if (settled) return;
        settled = true;
        applyResumePos();
        atSaver = setInterval(saveAt, 1000);
        cb('audio');
      });
      audioEl.addEventListener('error', function() {
        if (settled) return;
        settled = true;
        audioEl = null;
        cb('synth');
      });
      audioEl.src = AUDIO_FILE;
      audioEl.load();
    } catch (e) {
      audioEl = null;
      cb('synth');
    }
  }

  function startAudio() {
    if (!audioEl) return false;
    unbindResume();
    var p = audioEl.play();
    if (p && p.catch) p.catch(function() { bindResume(); });
    playing = true;
    return true;
  }
  function stopAudio() {
    if (atSaver) { clearInterval(atSaver); atSaver = null; }
    if (audioEl) { try { saveAt(); audioEl.pause(); } catch (e) {} }
  }

  // 对外统一入口：按实际可用的音乐来源分发
  function start() {
    if (mode === 'audio') return startAudio();
    if (mode === 'synth') return startSynth();
    return false;
  }
  function stop() {
    playing = false;
    if (mode === 'audio') { stopAudio(); return; }
    stopSynth();
  }

  function startSynth() {
    ensureCtx();
    if (!ac) return false;
    if (ac.state === 'suspended' && ac.resume) { try { ac.resume(); } catch (e) {} }

    // 续接上次的和弦进度（切页 / 刷新后接着放，不从头重来）
    var st = readProgress();
    var idx = 0, wait = CHORD_MS;
    if (st && typeof st.n === 'number' && typeof st.t === 'number') {
      var elapsed = Math.max(0, Date.now() - st.t);
      idx = st.n + Math.floor(elapsed / CHORD_MS);
      wait = CHORD_MS - (elapsed % CHORD_MS);
    }
    playChord(idx, 3);
    writeProgress(idx);
    scheduleNext(idx, wait);

    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setValueAtTime(master.gain.value, ac.currentTime);
    master.gain.linearRampToValueAtTime(0.5, ac.currentTime + 2.5);
    playing = true;
    unbindResume();
    return true;
  }

  function stopSynth() {
    playing = false;
    if (chordTimer) { clearTimeout(chordTimer); chordTimer = null; }
    if (!ac) return;
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setValueAtTime(master.gain.value, ac.currentTime);
    master.gain.linearRampToValueAtTime(0, ac.currentTime + 1.2);
    setTimeout(function() { releaseVoices(400); }, 1200);
  }

  // 浏览器自动播放策略：音频被挂起时，等首次用户交互立即恢复出声
  function onFirstGesture() {
    unbindResume();
    if (!want) return;
    if (mode === 'audio') {
      if (audioEl) {
        var p = audioEl.play();
        if (p && p.catch) p.catch(function() {});
      }
      return;
    }
    if (!ac) return;
    if (ac.state === 'suspended' && ac.resume) { try { ac.resume(); } catch (e) {} }
  }
  function bindResume() {
    if (resumeBound) return;
    resumeBound = true;
    document.addEventListener('pointerdown', onFirstGesture);
    document.addEventListener('keydown', onFirstGesture);
    document.addEventListener('touchstart', onFirstGesture);
  }
  function unbindResume() {
    if (!resumeBound) return;
    resumeBound = false;
    document.removeEventListener('pointerdown', onFirstGesture);
    document.removeEventListener('keydown', onFirstGesture);
    document.removeEventListener('touchstart', onFirstGesture);
  }

  function render() {
    if (!btn) return;
    btn.textContent = want ? '🎵' : '🔇';
    btn.classList.toggle('playing', want);
    btn.setAttribute('title', want ? '背景音乐：播放中（点击关闭）' : '背景音乐：已关闭（点击播放）');
  }

  function save() {
    try { localStorage.setItem(KEY, want ? 'on' : 'off'); } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', function() {
    btn = document.createElement('button');
    btn.className = 'music-toggle';
    btn.setAttribute('aria-label', '背景音乐开关');
    document.body.appendChild(btn);

    // 点击按钮本身不触发"首次手势恢复"，避免与开关逻辑互相抵消
    ['pointerdown', 'touchstart'].forEach(function(t) {
      btn.addEventListener(t, function(e) { e.stopPropagation(); });
    });

    btn.addEventListener('click', function() {
      want = !want;
      if (want) { start(); } else { stop(); }
      render();
      save();
    });

    // 恢复上次的选择；默认开启，音乐只由用户自己决定关不关
    var pref = null;
    try { pref = localStorage.getItem(KEY); } catch (e) {}
    want = (pref !== 'off');
    render();

    // 优先播放本地音乐文件（assets/audio/bgm.mp3）；没有该文件时回落到程序化音乐
    probeAudio(function(m) {
      mode = m;
      if (!want) return;
      start();
      // 被浏览器自动播放策略拦截时（无声），等首次交互立即恢复出声
      if (mode === 'audio') {
        if (!audioEl || audioEl.paused) bindResume();
      } else if (ac && ac.state === 'suspended') {
        bindResume();
      }
    });
  });
})();
