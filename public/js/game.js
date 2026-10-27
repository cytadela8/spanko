(() => {
  'use strict';
  const { Game, dropRoom, position, layout, windowCatchable, LIMIT } = SleepGame,
    game = new Game(),
    colors = ['#ffab91', '#a5d7ff', '#d4f179', '#f4b8e8'];
  const section = document.createElement('section');
  section.id = 'game';
  section.className = 'game hidden';
  section.setAttribute('aria-label', 'Gra: kto znowu łazi');
  section.append(document.getElementById('gameTemplate').content.cloneNode(true));
  document.body.append(section);
  const launch = document.createElement('button');
  launch.className = 'bigbtn';
  launch.id = 'playGame';
  launch.innerHTML = 'ktoś łazi po korytarzu 👀<small id="recordPreview"></small>';
  document.querySelector('.buttons').append(launch);
  const by = (id) => section.querySelector('#' + id),
    board = by('board'),
    overlay = by('gameOverlay'),
    rooms = [],
    actors = new Map();
  let drag = null,
    last = 0,
    raf = 0,
    best = 0,
    roundBest = 0,
    lastLevel = 1,
    currentLayout = null,
    countdownStart = null,
    fullscreenBusy = false,
    savedScroll = 0,
    storeOK = true;
  const scoreKey = 'sleepGameEndlessBest';
  try {
    best = Math.max(
      Number(localStorage.getItem(scoreKey)) || 0,
      Number(localStorage.getItem('sleepGameBestV2')) || 0,
    );
    if (!Number.isFinite(best) || best < 0) best = 0;
  } catch {
    storeOK = false;
  }
  function updateRecord() {
    by('gameBest').textContent = best;
    document.getElementById('recordPreview').textContent = '★ twój rekord: ' + best;
    by('recordLabel').textContent =
      game.score > roundBest ? '★ NOWY REKORD!' : '★ TWÓJ REKORD';
    by('recordCard').classList.toggle('beaten', game.score > roundBest);
  }
  function saveRecord() {
    if (game.score > best) {
      best = game.score;
      try {
        localStorage.setItem(scoreKey, String(best));
      } catch {
        storeOK = false;
      }
    }
    updateRecord();
  }
  for (let i = 0; i < 4; i++) {
    const room = document.createElement('div');
    room.className = 'room';
    room.dataset.room = i;
    room.style.setProperty('--room', colors[i]);
    room.innerHTML = `<div class="room-title">${i + 1}</div><span class="room-target">↓ tutaj</span><span class="room-warning">psst…</span>`;
    room.setAttribute('aria-label', 'Pokój ' + (i + 1));
    board.append(room);
    rooms.push(room);
  }
  function say(text) {
    by('gameMessage').textContent = text;
  }
  function sound(name) {
    NightSounds.play(name);
  }
  function rects() {
    return rooms.map((r) => r.getBoundingClientRect());
  }
  function clearTargets() {
    rooms.forEach((r) => r.classList.remove('target', 'over', 'bad-drop'));
  }
  function cleanDrag() {
    const old = drag;
    drag = null;
    clearTargets();
    if (old) {
      old.el.classList.remove('dragging');
      if (old.el.hasPointerCapture(old.pointerId))
        old.el.releasePointerCapture(old.pointerId);
    }
  }
  function cancelDrag() {
    game.cancel();
    cleanDrag();
    render();
  }
  function actorCentre() {
    const r = drag.el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  function move(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.preventDefault();
    drag.clientX = e.clientX;
    drag.clientY = e.clientY;
    const r = board.getBoundingClientRect();
    drag.moved ||= Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 3;
    drag.el.style.left = e.clientX - drag.offsetX - r.left - board.clientLeft + 'px';
    drag.el.style.top = e.clientY - drag.offsetY - r.top - board.clientTop + 'px';
    const hit = dropRoom(
      { x: e.clientX, y: e.clientY },
      actorCentre(),
      rects(),
      drag.p.home,
    );
    rooms.forEach((room, i) =>
      room.classList.toggle('over', i === hit && i === drag.p.home),
    );
  }
  function release(room) {
    if (!drag) return;
    const p = drag.p,
      result = game.release(room);
    cleanDrag();
    if (result.ok) {
      sound('win');
      rooms[p.home].classList.add('delivered');
      setTimeout(() => rooms[p.home].classList.remove('delivered'), 400);
      if (result.practice) {
        showOverlay(
          'no, i o to chodzi.',
          'Właściwy pokój się podświetla. W grze robi się tłoczno od razu. Gotowy?',
          'gramy na serio',
        );
        say('próba zaliczona. teraz można grać.');
      } else {
        saveRecord();
        say(
          `+${result.points} · do własnego łóżka!${result.multiplier > 1 ? ' seria ×' + result.multiplier : ''}`,
        );
        const tag = document.createElement('span');
        tag.className = 'score-pop';
        tag.textContent = '+' + result.points;
        const r = currentLayout.rooms[p.home];
        tag.style.left = r.left + r.width / 2 + 'px';
        tag.style.top = r.top + r.height / 2 + 'px';
        board.append(tag);
        setTimeout(() => tag.remove(), 650);
      }
    } else if (result.reason !== 'inactive') {
      sound('no');
      say(
        result.reason === 'outside'
          ? `bliżej drzwi! pokój ${p.home + 1}.`
          : `nie ten — na piżamie ma ${p.home + 1}.`,
      );
      if (room !== null) {
        rooms[room].classList.add('bad-drop');
        setTimeout(() => rooms[room].classList.remove('bad-drop'), 400);
      }
    }
    render();
  }
  function pointerUp(e) {
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.preventDefault();
    move(e);
    if (!drag.moved) {
      cancelDrag();
      say('przytrzymaj i przeciągnij do swojego pokoju.');
      return;
    }
    release(
      dropRoom({ x: e.clientX, y: e.clientY }, actorCentre(), rects(), drag.p.home),
    );
  }
  function begin(p, el, e) {
    const hole = windowCatchable(p, currentLayout);
    if (p.state === 'window' && !hole) {
      say('szyba! poczekaj na dziurę.');
      return;
    }
    if (drag || !game.pickup(p.id, hole)) return;
    e.preventDefault();
    const r = el.getBoundingClientRect();
    drag = {
      p,
      el,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      clientX: e.clientX,
      clientY: e.clientY,
      offsetX: e.clientX - (r.left + r.width / 2),
      offsetY: e.clientY - (r.top + r.height / 2),
      moved: false,
    };
    el.classList.add('dragging');
    rooms[p.home].classList.add('target');
    say(`do pokoju ${p.home + 1} ↓`);
    try {
      el.setPointerCapture(e.pointerId);
    } catch {}
  }
  function createActor(p) {
    const el = document.createElement('div');
    el.className = 'person';
    el.style.setProperty('--person', colors[p.home]);
    el.innerHTML = `<span class="face" aria-hidden="true">•ᴗ•</span><b>${p.home + 1}</b><span class="person-status"></span>`;
    el.dataset.id = p.id;
    el.setAttribute('role', 'img');
    el.onpointerdown = (e) => {
      if (e.button === 0 && e.isPrimary) begin(p, el, e);
    };
    el.ondragstart = (e) => e.preventDefault();
    board.append(el);
    actors.set(p.id, el);
    return el;
  }
  // Listen on the document: releasing capture must not discard an active drag.
  document.addEventListener('pointermove', move, { capture: true, passive: false });
  document.addEventListener('pointerup', pointerUp, { capture: true, passive: false });
  document.addEventListener(
    'pointercancel',
    (e) => {
      if (drag?.pointerId === e.pointerId) {
        cancelDrag();
        sound('no');
        say('przeglądarka przerwała chwyt. złap ponownie.');
      }
    },
    { capture: true },
  );
  function showOverlay(title, text, label) {
    overlay.classList.remove('hidden');
    by('overlayTitle').textContent = title;
    by('overlayText').textContent = text;
    by('overlayAction').textContent = label;
    by('resultNumbers').classList.add('hidden');
  }
  function applyLayout() {
    if (board.clientWidth < 1 || board.clientHeight < 1) return;
    currentLayout = layout(board.clientWidth, board.clientHeight);
    board.style.setProperty('--actor-size', currentLayout.size + 'px');
    board.classList.toggle('wide', currentLayout.wide);
    const box = (el, b) => {
      el.style.left = b.left + 'px';
      el.style.top = b.top + 'px';
      el.style.width = b.width + 'px';
      el.style.height = b.height + 'px';
    };
    rooms.forEach((r, i) => box(r, currentLayout.rooms[i]));
    box(board.querySelector('.window-lane'), currentLayout.windowBox);
  }
  function formatTime(seconds) {
    const n = Math.floor(seconds);
    return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
  }
  function render() {
    if (!currentLayout) return;
    const active = new Set(game.people.map((p) => p.id));
    for (const [id, el] of actors)
      if (!active.has(id)) {
        el.remove();
        actors.delete(id);
      }
    for (const p of game.people) {
      const el = actors.get(p.id) || createActor(p);
      el.classList.toggle('wrong', p.state === 'wrong');
      el.classList.toggle('walking', p.state === 'walking');
      el.classList.toggle('window-person', p.state === 'window');
      el.classList.toggle('catchable', windowCatchable(p, currentLayout));
      el.classList.toggle('inactive', !['playing', 'practice'].includes(game.mode));
      el.querySelector('.person-status').textContent =
        p.state === 'wrong'
          ? '!'
          : p.state === 'window'
            ? windowCatchable(p, currentLayout)
              ? '↓'
              : '×'
            : '→';
      el.setAttribute(
        'aria-label',
        `Uczestnik ${p.id}, dom: pokój ${p.home + 1}, ${p.state === 'wrong' ? 'w złym pokoju ' + (p.target + 1) : p.state === 'window' ? 'za szybą, łap przez dziury' : 'na korytarzu'}`,
      );
      if (drag?.p.id !== p.id) {
        const pos = position(p, currentLayout);
        el.style.left = pos.x + 'px';
        el.style.top = pos.y + 'px';
      }
    }
    rooms.forEach((r, i) => {
      r.classList.toggle('leaving', game.pending?.home === i);
      r.querySelector('.room-warning').textContent = game.pending?.windowRoute
        ? 'oknem!'
        : 'psst…';
    });
    board.classList.toggle(
      'window-active',
      game.people.some((p) => p.state === 'window'),
    );
    by('gameTime').textContent =
      game.mode === 'practice' ? 'próba' : formatTime(game.elapsed);
    by('gameScore').textContent = game.score;
    by('gameCombo').textContent =
      game.combo >= 3
        ? 'seria ×' + (game.combo >= 6 ? 3 : 2)
        : 'seria ' + (game.combo ? game.combo + '/3' : '—');
    by('gameLevel').textContent = 'tempo ×' + game.pace.toFixed(1);
    by('gameWrong').textContent = game.wrong + ' / ' + LIMIT;
    by('chaos').classList.toggle('danger', game.wrong >= 4);
    by('chaos')
      .querySelectorAll('i')
      .forEach((p, i) => p.classList.toggle('filled', i < game.wrong));
    by('chaosHint').textContent =
      game.wrong >= 5 ? 'koniec!' : game.wrong >= 4 ? 'ostatnia szansa' : 'nie u siebie';
    by('gamePause').classList.toggle(
      'hidden',
      !['playing', 'practice', 'paused'].includes(game.mode),
    );
    by('gamePause').textContent = game.mode === 'paused' ? '▶' : 'Ⅱ';
    by('gamePause').setAttribute(
      'aria-label',
      game.mode === 'paused' ? 'Wznów' : 'Pauza',
    );
    updateRecord();
  }
  function ended() {
    cleanDrag();
    sound('no');
    saveRecord();
    showOverlay(
      'no i obudzili wszystkich.',
      `Pięcioro obozowiczów w cudzych pokojach. Dyżur trwał ${formatTime(game.elapsed)}. W swoich pokojach: ${game.saved}.`,
      'jeszcze jedna nocka',
    );
    by('overlayEyebrow').textContent =
      game.score > roundBest ? 'NOWY REKORD. ZIEMNIAK JEST DUMNY.' : 'KONIEC DYŻURU';
    by('resultNumbers').innerHTML =
      `<span>twój wynik<b>${game.score}</b></span><span>★ rekord<b>${best}</b></span>`;
    by('resultNumbers').classList.remove('hidden');
    say('pięcioro nie u siebie. koniec dyżuru.');
    render();
  }
  function frame(time) {
    let dt = last ? Math.max(0, (time - last) / 1000) : 0;
    last = time;
    if (countdownStart !== null) {
      const left = 3 - (time - countdownStart) / 1000;
      by('countdown').textContent = left > 0 ? Math.ceil(left) : 'start!';
      if (left <= 0) {
        countdownStart = null;
        by('countdown').classList.add('hidden');
        game.start();
        lastLevel = 1;
        say('jeden uczestnik nie u siebie, dwóch już idzie. łap!');
        dt = 0;
      }
    }
    const was = game.mode;
    while (dt > 0 && game.mode === 'playing') {
      const slice = Math.min(dt, 0.1);
      game.step(slice);
      dt -= slice;
    }
    for (const event of game.events.splice(0)) {
      if (event.type === 'arrival') {
        sound('no');
        if (!drag) say('nie ten pokój! łap uczestnika z wykrzyknikiem.');
      }
    }
    if (game.level !== lastLevel) {
      lastLevel = game.level;
      sound('popup');
      if (!drag)
        say('coraz więcej obozowiczów na nogach. tempo ×' + game.pace.toFixed(1));
    }
    if (was === 'playing' && game.mode === 'ended') ended();
    else render();
    raf = requestAnimationFrame(frame);
  }
  function start(practice = false) {
    cleanDrag();
    roundBest = best;
    last = performance.now();
    lastLevel = 1;
    overlay.classList.add('hidden');
    by('resultNumbers').classList.add('hidden');
    by('overlayEyebrow').textContent = 'CISZA NOCNA';
    if (practice) {
      countdownStart = null;
      by('countdown').classList.add('hidden');
      game.practice();
      say('próba: dwójkę z pokoju 4 przeciągnij do pokoju 2.');
    } else {
      game.reset('countdown');
      countdownStart = performance.now();
      by('countdown').textContent = '3';
      by('countdown').classList.remove('hidden');
      say('przygotuj palec. od razu będzie ruch.');
    }
    render();
  }
  function pause() {
    if (game.mode === 'paused') {
      game.resume();
      last = performance.now();
      overlay.classList.add('hidden');
      say('dobra, pilnujemy dalej.');
    } else if (game.mode === 'countdown') {
      countdownStart = null;
      by('countdown').classList.add('hidden');
      game.reset('ready');
      showOverlay('gotowy?', '3, 2, 1…', 'zaczynamy');
    } else {
      cancelDrag();
      game.pause();
      if (game.mode === 'paused') showOverlay('chwila oddechu.', 'pauza.', 'wracamy');
    }
    render();
  }
  by('overlayAction').onclick = () => {
    if (game.mode === 'paused') pause();
    else start(false);
  };
  by('gamePause').onclick = pause;
  async function fullscreen() {
    if (fullscreenBusy) return;
    fullscreenBusy = true;
    try {
      if (!document.fullscreenElement && section.requestFullscreen)
        await section.requestFullscreen();
      if (document.fullscreenElement === section && screen.orientation?.lock)
        try {
          await screen.orientation.lock('landscape');
        } catch {}
    } catch {
      say('pełny ekran niedostępny — plansza działa też w oknie.');
    } finally {
      fullscreenBusy = false;
      applyLayout();
      render();
    }
  }
  by('gameFullscreen').onclick = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else fullscreen();
  };
  function viewportResize() {
    if (section.classList.contains('hidden')) return;
    const before = currentLayout;
    applyLayout();
    if (
      before &&
      currentLayout &&
      (Math.abs(before.width - currentLayout.width) > 30 ||
        Math.abs(before.height - currentLayout.height) > 50) &&
      ['playing', 'practice', 'countdown'].includes(game.mode)
    )
      pause();
    else if (drag)
      move({
        pointerId: drag.pointerId,
        clientX: drag.clientX,
        clientY: drag.clientY,
        preventDefault() {},
      });
    render();
  }
  launch.onclick = () => {
    quiet();
    savedScroll = window.scrollY;
    section.classList.remove('hidden');
    document.body.classList.add('game-open');
    applyLayout();
    render();
    last = performance.now();
    if (!raf) raf = requestAnimationFrame(frame);
    if (matchMedia('(pointer: coarse)').matches) fullscreen();
  };
  section.querySelector('.game-close').onclick = () => {
    if (['playing', 'practice', 'countdown'].includes(game.mode)) pause();
    cancelAnimationFrame(raf);
    raf = 0;
    section.classList.add('hidden');
    document.body.classList.remove('game-open');
    try {
      screen.orientation?.unlock?.();
    } catch {}
    if (document.fullscreenElement === section)
      document.exitFullscreen?.().catch(() => {});
    window.scrollTo(0, savedScroll);
    launch.focus({ preventScroll: true });
  };
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      try {
        screen.orientation?.unlock?.();
      } catch {}
      if (['playing', 'practice', 'countdown'].includes(game.mode)) pause();
    }
    viewportResize();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && ['playing', 'practice', 'countdown'].includes(game.mode))
      pause();
  });
  window.addEventListener('blur', () => {
    if (!fullscreenBusy && ['playing', 'practice', 'countdown'].includes(game.mode))
      pause();
  });
  new ResizeObserver(viewportResize).observe(board);
  window.visualViewport?.addEventListener('resize', viewportResize);
  window.addEventListener('storage', (e) => {
    if (e.key === scoreKey) {
      best = Math.max(best, Number(e.newValue) || 0);
      updateRecord();
    }
  });
  updateRecord();
})();
