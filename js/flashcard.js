(function () {
  var $ = function (id) { return document.getElementById(id); };
  var q = new URLSearchParams(location.search);
  var n = parseInt(q.get('lesson'), 10);
  var preview = q.get('preview') === '1';

  var words, deck = [], i = 0, missed = [], knownSet = new Set(), gotYes = 0;

  function persist() { if (!preview) Minna.LS.set('minna:known:' + n, Array.from(knownSet)); }

  function shuffleArr(a) {
    a = a.slice();
    for (var k = a.length - 1; k > 0; k--) { var j = Math.floor(Math.random() * (k + 1)); var t = a[k]; a[k] = a[j]; a[j] = t; }
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
    speak();
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
    var u = new SpeechSynthesisUtterance(deck[i].jp.replace(/[～~\[\]]/g, ''));
    u.lang = 'ja-JP'; u.rate = 0.85;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
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
    $('dir').addEventListener('change', function () { if (deck.length && i < deck.length) setCard(); });
    $('shuffle').addEventListener('change', function () { start(); });
    $('onlyUnknown').addEventListener('change', function () { start(); });
    document.addEventListener('keydown', function (e) {
      if ($('study').hidden) return;
      if (e.code === 'Space') { e.preventDefault(); flip(); }
      else if (e.key === 'ArrowLeft') mark(false);
      else if (e.key === 'ArrowRight') mark(true);
    });
    start();
  });
})();
