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

  var ac = null, master = null, filter = null;
  var voices = [];
  var chordTimer = null;
  var playing = false;
  var btn = null;

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

  function start() {
    ensureCtx();
    if (!ac) return false;
    if (ac.state === 'suspended' && ac.resume) ac.resume();
    var n = 0;
    playChord(0, 3);
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setValueAtTime(master.gain.value, ac.currentTime);
    master.gain.linearRampToValueAtTime(0.5, ac.currentTime + 2.5);
    chordTimer = setInterval(function() {
      releaseVoices(3000);
      playChord(++n, 3.5);
    }, CHORD_MS);
    playing = true;
    return true;
  }

  function stop() {
    playing = false;
    if (chordTimer) { clearInterval(chordTimer); chordTimer = null; }
    if (!ac) return;
    master.gain.cancelScheduledValues(ac.currentTime);
    master.gain.setValueAtTime(master.gain.value, ac.currentTime);
    master.gain.linearRampToValueAtTime(0, ac.currentTime + 1.2);
    setTimeout(function() { releaseVoices(400); }, 1200);
  }

  function render() {
    if (!btn) return;
    btn.textContent = playing ? '🎵' : '🔇';
    btn.classList.toggle('playing', playing);
    btn.setAttribute('title', playing ? '背景音乐：播放中（点击关闭）' : '背景音乐：已关闭（点击播放）');
  }

  function save() {
    try { localStorage.setItem(KEY, playing ? 'on' : 'off'); } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', function() {
    btn = document.createElement('button');
    btn.className = 'music-toggle';
    btn.setAttribute('aria-label', '背景音乐开关');
    document.body.appendChild(btn);

    btn.addEventListener('click', function() {
      if (playing) {
        stop();
      } else if (!start()) {
        return;
      }
      render();
      save();
    });

    render();

    // 若上次为开启状态，等待首次用户交互后自动恢复（受浏览器自动播放策略限制）
    var pref = null;
    try { pref = localStorage.getItem(KEY); } catch (e) {}
    if (pref === 'on') {
      var resume = function() {
        document.removeEventListener('pointerdown', resume);
        document.removeEventListener('keydown', resume);
        document.removeEventListener('touchstart', resume);
        if (!playing && start()) render();
      };
      document.addEventListener('pointerdown', resume);
      document.addEventListener('keydown', resume);
      document.addEventListener('touchstart', resume);
    }
  });
})();
