(function () {
  var grid = document.getElementById('grid');
  var cards = [];
  for (var n = 1; n <= Minna.TOTAL; n++) {
    var a = document.createElement('a');
    a.className = 'lesson off';
    a.innerHTML = '<span class="num">' + n + '</span><span class="name">Bài ' + n + '</span><span class="meta">Chưa có đề</span>';
    grid.appendChild(a);
    cards.push(a);
  }
  cards.forEach(function (a, i) {
    var n = i + 1;
    Minna.loadLesson(n).then(function (l) {
      if (!l || !l.words || !l.words.length) return;
      var known = Minna.LS.get('minna:known:' + n, []);
      var keys = {};
      l.words.forEach(function (w) { keys[Minna.wordKey(w)] = 1; });
      var done = known.filter(function (k) { return keys[k]; }).length;
      var pct = Math.round(done * 100 / l.words.length);
      a.href = 'flashcard.html?lesson=' + n;
      a.className = 'lesson';
      a.querySelector('.meta').textContent = l.words.length + ' từ · thuộc ' + done;
      var mini = document.createElement('div');
      mini.className = 'mini';
      mini.innerHTML = '<i style="width:' + pct + '%"></i>';
      a.appendChild(mini);
    });
  });
})();
