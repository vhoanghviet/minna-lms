/* Shared helpers: localStorage + tải đề bài */
(function () {
  var W = window;
  W.MINNA_LESSONS = W.MINNA_LESSONS || {};
  var TOTAL = 25;

  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  function loadLesson(n, preview) {
    return new Promise(function (res) {
      if (preview) return res(LS.get('minna:preview:' + n, null));
      if (W.MINNA_LESSONS[n]) return res(W.MINNA_LESSONS[n]);

      var s = document.createElement('script');
      s.src = 'data/lessons/bai-' + n + '.js?v=' + Date.now();
      s.onload = function () { 
        s.remove();
        res(W.MINNA_LESSONS[n] || null); 
      };
      s.onerror = function () { 
        s.remove();
        res(null); 
      };
      document.head.appendChild(s);
    });
  }

  function wordKey(w) { return (w.jp || '') + '|' + (w.vi || ''); }

  W.Minna = { TOTAL: TOTAL, LS: LS, loadLesson: loadLesson, wordKey: wordKey };
})();
