/*!
 * CT Pro Quiz Lite: frontend leaderboard. Plain JavaScript, no jQuery.
 * The global wpAdvQuiz_fetchToplist() is called again by the quiz after a score is submitted.
 */
(function () {
    'use strict';

    function param(obj, prefix, out) {
        out = out || new URLSearchParams();
        Object.keys(obj).forEach(function (k) {
            var key = prefix ? prefix + '[' + k + ']' : k;
            var v = obj[k];

            if (Array.isArray(v)) {
                v.forEach(function (x) {
                    out.append(key + '[]', x);
                });
            } else if (v !== null && typeof v === 'object') {
                param(v, key, out);
            } else {
                out.append(key, v === null || v === undefined ? '' : v);
            }
        });
        return out;
    }

    function handleRequest(json) {
        document.querySelectorAll('.wpAdvQuiz_toplist').forEach(function (tp) {
            var rows = json ? json[tp.getAttribute('data-quiz_id')] : undefined;
            var tbody = tp.querySelector('tbody');
            if (!tbody) return;

            var trs = Array.prototype.slice.call(tbody.children);
            var template = trs[2];

            trs.slice(3).forEach(function (tr) {
                tr.parentNode.removeChild(tr);
            });

            if (rows === undefined || rows === null) {
                if (trs[0]) trs[0].style.display = 'none';
                if (trs[1]) trs[1].style.display = '';
                return;
            }

            for (var i = 0, c = rows.length; i < c && template; i++) {
                var tr = template.cloneNode(true);
                var td = tr.children;

                td[0].textContent = i + 1;
                td[1].textContent = rows[i].name;
                td[2].textContent = rows[i].date;
                td[3].textContent = rows[i].points;
                td[4].textContent = rows[i].result + ' %';

                if (i & 1) {
                    Array.prototype.forEach.call(td, function (cell) {
                        cell.classList.add('wpAdvQuiz_toplistTrOdd');
                    });
                }

                tr.style.display = '';
                tbody.appendChild(tr);
            }

            if (trs[0]) trs[0].style.display = 'none';
            if (trs[1]) trs[1].style.display = 'none';
        });
    }

    function fetchToplist() {
        var ids = Array.prototype.map.call(document.querySelectorAll('.wpAdvQuiz_toplist'), function (tp) {
            return tp.getAttribute('data-quiz_id');
        });

        var g = window.WpAdvQuizGlobal || {};

        if (!ids.length || !g.ajaxurl || !window.fetch)
            return;

        fetch(g.ajaxurl, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: param({
                action: 'wp_adv_quiz_admin_ajax',
                func: 'showFrontToplist',
                data: {
                    quizIds: ids
                }
            }).toString()
        }).then(function (r) {
            return r.json();
        }).then(handleRequest).catch(function () {
        });
    }

    window.wpAdvQuiz_fetchToplist = fetchToplist;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fetchToplist);
    } else {
        fetchToplist();
    }
})();
