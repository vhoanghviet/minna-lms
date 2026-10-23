(function () {
  var $ = function (id) { return document.getElementById(id); };
  var current = null; // { n, text, lesson, warns }

  /* ---------- Cài đặt GitHub ---------- */
  var cfg = Minna.LS.get('minna:cfg', {});
  var host = location.hostname, parts = location.pathname.split('/').filter(Boolean);
  if (!cfg.owner && /\.github\.io$/.test(host)) cfg.owner = host.split('.')[0];
  if (!cfg.repo && /\.github\.io$/.test(host) && parts[0] && !/\.html$/.test(parts[0])) cfg.repo = parts[0];
  ['owner', 'repo', 'branch', 'token'].forEach(function (k) { if (cfg[k]) $(k).value = cfg[k]; });
  if (!cfg.token) $('cfgBox').open = true;

  $('saveCfg').onclick = function () {
    var c = {};
    ['owner', 'repo', 'branch', 'token'].forEach(function (k) { c[k] = $(k).value.trim(); });
    Minna.LS.set('minna:cfg', c);
    say('Đã lưu cài đặt.', 'ok');
  };

  function say(t, cls) { var m = $('msg'); m.textContent = t; m.className = 'msg ' + (cls || ''); }

  /* ---------- Compile ---------- */
  function compile(code) {
    var fake = { MINNA_LESSONS: {} };
    try { new Function('window', code)(fake); }
    catch (e) { throw new Error('Lỗi khi chạy code: ' + e.message); }
    var keys = Object.keys(fake.MINNA_LESSONS);
    if (!keys.length) throw new Error('Không thấy dòng window.MINNA_LESSONS[số bài] = {...}');
    if (keys.length > 1) throw new Error('Mỗi lần chỉ compile 1 bài (đang có ' + keys.length + ' bài).');
    var n = parseInt(keys[0], 10);
    if (!(n >= 1 && n <= Minna.TOTAL)) throw new Error('Số bài phải từ 1 đến ' + Minna.TOTAL + '.');
    var l = fake.MINNA_LESSONS[keys[0]];
    if (!l || !Array.isArray(l.words) || !l.words.length) throw new Error('Thiếu mảng words hoặc words rỗng.');

    var seen = {}, words = [], warns = [];
    l.words.forEach(function (w, idx) {
      var jp = String((w && w.jp) || '').trim(), vi = String((w && w.vi) || '').trim();
      if (!jp || !vi) { warns.push('Từ #' + (idx + 1) + ': thiếu jp/vi → bỏ qua'); return; }
      var k = jp + '|' + vi;
      if (seen[k]) { warns.push('Từ #' + (idx + 1) + ': trùng "' + jp + '" → bỏ qua'); return; }
      seen[k] = 1; words.push({ jp: jp, vi: vi });
    });
    if (!words.length) throw new Error('Không có từ hợp lệ nào.');

    var lesson = { lesson: n, title: 'Bài ' + n, words: words };
    var text = '/* Minna LMS – đề flashcard Bài ' + n + ' – ' + words.length + ' từ */\n' +
      'window.MINNA_LESSONS = window.MINNA_LESSONS || {};\n' +
      'window.MINNA_LESSONS[' + n + '] = {\n  lesson: ' + n + ',\n  title: "Bài ' + n + '",\n  words: [\n' +
      words.map(function (w) { return '    ' + JSON.stringify(w); }).join(',\n') + '\n  ]\n};\n';
    return { n: n, lesson: lesson, text: text, warns: warns };
  }

  $('compile').onclick = function () {
    $('resultBox').hidden = true; current = null;
    try {
      var r = compile($('code').value);
      current = r;
      var msg = '✔ Compile OK: Bài ' + r.n + ' – ' + r.lesson.words.length + ' từ.';
      if (r.warns.length) msg += '\n⚠ ' + r.warns.join('\n⚠ ');
      say(msg, r.warns.length ? 'warn' : 'ok');
      $('info').textContent = 'Bài ' + r.n + ' · ' + r.lesson.words.length + ' từ · file: data/lessons/bai-' + r.n + '.js';
      var t = $('tbl');
      t.innerHTML = '<tr><th>#</th><th>Nhật</th><th>Việt</th></tr>';
      r.lesson.words.forEach(function (w, i) {
        var tr = t.insertRow();
        [i + 1, w.jp, w.vi].forEach(function (v) { tr.insertCell().textContent = v; });
      });
      $('resultBox').hidden = false;
    } catch (e) { say('✘ ' + e.message, 'err'); }
  };

  $('preview').onclick = function () {
    if (!current) return;
    Minna.LS.set('minna:preview:' + current.n, current.lesson);
    window.open('flashcard.html?lesson=' + current.n + '&preview=1', '_blank');
  };

  $('download').onclick = function () {
    if (!current) return;
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([current.text], { type: 'text/javascript' }));
    a.download = 'bai-' + current.n + '.js';
    a.click();
  };

  /* ---------- Đăng lên GitHub ---------- */
  function b64(s) { return btoa(unescape(encodeURIComponent(s))); }

  $('publish').onclick = async function () {
    if (!current) return;
    var c = Minna.LS.get('minna:cfg', {});
    if (!c.owner || !c.repo || !c.token) { $('cfgBox').open = true; return say('Hãy nhập đủ owner / repo / token ở mục ① rồi bấm Lưu.', 'err'); }
    var branch = c.branch || 'main';
    var path = 'data/lessons/bai-' + current.n + '.js';
    var api = 'https://api.github.com/repos/' + c.owner + '/' + c.repo + '/contents/' + path;
    var h = { Authorization: 'Bearer ' + c.token, Accept: 'application/vnd.github+json' };
    var btn = $('publish'); btn.disabled = true; say('Đang đăng lên GitHub...');
    try {
      var sha, r = await fetch(api + '?ref=' + encodeURIComponent(branch), { headers: h });
      if (r.ok) sha = (await r.json()).sha;
      else if (r.status !== 404) throw new Error('GitHub trả về ' + r.status + ' (kiểm tra token/repo/branch).');
      var body = { message: 'Cập nhật đề flashcard Bài ' + current.n, content: b64(current.text), branch: branch };
      if (sha) body.sha = sha;
      var p = await fetch(api, { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, h), body: JSON.stringify(body) });
      if (!p.ok) { var er = await p.json().catch(function () { return {}; }); throw new Error('Đăng thất bại (' + p.status + '): ' + (er.message || '')); }
      say('✔ Đã đăng Bài ' + current.n + '. GitHub Pages cần ~1 phút để cập nhật, sau đó học sinh sẽ thấy đề.', 'ok');
    } catch (e) { say('✘ ' + e.message, 'err'); }
    btn.disabled = false;
  };
})();
