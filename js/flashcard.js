(function () {
  var $ = function (id) { return document.getElementById(id); };
  var q = new URLSearchParams(location.search);
  var n = parseInt(q.get('lesson'), 10);
  var preview = q.get('preview') === '1';

  var words, deck = [], i = 0, missed = [], knownSet = new Set(), gotYes = 0;
  var lastSpaceTime = 0;

  function persist() { if (!preview && window.Minna && Minna.LS) Minna.LS.set('minna:known:' + n, Array.from(knownSet)); }

  function shuffleArr(a) {
    a = a.slice();
    for (var k = a.length - 1; k > 0; k--) { 
      var j = Math.floor(Math.random() * (k + 1)); 
      var t = a[k]; a[k] = a[j]; a[j] = t; 
    }
    return a;
  }

  function start(list) {
    deck = list || words.slice();
    if ($('onlyUnknown').checked && !list) deck = deck.filter(function (w) { return !knownSet.has(Minna.wordKey(w)); });
    if ($('shuffle').checked) deck = shuffleArr(deck);
    i = 0; missed = []; gotYes = 0;
    $('result').hidden = true;
    if (!deck.length) {
      $('study').hidden = true; $('counter').textContent = ''; $('bar').style.width = '100%';
      $('summary').textContent = 'Bạn đã thuộc hết các từ trong bài này! Bỏ chọn "Chỉ từ chưa thuộc" để học lại.';
      $('reviewMissed').hidden = true; $('result').hidden = false; return;
    }
    $('study').hidden = false;
    show();
  }

  function setCard() {
    var w = deck[i], jpFirst = $('dir').value === 'jp';
    $('front').textContent = jpFirst ? w.jp : w.vi;
    $('back').textContent = jpFirst ? w.vi : w.jp;
  }

  function show() {
    var card = $('card');
    card.classList.add('noanim');
    card.classList.remove('flipped');
    setCard();
    void card.offsetWidth;
    card.classList.remove('noanim');
    $('counter').textContent = (i + 1) + ' / ' + deck.length;
    $('bar').style.width = (i * 100 / deck.length) + '%';
    if ($('dir').value === 'jp') {
      speak();
    }
  }

  function flip() { $('card').classList.toggle('flipped'); }

  function mark(ok) {
    if (!deck.length || i >= deck.length) return;
    var key = Minna.wordKey(deck[i]);
    if (ok) { knownSet.add(key); gotYes++; } else { knownSet.delete(key); missed.push(deck[i]); }
    persist();
    i++;
    if (i >= deck.length) return finish();
    show();
  }

  function finish() {
    $('bar').style.width = '100%';
    $('study').hidden = true;
    $('counter').textContent = '';
    $('summary').textContent = 'Đã thuộc ' + gotYes + ' · Chưa thuộc ' + missed.length + ' (trên ' + deck.length + ' từ).';
    $('reviewMissed').hidden = missed.length === 0;
    $('result').hidden = false;
  }

  function speak() {
    if (!window.speechSynthesis || !deck[i]) return;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(deck[i].jp.replace(/[～~\[\]]/g, ''));
    u.lang = 'ja-JP'; 
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  }

  Minna.loadLesson(n, preview).then(function (l) {
    if (!l || !l.words || !l.words.length) { $('empty').hidden = false; return; }
    words = l.words;
    knownSet = new Set(preview ? [] : Minna.LS.get('minna:known:' + n, []));
    $('title').textContent = (l.title || 'Bài ' + n) + (preview ? ' (xem thử)' : '') + ' – ' + words.length + ' từ';
    document.title = 'Flashcard ' + (l.title || 'Bài ' + n);
    $('app').hidden = false;

    $('card').addEventListener('click', flip);
    $('yes').addEventListener('click', function () { mark(true); });
    $('no').addEventListener('click', function () { mark(false); });
    $('speak').addEventListener('click', speak);
    $('restart').addEventListener('click', function () { start(); });
    $('again').addEventListener('click', function () { start(); });
    $('reviewMissed').addEventListener('click', function () { start(missed.slice()); });
    
    function onDirChange() {
      if (deck.length && i < deck.length) {
        $('card').classList.remove('flipped');
        setCard();
      }
    }

    $('dir').addEventListener('change', onDirChange);
    $('shuffle').addEventListener('change', function () { start(); });
    $('onlyUnknown').addEventListener('change', function () { start(); });

    // Xử lý toàn bộ các phím tắt
    document.addEventListener('keydown', function (e) {
      // 1. Phím tắt: L để đổi hướng hiển thị (Tiếng Việt <-> Tiếng Nhật)
      if (e.code === 'KeyL') {
        e.preventDefault();
        $('dir').value = $('dir').value === 'jp' ? 'vi' : 'jp';
        onDirChange();
        return;
      }

      // 2. Phím tắt: Nhấn Space 2 lần liên tiếp sau khi hoàn thành bài để ôn từ chưa thuộc
      if (e.code === 'Space' && $('study').hidden && !$('result').hidden) {
        e.preventDefault();
        var now = Date.now();
        if (now - lastSpaceTime < 400) {
          if (missed.length > 0) {
            start(missed.slice());
          }
          lastSpaceTime = 0;
        } else {
          lastSpaceTime = now;
        }
        return;
      }

      // Các phím tắt tiếp theo chỉ hoạt động khi đang trong màn hình học
      if ($('study').hidden) return;

      // 3. Phím tắt: Ctrl để phát âm
      if (e.key === 'Control') {
        e.preventDefault();
        speak();
        return;
      }

      // 4. Các phím điều hướng và lật thẻ
      if (e.code === 'Space') { 
        e.preventDefault(); 
        // Bỏ focus thẻ card nếu có để tránh native click kích hoạt lần 2
        if (document.activeElement === $('card')) {
          $('card').blur();
        }
        flip(); 
      }
      else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        mark(false);
      }
      else if (e.key === 'ArrowRight') {
        e.preventDefault();
        mark(true);
      }
    });

    start();
  });
})();
