/*!
 * CT Pro Quiz Lite frontend (plain JavaScript, no jQuery / jQuery UI).
 *
 * Ported from the jQuery build js/wpAdvQuiz_front.min.js of Advanced Quiz 1.0.4
 * (the file actually loaded by the plugin; it has the Clear / Practice buttons that the unminified .js lacks).
 * Flow, class names and the data posted to admin-ajax are unchanged, so the PHP side did not have to change.
 *
 * Boot: the PHP view pushes each quiz config into window.wpAdvQuizInitList ({id, init}).
 * Public API: window.WpAdvQuizFront.init(element, options).
 */
(function () {
    'use strict';

    /* ------------------------------------------------------------------
     * Tiny DOM helpers replacing jQuery
     * ------------------------------------------------------------------ */

    function qs(root, sel) {
        return root ? root.querySelector(sel) : null;
    }

    function qsa(root, sel) {
        return root ? Array.prototype.slice.call(root.querySelectorAll(sel)) : [];
    }

    function toArr(x) {
        if (!x) return [];
        if (Array.isArray(x)) return x;
        if (x.nodeType) return [x];
        return Array.prototype.slice.call(x);
    }

    function children(el) {
        return el ? Array.prototype.slice.call(el.children) : [];
    }

    // Like jQuery .eq(): negative index counts from the end.
    function eq(arr, i) {
        arr = toArr(arr);
        if (i < 0) i = arr.length + i;
        return arr[i] || null;
    }

    function index(el) {
        if (!el || !el.parentNode) return -1;
        return Array.prototype.indexOf.call(el.parentNode.children, el);
    }

    // Read data-* like jQuery .data(): numeric strings become numbers.
    function data(el, name) {
        if (!el) return undefined;
        var v = el.getAttribute('data-' + name);
        if (v === null) return undefined;
        if (v === 'true') return true;
        if (v === 'false') return false;
        if (v === 'null') return null;
        if (v !== '' && String(+v) === v) return +v;
        return v;
    }

    var displayCache = {};

    function defaultDisplay(el) {
        var tag = el.nodeName;
        if (!displayCache[tag]) {
            var tmp = document.createElement(tag);
            document.body.appendChild(tmp);
            var d = getComputedStyle(tmp).display;
            tmp.parentNode.removeChild(tmp);
            displayCache[tag] = (!d || d === 'none') ? 'block' : d;
        }
        return displayCache[tag];
    }

    function show(x) {
        toArr(x).forEach(function (el) {
            if (!el || !el.style) return;
            el.style.display = '';
            if (getComputedStyle(el).display === 'none') {
                el.style.display = defaultDisplay(el);
            }
        });
        return x;
    }

    function hide(x) {
        toArr(x).forEach(function (el) {
            if (el && el.style) el.style.display = 'none';
        });
        return x;
    }

    function isVisible(el) {
        return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
    }

    function toggle(x) {
        toArr(x).forEach(function (el) {
            if (isVisible(el)) hide(el); else show(el);
        });
    }

    function setText(x, text) {
        toArr(x).forEach(function (el) {
            el.textContent = (text === undefined || text === null) ? '' : text;
        });
    }

    function trim(s) {
        return (s === undefined || s === null) ? '' : String(s).trim();
    }

    function docTop(el) {
        return el.getBoundingClientRect().top + window.pageYOffset;
    }

    // jQuery .height(): content height (no padding, no border).
    function innerHeight(el) {
        if (!el) return 0;
        var cs = getComputedStyle(el);
        return el.clientHeight - parseFloat(cs.paddingTop || 0) - parseFloat(cs.paddingBottom || 0);
    }

    function setMarginTopImportant(el, px) {
        if (el) el.style.setProperty('margin-top', px + 'px', 'important');
    }

    function shuffle(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = arr[i];
            arr[i] = arr[j];
            arr[j] = t;
        }
        return arr;
    }

    /**
     * Encode like jQuery.param() (nested brackets), because PHP reads
     * $_POST['data'][...] in exactly this format.
     */
    function buildParams(prefix, obj, add) {
        if (Array.isArray(obj)) {
            obj.forEach(function (v, i) {
                if (/\[\]$/.test(prefix)) {
                    add(prefix, v);
                } else {
                    buildParams(prefix + '[' + (typeof v === 'object' && v !== null ? i : '') + ']', v, add);
                }
            });
        } else if (obj !== null && typeof obj === 'object') {
            Object.keys(obj).forEach(function (k) {
                buildParams(prefix + '[' + k + ']', obj[k], add);
            });
        } else {
            add(prefix, obj);
        }
    }

    function param(obj) {
        var p = new URLSearchParams();
        var add = function (k, v) {
            if (typeof v === 'function') v = v();
            p.append(k, (v === null || v === undefined) ? '' : v);
        };
        Object.keys(obj).forEach(function (k) {
            buildParams(k, obj[k], add);
        });
        return p.toString();
    }

    function globalCfg() {
        return window.WpAdvQuizGlobal || {};
    }

    /**
     * POST to admin-ajax, like $.post(url, data, success, 'json'):
     * success is only called when the response is valid JSON.
     */
    function ajax(payload, success, error) {
        var url = globalCfg().ajaxurl;
        if (!url || !window.fetch) {
            if (error) error();
            return;
        }

        fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: param(payload)
        }).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.text();
        }).then(function (txt) {
            var json;
            try {
                json = JSON.parse(txt);
            } catch (e) {
                // Empty / non-JSON response (e.g. completedQuiz): like $.post, do not call success
                return;
            }
            // Call outside the Promise chain so errors in the callback reach the console instead of being swallowed
            if (success) setTimeout(function () {
                success(json);
            }, 0);
        }).catch(function () {
            if (error) error();
        });
    }

    // Scroll over 300ms like $('html,body').animate({scrollTop}, 300) in the jQuery version.
    // Done with requestAnimationFrame because behavior:'smooth' runs at a different speed in every browser.
    var scrollAnim = 0;

    function smoothScrollTo(y) {
        var from = window.pageYOffset;
        var dist = y - from;
        var start = 0;
        var duration = 300;

        if (scrollAnim) cancelAnimationFrame(scrollAnim);

        if (!dist || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
            window.scrollTo(0, y);
            return;
        }

        function step(ts) {
            if (!start) start = ts;
            var p = Math.min(1, (ts - start) / duration);
            var ease = 0.5 - Math.cos(p * Math.PI) / 2; // jQuery "swing" easing
            window.scrollTo(0, from + dist * ease);
            scrollAnim = p < 1 ? requestAnimationFrame(step) : 0;
        }

        scrollAnim = requestAnimationFrame(step);
    }

    /* ------------------------------------------------------------------
     * Drag & drop sorting (replaces jQuery UI Sortable + touch-punch).
     * Uses Pointer Events, so it works with mouse and touch.
     * ------------------------------------------------------------------ */

    var DRAG_THRESHOLD = 4;

    function makeSortable(list, opts) {
        if (!list) return;
        list._waqSort = {opts: opts || {}, enabled: true};
        list.classList.add('wpAdvQuiz_sortableOn');
    }

    function destroySortable(list) {
        toArr(list).forEach(function (l) {
            if (l._waqSort) l._waqSort.enabled = false;
            l.classList.remove('wpAdvQuiz_sortableOn');
        });
    }

    function findSortItem(target, root) {
        var el = target;
        while (el && el !== root) {
            if (el.nodeName === 'LI' && el.parentElement && el.parentElement._waqSort && el.parentElement._waqSort.enabled) {
                return el;
            }
            el = el.parentElement;
        }
        return null;
    }

    function bindSortable(root) {
        root.addEventListener('pointerdown', function (e) {
            if (e.button !== 0 || e.isPrimary === false) return;
            if (e.target.closest('input, textarea, select, button, a')) return;

            var item = findSortItem(e.target, root);
            if (!item) return;

            var list = item.parentElement;
            var st = list._waqSort;
            var startX = e.clientX, startY = e.clientY;
            var dragging = false;
            var placeholder = null, rect = null, origList = list, origNext = item.nextElementSibling;
            var pointerX = startX, pointerY = startY;

            function begin() {
                dragging = true;
                rect = item.getBoundingClientRect();

                placeholder = document.createElement(item.nodeName);
                if (st.opts.placeholder) {
                    placeholder.className = st.opts.placeholder;
                } else {
                    placeholder.className = item.className;
                    placeholder.style.visibility = 'hidden';
                    placeholder.style.height = rect.height + 'px';
                }
                list.insertBefore(placeholder, item);

                item.classList.add('wpAdvQuiz_dragging');
                item.style.position = 'fixed';
                item.style.left = rect.left + 'px';
                item.style.top = rect.top + 'px';
                item.style.width = rect.width + 'px';
                item.style.boxSizing = 'border-box';
                item.style.zIndex = '100000';
                item.style.pointerEvents = 'none';
                item.style.margin = '0';
            }

            function targetLists() {
                var lists = st.opts.connect ? st.opts.connect(list) : [list];
                return lists.filter(function (l) {
                    return l && l._waqSort && l._waqSort.enabled;
                });
            }

            function accepts(l) {
                var acc = l._waqSort.opts.accepts;
                if (!acc) return true;
                return acc(l, item, placeholder);
            }

            function placeAt(x, y) {
                var under = document.elementFromPoint(x, y);
                if (!under) return;

                var lists = targetLists();
                var target = null;
                var el = under;

                while (el && !target) {
                    if (lists.indexOf(el) >= 0) target = el;
                    el = el.parentElement;
                }

                // Fallback: an empty list can be smaller than its container cell, so also
                // hit-test the bounding box (8px slack) of every list that accepts drops.
                if (!target) {
                    lists.some(function (l) {
                        var r = l.getBoundingClientRect();
                        if (x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 8 && y <= r.bottom + 8) {
                            target = l;
                            return true;
                        }
                        return false;
                    });
                }

                if (!target) return;
                if (target !== placeholder.parentElement && !accepts(target)) return;

                // Find the item after the pointer. Vertical lists (one item per row) compare
                // top/bottom halves; rows with several items (float/inline) compare left/right halves.
                var kids = children(target).filter(function (c) {
                    return c !== placeholder && c !== item;
                });
                var rects = kids.map(function (c) {
                    return c.getBoundingClientRect();
                });
                var before = null;

                kids.some(function (c, i) {
                    var r = rects[i];

                    if (y < r.top) {
                        before = c;
                        return true;
                    }

                    if (y <= r.bottom) {
                        var sameRow = rects.some(function (o, j) {
                            return j !== i && o.top < r.bottom && o.bottom > r.top;
                        });

                        if (sameRow ? x < r.left + r.width / 2 : y < r.top + r.height / 2) {
                            before = c;
                            return true;
                        }
                    }

                    return false;
                });

                if (before) {
                    if (placeholder.nextElementSibling !== before) target.insertBefore(placeholder, before);
                } else if (target.lastElementChild !== placeholder) {
                    target.appendChild(placeholder);
                }
            }

            function autoScroll(y) {
                var edge = 40;
                if (y < edge) window.scrollBy(0, -12);
                else if (y > window.innerHeight - edge) window.scrollBy(0, 12);
            }

            function onMove(ev) {
                if (ev.pointerId !== e.pointerId) return;
                pointerX = ev.clientX;
                pointerY = ev.clientY;

                if (!dragging) {
                    if (Math.abs(pointerX - startX) < DRAG_THRESHOLD && Math.abs(pointerY - startY) < DRAG_THRESHOLD) return;
                    begin();
                }

                ev.preventDefault();
                item.style.left = (rect.left + pointerX - startX) + 'px';
                item.style.top = (rect.top + pointerY - startY) + 'px';
                placeAt(pointerX, pointerY);
                autoScroll(pointerY);
            }

            function finish(ev) {
                if (ev && ev.pointerId !== e.pointerId) return;
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', finish);
                document.removeEventListener('pointercancel', finish);

                if (!dragging) return;

                var newList = placeholder.parentElement;
                newList.insertBefore(item, placeholder);
                placeholder.parentNode.removeChild(placeholder);

                item.classList.remove('wpAdvQuiz_dragging');
                ['position', 'left', 'top', 'width', 'boxSizing', 'zIndex', 'pointerEvents', 'margin'].forEach(function (p) {
                    item.style[p] = '';
                });

                var changed = newList !== origList || item.nextElementSibling !== origNext;

                if (changed) {
                    var done = [];
                    [origList, newList].forEach(function (l) {
                        if (done.indexOf(l) >= 0) return;
                        done.push(l);
                        if (l._waqSort && l._waqSort.opts.update) l._waqSort.opts.update(l);
                    });
                }
            }

            document.addEventListener('pointermove', onMove, {passive: false});
            document.addEventListener('pointerup', finish);
            document.addEventListener('pointercancel', finish);
        });
    }

    /* ------------------------------------------------------------------
     * Quiz
     * ------------------------------------------------------------------ */

    function WpAdvQuizFront(element, options) {
        var $e = element;
        var config = options || {};
        var plugin = this;
        var results = {};
        var catResults = {};
        var startTime = 0;
        var currentQuestion = null;
        var quizSolved = [];
        var lastButtonValue = '';
        var inViewQuestions = false;
        var currentPage = 1;
        var listeners = {};

        var bitOptions = {
            randomAnswer: 0,
            randomQuestion: 0,
            disabledAnswerMark: 0,
            checkBeforeStart: 0,
            preview: 0,
            cors: 0,
            isAddAutomatic: 0,
            quizSummeryHide: 0,
            skipButton: 0,
            reviewQustion: 0,
            autoStart: 0,
            forcingQuestionSolve: 0,
            hideQuestionPositionOverview: 0,
            formActivated: 0,
            maxShowQuestion: 0,
            sortCategories: 0
        };

        var quizStatus = {
            isQuizStart: 0,
            isLocked: 0,
            loadLock: 0,
            isPrerequisite: 0,
            isUserStartLocked: 0
        };

        var globalNames = {
            check: 'input[name="check"]',
            next: 'input[name="next"]',
            questionList: '.wpAdvQuiz_questionList',
            skip: 'input[name="skip"]',
            singlePageLeft: 'input[name="wpAdvQuiz_pageLeft"]',
            singlePageRight: 'input[name="wpAdvQuiz_pageRight"]'
        };

        var globalElements;

        function loadGlobalElements() {
            globalElements = {
                back: qsa($e, 'input[name="back"]'),
                next: qsa($e, globalNames.next),
                quiz: qs($e, '.wpAdvQuiz_quiz'),
                questionList: qs($e, '.wpAdvQuiz_list'),
                results: qs($e, '.wpAdvQuiz_results'),
                quizStartPage: qs($e, '.wpAdvQuiz_text'),
                timelimit: qs($e, '.wpAdvQuiz_time_limit'),
                toplistShowInButton: qs($e, '.wpAdvQuiz_toplistShowInButton'),
                listItems: []
            };
        }

        loadGlobalElements();

        var toplistData = {
            token: '',
            isUser: 0
        };

        var formPosConst = {
            START: 0,
            END: 1
        };

        // Internal events (replaces $e.bind / $e.trigger). Also dispatches a CustomEvent
        // "wpAdvQuiz:<name>" on the quiz element for outside code that wants to listen.
        function on(type, fn) {
            (listeners[type] = listeners[type] || []).push(fn);
        }

        function trigger(type, values) {
            var ev = {type: type, values: values};
            (listeners[type] || []).forEach(function (fn) {
                fn(ev);
            });
            try {
                $e.dispatchEvent(new CustomEvent('wpAdvQuiz:' + type, {detail: values}));
            } catch (err) {
            }
        }

        function questionListOf(li) {
            return qs(li, globalNames.questionList);
        }

        /**
         * @memberOf timelimit
         */
        var timelimit = (function () {
            var instance = {};
            var _intervalId = 0;

            instance.stop = function () {
                if (config.timelimit) {
                    window.clearInterval(_intervalId);
                    hide(globalElements.timelimit);
                }
            };

            instance.start = function () {
                var counter = config.timelimit;

                if (!counter || !globalElements.timelimit)
                    return;

                window.clearInterval(_intervalId);

                var x = counter * 1000;
                var timeText = qs(globalElements.timelimit, 'span');
                var timeDiv = qs(globalElements.timelimit, '.wpAdvQuiz_progress');

                setText(timeText, plugin.methode.parseTime(counter));
                show(globalElements.timelimit);

                var beforeTime = +new Date();

                _intervalId = window.setInterval(function () {
                    var diff = (+new Date() - beforeTime);
                    var elapsedTime = x - diff;

                    if (diff >= 500) {
                        setText(timeText, plugin.methode.parseTime(Math.ceil(elapsedTime / 1000)));
                    }

                    if (timeDiv) timeDiv.style.width = (elapsedTime / x * 100) + '%';

                    if (elapsedTime <= 0) {
                        instance.stop();
                        plugin.methode.finishQuiz(true);
                    }
                }, 16);
            };

            return instance;
        })();

        /**
         * Review box (list of question numbers with its own scrollbar).
         * @memberOf reviewBox
         */
        var reviewBox = new function () {
            var contain = null, cursor = null, list = null, items = [];
            var x = 0, offset = 0, diff = 0, top = 0, max = 0;
            var itemsStatus = [];

            function setPos(v, o) {
                setMarginTopImportant(list, -v);
                if (cursor) cursor.style.top = o + 'px';
            }

            function measure() {
                setPos(0, 0);

                var h = list ? list.offsetHeight : 0;
                var c = innerHeight(contain);
                x = c - innerHeight(cursor);
                offset = 0;
                max = h - c;
                diff = x ? max / x : 0;

                if (h > 100) {
                    show(cursor);
                }

                top = cursor ? docTop(cursor) : 0;
            }

            this.init = function () {
                contain = qs($e, '.wpAdvQuiz_reviewQuestion');
                if (!contain) return;

                cursor = qs(contain, 'div');
                list = qs(contain, 'ol');
                items = children(list);

                if (cursor) {
                    cursor.addEventListener('pointerdown', function (e) {
                        e.preventDefault();
                        e.stopPropagation();

                        offset = e.pageY - docTop(cursor) + top;

                        var move = function (ev) {
                            ev.preventDefault();

                            var o = ev.pageY - offset;

                            if (o < 0)
                                o = 0;

                            if (o > x)
                                o = x;

                            setPos(diff * o, o);
                        };

                        var end = function (ev) {
                            ev.preventDefault();
                            document.removeEventListener('pointermove', move);
                            document.removeEventListener('pointerup', end);
                            document.removeEventListener('pointercancel', end);
                        };

                        document.addEventListener('pointermove', move, {passive: false});
                        document.addEventListener('pointerup', end);
                        document.addEventListener('pointercancel', end);
                    });
                }

                if (list) {
                    list.addEventListener('click', function (e) {
                        var li = e.target.closest('li');
                        if (li && li.parentElement === list) {
                            plugin.methode.showQuestion(index(li));
                        }
                    });
                }

                on('questionSolved', function (e) {
                    if (!itemsStatus[e.values.index]) itemsStatus[e.values.index] = {};
                    itemsStatus[e.values.index].solved = e.values.solved;
                    setColor(e.values.index);
                });

                on('changeQuestion', function (e) {
                    items.forEach(function (li) {
                        li.classList.remove('wpAdvQuiz_reviewQuestionTarget');
                    });

                    if (e.values.index < 0) return;

                    var t = eq(items, e.values.index);
                    if (t) t.classList.add('wpAdvQuiz_reviewQuestionTarget');

                    scroll(e.values.index);
                });

                on('reviewQuestion', function (e) {
                    if (!itemsStatus[e.values.index]) itemsStatus[e.values.index] = {};
                    itemsStatus[e.values.index].review = !itemsStatus[e.values.index].review;
                    setColor(e.values.index);
                });

                contain.addEventListener('wheel', function (e) {
                    if (max <= 0) return;

                    e.preventDefault();

                    var w = e.deltaY > 0 ? 1 : (e.deltaY < 0 ? -1 : 0);
                    var plus = 20 * w;
                    var v = top - docTop(list) + plus;

                    if (v > max)
                        v = max;

                    if (v < 0)
                        v = 0;

                    setPos(v, diff ? v / diff : 0);
                }, {passive: false});
            };

            this.show = function (save) {
                if (!contain) return;

                if (bitOptions.reviewQustion)
                    show(contain.parentNode);

                show(qsa($e, '.wpAdvQuiz_reviewDiv .wpAdvQuiz_button2'));

                if (save)
                    return;

                this.reset();
                measure();
            };

            this.hide = function () {
                if (contain) hide(contain.parentNode);
            };

            this.toggle = function () {
                if (contain && bitOptions.reviewQustion) {
                    toggle(contain.parentNode);
                    items.forEach(function (li) {
                        li.classList.remove('wpAdvQuiz_reviewQuestionTarget');
                    });
                    hide(qsa($e, '.wpAdvQuiz_reviewDiv .wpAdvQuiz_button2'));
                    measure();
                }
            };

            this.reset = function () {
                for (var i = 0, c = items.length; i < c; i++) {
                    itemsStatus[i] = {};
                }

                items.forEach(function (li) {
                    li.classList.remove('wpAdvQuiz_reviewQuestionTarget');
                    li.style.backgroundColor = '';
                });
            };

            function scroll(idx) {
                var item = eq(items, idx);
                if (!item || !contain || !list) return;

                var iTop = docTop(item);
                var cTop = docTop(contain);
                var calc = iTop - cTop;

                if ((calc - 4) < 0 || (calc + 32) > 100) {
                    var pos = item.offsetTop - parseFloat(getComputedStyle(item).marginTop || 0);
                    var v = cTop - docTop(items[0]) - (cTop - docTop(list)) + pos;

                    if (v > max)
                        v = max;

                    setPos(v, diff ? v / diff : 0);
                }
            }

            function setColor(idx) {
                var color = '';
                var itemStatus = itemsStatus[idx] || {};

                if (itemStatus.review) {
                    color = '#FFB800';
                } else if (itemStatus.solved) {
                    color = '#6CA54C';
                }

                var li = eq(items, idx);
                if (li) li.style.backgroundColor = color;
            }
        };

        function QuestionTimer() {
            var questionStartTime = 0;
            var currentQuestionId = -1;

            var quizStartTimer = 0;
            var isQuizStart = false;

            this.questionStart = function (questionId) {
                if (currentQuestionId != -1)
                    this.questionStop();

                currentQuestionId = questionId;
                questionStartTime = +new Date();
            };

            this.questionStop = function () {
                if (currentQuestionId == -1)
                    return;

                if (results[currentQuestionId]) {
                    results[currentQuestionId].time += Math.round((new Date() - questionStartTime) / 1000);
                }

                currentQuestionId = -1;
            };

            this.startQuiz = function () {
                if (isQuizStart)
                    this.stopQuiz();

                quizStartTimer = +new Date();
                isQuizStart = true;
            };

            this.stopQuiz = function () {
                if (!isQuizStart)
                    return;

                if (results.comp) {
                    results.comp.quizTime += Math.round((new Date() - quizStartTimer) / 1000);
                }

                isQuizStart = false;
            };
        }

        var questionTimer = new QuestionTimer();

        function disableInputs(list) {
            list.forEach(function (el) {
                el.disabled = true;
            });
            return list;
        }

        function boxShadowOff(list) {
            list.forEach(function (el) {
                el.style.boxShadow = '0 0';
                el.style.cursor = 'auto';
            });
        }

        /**
         * Grade one question.
         * @memberOf checker
         */
        var checker = function (name, qData, question, questionList) {
            var correct = true;
            var points = 0;
            var isDiffPoints = Array.isArray(qData.points);
            var statistcAnswerData = {};

            var func = {
                singleMulti: function () {
                    var input = disableInputs(qsa(questionList, '.wpAdvQuiz_questionInput'));
                    var isDiffMode = qData.diffMode;

                    children(questionList).forEach(function (item, i) {
                        var idx = data(item, 'pos');
                        var checked = !!(input[i] && input[i].checked);

                        if (qData.correct[idx]) {
                            if (!checked) {
                                correct = false;
                            } else {
                                if (isDiffPoints) {
                                    if (isDiffMode)
                                        points = qData.points[idx];
                                    else
                                        points += qData.points[idx];
                                }
                            }

                            if (qData.disCorrect) {
                                correct = true;
                            } else {
                                plugin.methode.marker(item, true);
                            }

                        } else {
                            if (checked) {
                                if (!qData.disCorrect) {
                                    plugin.methode.marker(item, false);
                                    correct = false;
                                } else {
                                    correct = true;
                                }

                                if (isDiffMode)
                                    points = qData.points[idx];
                            } else {
                                if (isDiffPoints && !isDiffMode) {
                                    points += qData.points[idx];
                                }
                            }
                        }
                    });
                },

                sort_answer: function () {
                    var items = children(questionList);

                    items.forEach(function (item, i) {
                        statistcAnswerData[i] = data(item, 'pos');

                        if (i == data(item, 'pos')) {
                            plugin.methode.marker(item, true);

                            if (isDiffPoints) {
                                points += qData.points[i];
                            }
                        } else {
                            plugin.methode.marker(item, false);
                            correct = false;
                        }
                    });

                    items.forEach(function (item) {
                        boxShadowOff(children(item));
                    });

                    destroySortable(questionList);

                    items.sort(function (a, b) {
                        return data(a, 'pos') > data(b, 'pos') ? 1 : -1;
                    }).forEach(function (item) {
                        questionList.appendChild(item);
                    });
                },

                matrix_sort_answer: function () {
                    var items = children(questionList);
                    var matrix = [];
                    statistcAnswerData = {0: -1};

                    items.forEach(function (item) {
                        var i = data(item, 'pos');
                        var stringUl = qs(item, '.wpAdvQuiz_maxtrixSortCriterion');
                        var stringItem = children(stringUl);

                        if (stringItem.length)
                            statistcAnswerData[i] = data(stringItem[0], 'pos');

                        if (stringItem.length && String(data(stringItem[0], 'correct')).split(',').indexOf(String(i)) >= 0) {
                            plugin.methode.marker(stringUl, true);

                            if (isDiffPoints) {
                                points += qData.points[i];
                            }
                        } else {
                            correct = false;
                            plugin.methode.marker(stringUl, false);
                        }

                        matrix[i] = stringUl;
                    });

                    plugin.methode.resetMatrix(question);

                    var sortItems = qsa(question, '.wpAdvQuiz_sortStringItem');

                    sortItems.forEach(function (el) {
                        var target = matrix[data(el, 'pos')];
                        if (target)
                            target.appendChild(el);
                    });

                    boxShadowOff(sortItems);

                    destroySortable(qsa(question, '.wpAdvQuiz_sortStringList, .wpAdvQuiz_maxtrixSortCriterion'));
                },

                free_answer: function () {
                    var li = children(questionList);
                    var inputs = disableInputs(qsa(questionList, '.wpAdvQuiz_questionInput'));
                    var value = inputs.length ? inputs[0].value : '';

                    if (qData.correct.indexOf(trim(value).toLowerCase()) >= 0) {
                        plugin.methode.marker(li, true);
                    } else {
                        plugin.methode.marker(li, false);
                        correct = false;
                    }
                },

                cloze_answer: function () {
                    qsa(questionList, '.wpAdvQuiz_cloze').forEach(function (cloze, i) {
                        var c = children(cloze);
                        var input = c[0];
                        var span = c[1];
                        var inputText = plugin.methode.cleanupCurlyQuotes(input ? input.value : '');

                        if (qData.correct[i] && qData.correct[i].indexOf(inputText) >= 0) {
                            if (isDiffPoints) {
                                points += qData.points[i];
                            }

                            if (!bitOptions.disabledAnswerMark && input) {
                                input.style.backgroundColor = '#B0DAB0';
                            }
                        } else {
                            if (!bitOptions.disabledAnswerMark && input) {
                                input.style.backgroundColor = '#FFBABA';
                            }

                            correct = false;

                            show(span);
                        }

                        if (input) input.disabled = true;
                    });
                },

                assessment_answer: function () {
                    correct = true;
                    var input = disableInputs(qsa(questionList, '.wpAdvQuiz_questionInput'));
                    var val = 0;

                    input.forEach(function (el) {
                        if (el.checked) val += parseInt(el.value, 10);
                    });

                    points = val;
                }
            };

            if (func[name]) func[name]();

            if (!isDiffPoints && correct) {
                points = qData.points;
            }

            return {
                c: correct,
                p: points,
                s: statistcAnswerData
            };
        };

        /**
         *  Form with the participant's details.
         *  @memberOf formClass
         */
        var formClass = new function () {
            var isEmpty = function (str) {
                str = trim(str);
                return (!str || 0 === str.length);
            };

            var typeConst = {
                TEXT: 0,
                TEXTAREA: 1,
                NUMBER: 2,
                CHECKBOX: 3,
                EMAIL: 4,
                YES_NO: 5,
                DATE: 6,
                SELECT: 7,
                RADIO: 8
            };

            var FIELDS = '.wpAdvQuiz_forms input, .wpAdvQuiz_forms textarea, .wpAdvQuiz_forms .wpAdvQuiz_formFields, .wpAdvQuiz_forms select';

            function siblingsInvalidate(el) {
                return children(el.parentNode).filter(function (s) {
                    return s !== el && s.classList.contains('wpAdvQuiz_invalidate');
                });
            }

            function checkedRadioValue(el) {
                var r = qs(el, 'input[type="radio"]:checked');
                return r ? r.value : undefined;
            }

            this.checkForm = function () {
                var check = true;

                qsa($e, FIELDS).forEach(function (el) {
                    var isRequired = data(el, 'required') == 1;
                    var type = data(el, 'type');
                    var test = true;
                    var value = trim(el.value);

                    switch (type) {
                        case typeConst.TEXT:
                        case typeConst.TEXTAREA:
                        case typeConst.SELECT:
                            if (isRequired)
                                test = !isEmpty(value);

                            break;
                        case typeConst.NUMBER:
                            if (isRequired || !isEmpty(value))
                                test = !isEmpty(value) && !isNaN(value);

                            break;
                        case typeConst.EMAIL:
                            if (isRequired || !isEmpty(value))
                                test = !isEmpty(value) && /^[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/
                                    .test(value.toLowerCase());

                            break;
                        case typeConst.CHECKBOX:
                            if (isRequired)
                                test = el.checked;

                            break;
                        case typeConst.YES_NO:
                        case typeConst.RADIO:
                            if (isRequired)
                                test = checkedRadioValue(el) !== undefined;
                            break;
                        case typeConst.DATE:
                            var num = 0, co = 0;

                            qsa(el, 'select').forEach(function (s) {
                                num++;
                                co += isEmpty(s.value) ? 0 : 1;
                            });

                            if (isRequired || co > 0)
                                test = num == co;

                            break;
                    }

                    if (test) {
                        hide(siblingsInvalidate(el));
                    } else {
                        check = false;
                        show(siblingsInvalidate(el));
                    }
                });

                return check;
            };

            this.getFormData = function () {
                var out = {};

                qsa($e, FIELDS).forEach(function (el) {
                    var id = data(el, 'form_id');
                    var type = data(el, 'type');

                    switch (type) {
                        case typeConst.TEXT:
                        case typeConst.TEXTAREA:
                        case typeConst.SELECT:
                        case typeConst.NUMBER:
                        case typeConst.EMAIL:
                            out[id] = el.value;
                            break;
                        case typeConst.CHECKBOX:
                            out[id] = el.checked ? 1 : 0;
                            break;
                        case typeConst.YES_NO:
                        case typeConst.RADIO:
                            out[id] = checkedRadioValue(el);
                            break;
                        case typeConst.DATE:
                            var sel = function (part) {
                                var s = qs(el, 'select[name="wpAdvQuiz_field_' + id + '_' + part + '"]');
                                return s ? s.value : undefined;
                            };

                            out[id] = {
                                day: sel('day'),
                                month: sel('month'),
                                year: sel('year')
                            };
                            break;
                    }
                });

                return out;
            };
        };

        var fetchAllAnswerData = function (resultData) {
            qsa($e, '.wpAdvQuiz_questionList').forEach(function (ql) {
                var questionId = data(ql, 'question_id');
                var type = data(ql, 'type');
                var d = {};

                if (type == 'single' || type == 'multiple') {
                    qsa(ql, '.wpAdvQuiz_questionListItem').forEach(function (li) {
                        var input = qs(li, '.wpAdvQuiz_questionInput');
                        d[data(li, 'pos')] = +!!(input && input.checked);
                    });
                } else if (type == 'free_answer') {
                    var fi = qs(ql, '.wpAdvQuiz_questionInput');
                    d[0] = fi ? fi.value : '';
                } else if (type == 'sort_answer' || type == 'matrix_sort_answer') {
                    return;
                } else if (type == 'cloze_answer') {
                    var i = 0;
                    qsa(ql, '.wpAdvQuiz_cloze input').forEach(function (inp) {
                        d[i++] = inp.value;
                    });
                } else if (type == 'assessment_answer') {
                    d[0] = '';

                    qsa(ql, '.wpAdvQuiz_questionInput').forEach(function (inp) {
                        if (inp.checked) d[data(inp, 'index')] = inp.value;
                    });
                }

                if (resultData[questionId]) resultData[questionId]['data'] = d;
            });
        };

        function solvedAll() {
            for (var i = 0, c = qsa($e, '.wpAdvQuiz_listItem').length; i < c; i++) {
                if (!quizSolved[i]) {
                    return false;
                }
            }
            return true;
        }

        function resetInputs(scope) {
            qsa(scope, '.wpAdvQuiz_questionInput, .wpAdvQuiz_cloze input').forEach(function (el) {
                el.disabled = false;
                el.checked = false;
                el.removeAttribute('checked');
                el.style.backgroundColor = '';
            });

            qsa(scope, '.wpAdvQuiz_questionListItem input[type="text"]').forEach(function (el) {
                el.value = '';
            });
        }

        plugin.methode = {
            /**
             * @memberOf plugin.methode
             */

            parseBitOptions: function () {
                if (config.bo) {
                    bitOptions.randomAnswer = config.bo & (1 << 0);
                    bitOptions.randomQuestion = config.bo & (1 << 1);
                    bitOptions.disabledAnswerMark = config.bo & (1 << 2);
                    bitOptions.checkBeforeStart = config.bo & (1 << 3);
                    bitOptions.preview = config.bo & (1 << 4);
                    // bit 5 (cors): only used for old IE via jQuery.support.cors, ignored.
                    bitOptions.isAddAutomatic = config.bo & (1 << 6);
                    bitOptions.reviewQustion = config.bo & (1 << 7);
                    bitOptions.quizSummeryHide = config.bo & (1 << 8);
                    bitOptions.skipButton = config.bo & (1 << 9);
                    bitOptions.autoStart = config.bo & (1 << 10);
                    bitOptions.forcingQuestionSolve = config.bo & (1 << 11);
                    bitOptions.hideQuestionPositionOverview = config.bo & (1 << 12);
                    bitOptions.formActivated = config.bo & (1 << 13);
                    bitOptions.maxShowQuestion = config.bo & (1 << 14);
                    bitOptions.sortCategories = config.bo & (1 << 15);
                }
            },

            setClozeStyle: function () {
                qsa($e, '.wpAdvQuiz_cloze input').forEach(function (input) {
                    var word = '';
                    var wordLen = data(input, 'wordlen');

                    for (var i = 0; i < wordLen; i++)
                        word += 'w';

                    var clone = document.createElement('span');
                    clone.style.visibility = 'hidden';
                    clone.style.position = 'absolute';
                    clone.style.whiteSpace = 'pre';
                    clone.textContent = word;
                    document.body.appendChild(clone);

                    var width = clone.getBoundingClientRect().width;

                    clone.parentNode.removeChild(clone);

                    input.style.width = (width + 5) + 'px';
                });
            },

            parseTime: function (sec) {
                // Math.floor instead of parseInt: parseInt(8e-6) = 8 turned tiny times into "08:00:00"
                sec = Math.max(0, +sec || 0);
                var seconds = Math.floor(sec % 60);
                var minutes = Math.floor((sec / 60) % 60);
                var hours = Math.floor((sec / 3600) % 24);

                seconds = (seconds > 9 ? '' : '0') + seconds;
                minutes = (minutes > 9 ? '' : '0') + minutes;
                hours = (hours > 9 ? '' : '0') + hours;

                return hours + ':' + minutes + ':' + seconds;
            },

            cleanupCurlyQuotes: function (str) {
                str = String(str || '');
                str = str.replace(/‘/, "'");
                str = str.replace(/’/, "'");

                str = str.replace(/“/, '"');
                str = str.replace(/”/, '"');

                return trim(str).toLowerCase();
            },

            resetMatrix: function (selector) {
                toArr(selector).forEach(function (el) {
                    var list = qs(el, '.wpAdvQuiz_sortStringList');
                    if (!list) return;

                    qsa(el, '.wpAdvQuiz_sortStringItem').forEach(function (item) {
                        list.appendChild(item);
                    });
                });
            },

            marker: function (e, correct) {
                if (!bitOptions.disabledAnswerMark) {
                    toArr(e).forEach(function (el) {
                        el.classList.add(correct ? 'wpAdvQuiz_answerCorrect' : 'wpAdvQuiz_answerIncorrect');
                    });
                }
            },

            startQuiz: function (loadData) {
                if (quizStatus.loadLock) {
                    quizStatus.isQuizStart = 1;

                    return;
                }

                quizStatus.isQuizStart = 0;

                if (quizStatus.isLocked) {
                    hide(globalElements.quizStartPage);
                    show(qs($e, '.wpAdvQuiz_lock'));

                    return;
                }

                if (quizStatus.isPrerequisite) {
                    hide(globalElements.quizStartPage);
                    show(qs($e, '.wpAdvQuiz_prerequisite'));

                    return;
                }

                if (quizStatus.isUserStartLocked) {
                    hide(globalElements.quizStartPage);
                    show(qs($e, '.wpAdvQuiz_startOnlyRegisteredUser'));

                    return;
                }

                if (bitOptions.maxShowQuestion && !loadData) {
                    hide(globalElements.quizStartPage);
                    show(qs($e, '.wpAdvQuiz_loadQuiz'));

                    plugin.methode.loadQuizDataAjax(true);

                    return;
                }

                if (bitOptions.formActivated && config.formPos == formPosConst.START) {
                    if (!formClass.checkForm())
                        return;
                }

                plugin.methode.loadQuizData();

                if (bitOptions.randomQuestion) {
                    plugin.methode.random(globalElements.questionList);
                }

                if (bitOptions.randomAnswer) {
                    plugin.methode.random(qsa($e, globalNames.questionList));
                }

                if (bitOptions.sortCategories) {
                    plugin.methode.sortCategories();
                }

                plugin.methode.random(qsa($e, '.wpAdvQuiz_sortStringList'));
                plugin.methode.random(qsa($e, '[data-type="sort_answer"]'));

                qsa($e, '.wpAdvQuiz_listItem').forEach(function (li, i) {
                    var pageSpan = qs(li, '.wpAdvQuiz_question_page span');
                    setText(pageSpan, i + 1);
                    setText(qsa(li, ':scope > .wpAdvQuiz_questionHeader span, :scope > h5 span'), i + 1);

                    qsa(li, '.wpAdvQuiz_questionListItem').forEach(function (item, j) {
                        setText(qsa(item, ':scope > span:not(.wpAdvQuiz_cloze)'), j + 1 + '. ');
                    });
                });

                globalElements.next = qsa($e, globalNames.next);

                switch (config.mode) {
                    case 3:
                        show(qsa($e, 'input[name="checkSingle"]'));
                        break;
                    case 2:
                        show(qsa($e, globalNames.check));

                        if (!bitOptions.skipButton && bitOptions.reviewQustion)
                            show(qsa($e, globalNames.skip));

                        break;
                    case 1:
                        show(qsa($e, 'input[name="back"]').slice(1));
                    // fall through
                    case 0:
                        show(globalElements.next);
                        break;
                }

                if (bitOptions.hideQuestionPositionOverview || config.mode == 3)
                    hide(qsa($e, '.wpAdvQuiz_question_page'));

                // Rename the last "Next" button
                var lastButton = eq(globalElements.next, -1);
                if (lastButton) {
                    lastButtonValue = lastButton.value;
                    lastButton.value = config.lbn;
                }

                var listItem = children(globalElements.questionList);

                globalElements.listItems = qsa($e, '.wpAdvQuiz_list > li');

                if (config.mode == 3) {
                    plugin.methode.showSinglePage(0);
                } else {
                    currentQuestion = show(listItem[0] || null);

                    if (currentQuestion) {
                        questionTimer.questionStart(data(questionListOf(currentQuestion), 'question_id'));
                    }
                }

                questionTimer.startQuiz();

                // Drag & drop for sorting questions
                qsa($e, '.wpAdvQuiz_questionList[data-type="sort_answer"]').forEach(function (ul) {
                    makeSortable(ul, {
                        update: function (l) {
                            var p = l.closest('.wpAdvQuiz_listItem');

                            trigger('questionSolved', {
                                item: p,
                                index: index(p),
                                solved: true
                            });
                        }
                    });
                });

                qsa($e, '.wpAdvQuiz_listItem').forEach(function (li) {
                    var lists = qsa(li, '.wpAdvQuiz_sortStringList, .wpAdvQuiz_maxtrixSortCriterion');
                    if (!lists.length) return;

                    var opts = {
                        placeholder: 'wpAdvQuiz_placehold',
                        connect: function () {
                            return lists;
                        },
                        // A criterion cell only accepts an item while it is empty
                        accepts: function (l, item, placeholder) {
                            if (!l.classList.contains('wpAdvQuiz_maxtrixSortCriterion')) return true;

                            return !children(l).some(function (c) {
                                return c !== item && c !== placeholder;
                            });
                        },
                        update: function (l) {
                            var p = l.closest('.wpAdvQuiz_listItem');

                            trigger('questionSolved', {
                                item: p,
                                index: index(p),
                                solved: true
                            });
                        }
                    };

                    lists.forEach(function (l) {
                        makeSortable(l, opts);
                    });
                });

                quizSolved = [];

                timelimit.start();

                startTime = +new Date();

                results = {
                    comp: {
                        points: 0,
                        correctQuestions: 0,
                        quizTime: 0
                    }
                };

                qsa($e, '.wpAdvQuiz_questionList').forEach(function (ql) {
                    results[data(ql, 'question_id')] = {
                        time: 0,
                        solved: 0
                    };
                });

                catResults = {};

                Object.keys(config.catPoints || {}).forEach(function (k) {
                    catResults[k] = 0;
                });

                hide(globalElements.quizStartPage);
                hide(qs($e, '.wpAdvQuiz_loadQuiz'));
                show(globalElements.quiz);
                reviewBox.show();

                if (config.mode != 3 && currentQuestion) {
                    trigger('changeQuestion', {
                        item: currentQuestion,
                        index: index(currentQuestion)
                    });
                }
            },

            showSingleQuestion: function (question) {
                var page = question ? Math.ceil(question / config.qpp) : 1;

                this.showSinglePage(page);
            },

            showSinglePage: function (page) {
                var listItem = hide(children(globalElements.questionList));

                if (!config.qpp) {
                    show(listItem);

                    return;
                }

                page = page ? +page : 1;

                var maxPage = Math.ceil(qsa($e, '.wpAdvQuiz_list > li').length / config.qpp);

                if (page > maxPage)
                    return;

                var pl = hide(qsa($e, globalNames.singlePageLeft));
                var pr = hide(qsa($e, globalNames.singlePageRight));
                var cs = hide(qsa($e, 'input[name="checkSingle"]'));

                if (page > 1) {
                    pl.forEach(function (b) {
                        b.value = String(data(b, 'text')).replace(/%d/, page - 1);
                    });
                    show(pl);
                }

                if (page == maxPage) {
                    show(cs);
                } else {
                    pr.forEach(function (b) {
                        b.value = String(data(b, 'text')).replace(/%d/, page + 1);
                    });
                    show(pr);
                }

                currentPage = page;

                var start = config.qpp * (page - 1);

                show(listItem.slice(start, start + config.qpp));
                plugin.methode.scrollTo(globalElements.quiz);
            },

            nextQuestion: function () {
                this.showQuestionObject(currentQuestion ? currentQuestion.nextElementSibling : null);
            },

            prevQuestion: function () {
                this.showQuestionObject(currentQuestion ? currentQuestion.previousElementSibling : null);
            },

            showQuestion: function (idx) {
                var element = eq(globalElements.listItems, idx);

                if (config.mode == 3 || inViewQuestions) {
                    if (config.qpp) {
                        plugin.methode.showSingleQuestion(idx + 1);
                    }

                    if (element) plugin.methode.scrollTo(element, 1);
                    questionTimer.startQuiz();
                    return;
                }

                this.showQuestionObject(element);
            },

            showQuestionObject: function (obj) {
                if (!obj && bitOptions.forcingQuestionSolve && bitOptions.quizSummeryHide && bitOptions.reviewQustion) {
                    if (!solvedAll()) {
                        alert(globalCfg().questionsNotSolved);
                        return false;
                    }
                }

                hide(currentQuestion);

                currentQuestion = show(obj || null);

                plugin.methode.scrollTo(globalElements.quiz);

                trigger('changeQuestion', {
                    item: currentQuestion,
                    index: currentQuestion ? index(currentQuestion) : -1
                });

                if (!currentQuestion) {
                    plugin.methode.showQuizSummary();
                } else {
                    questionTimer.questionStart(data(questionListOf(currentQuestion), 'question_id'));
                }
            },

            skipQuestion: function () {
                trigger('skipQuestion', {
                    item: currentQuestion,
                    index: index(currentQuestion)
                });

                plugin.methode.nextQuestion();
            },

            reviewQuestion: function () {
                if (!currentQuestion) return;

                trigger('reviewQuestion', {
                    item: currentQuestion,
                    index: index(currentQuestion)
                });
            },

            showQuizSummary: function () {
                questionTimer.questionStop();
                questionTimer.stopQuiz();

                if (bitOptions.quizSummeryHide || !bitOptions.reviewQustion) {
                    if (bitOptions.formActivated && config.formPos == formPosConst.END) {
                        reviewBox.hide();
                        hide(globalElements.quiz);
                        plugin.methode.scrollTo(show(qs($e, '.wpAdvQuiz_infopage')));
                    } else {
                        plugin.methode.finishQuiz();
                    }

                    return;
                }

                var quizSummary = qs($e, '.wpAdvQuiz_checkPage');
                if (!quizSummary) return;

                var ol = qs(quizSummary, 'ol');

                if (ol) {
                    ol.innerHTML = '';

                    qsa($e, '.wpAdvQuiz_reviewQuestion ol li').forEach(function (li) {
                        var c = li.cloneNode(true);
                        c.classList.remove('wpAdvQuiz_reviewQuestionTarget');
                        ol.appendChild(c);
                    });
                }

                var cSolved = 0;

                for (var i = 0, c = quizSolved.length; i < c; i++) {
                    if (quizSolved[i]) {
                        cSolved++;
                    }
                }

                setText(qs(quizSummary, '.wpAdvQuiz_solvedCount') || qs(quizSummary, 'p span'), cSolved);

                reviewBox.hide();
                hide(globalElements.quiz);

                show(quizSummary);

                plugin.methode.scrollTo(quizSummary);
            },

            finishQuiz: function (timeover) {
                questionTimer.questionStop();
                questionTimer.stopQuiz();
                timelimit.stop();

                var time = (+new Date() - startTime) / 1000;
                time = (config.timelimit && time > config.timelimit) ? config.timelimit : time;

                setText(qsa($e, '.wpAdvQuiz_quiz_time span'), plugin.methode.parseTime(time));

                if (timeover) {
                    show(qs(globalElements.results, '.wpAdvQuiz_time_limit_expired'));
                }

                plugin.methode.checkQuestion(children(globalElements.questionList), true);

                setText(qsa($e, '.wpAdvQuiz_correct_answer'), results.comp.correctQuestions);

                results.comp.result = Math.round(results.comp.points / config.globalPoints * 100 * 100) / 100;
                results.comp.solved = 0;

                var pointFields = qsa($e, '.wpAdvQuiz_points span');

                setText(pointFields[0], results.comp.points);
                setText(pointFields[1], config.globalPoints);
                setText(pointFields[2], results.comp.result + '%');

                // Result text for the score range
                var resultText = eq(qsa($e, '.wpAdvQuiz_resultsList > li'), plugin.methode.findResultIndex(results.comp.result));

                var formData = formClass.getFormData();

                qsa(resultText, '.wpAdvQuiz_resultForm').forEach(function (el) {
                    var d = formData[data(el, 'form_id')];

                    if (d && typeof d === 'object') {
                        d = d['day'] + '-' + d['month'] + '-' + d['year'];
                    }

                    setText(el, d);
                    show(el);
                });

                show(resultText);

                plugin.methode.setAverageResult(results.comp.result, false);

                this.setCategoryOverview();

                plugin.methode.sendCompletedQuiz();

                if (bitOptions.isAddAutomatic && toplistData.isUser) {
                    plugin.methode.addToplist();
                }

                reviewBox.hide();

                hide(qsa($e, '.wpAdvQuiz_checkPage, .wpAdvQuiz_infopage'));
                hide(globalElements.quiz);
                show(globalElements.results);

                plugin.methode.scrollTo(globalElements.results);
            },

            setCategoryOverview: function () {
                results.comp.cats = {};

                qsa($e, '.wpAdvQuiz_catOverview li').forEach(function (li) {
                    var catId = data(li, 'category_id');

                    if (!config.catPoints || config.catPoints[catId] === undefined) {
                        hide(li);
                        return;
                    }

                    var r = Math.round(catResults[catId] / config.catPoints[catId] * 100 * 100) / 100;

                    results.comp.cats[catId] = r;

                    setText(qs(li, '.wpAdvQuiz_catPercent'), r + '%');

                    show(li);
                });
            },

            questionSolved: function (e) {
                quizSolved[e.values.index] = e.values.solved;

                var ql = questionListOf(e.values.item);
                var qd = config.json ? config.json[data(ql, 'question_id')] : null;

                if (!qd || !results[qd.id]) return;

                results[qd.id].solved = Number(e.values.fake ? results[qd.id].solved : e.values.solved);
            },

            sendCompletedQuiz: function () {
                if (bitOptions.preview)
                    return;

                fetchAllAnswerData(results);

                var formData = formClass.getFormData();

                ajax({
                    action: 'wp_adv_quiz_admin_ajax',
                    func: 'completedQuiz',
                    data: {
                        quizId: config.quizId,
                        results: results,
                        forms: formData
                    }
                });
            },

            findResultIndex: function (p) {
                var r = config.resultsGrade || [];
                var idx = -1;
                var diff = 999999;

                for (var i = 0; i < r.length; i++) {
                    var v = r[i];

                    if ((p >= v) && ((p - v) < diff)) {
                        diff = p - v;
                        idx = i;
                    }
                }

                return idx;
            },

            showQustionList: function () {
                inViewQuestions = !inViewQuestions;
                hide(globalElements.toplistShowInButton);
                toggle(globalElements.quiz);
                hide(qsa($e, '.wpAdvQuiz_QuestionButton'));
                show(children(globalElements.questionList));
                reviewBox.toggle();

                hide(qsa($e, '.wpAdvQuiz_question_page'));
            },

            random: function (group) {
                toArr(group).forEach(function (el) {
                    shuffle(children(el)).forEach(function (c) {
                        el.appendChild(c);
                    });
                });
            },

            sortCategories: function () {
                var list = globalElements.questionList;
                if (!list) return;

                children(list).sort(function (a, b) {
                    var aId = data(questionListOf(a), 'question_id');
                    var bId = data(questionListOf(b), 'question_id');

                    return config.json[aId].catId - config.json[bId].catId;
                }).forEach(function (li) {
                    list.appendChild(li);
                });
            },

            restartQuiz: function () {
                hide(globalElements.results);
                show(globalElements.quizStartPage);
                hide(children(globalElements.questionList));
                hide(globalElements.toplistShowInButton);
                reviewBox.hide();

                resetInputs($e);

                qsa($e, '.wpAdvQuiz_answerCorrect, .wpAdvQuiz_answerIncorrect').forEach(function (el) {
                    el.classList.remove('wpAdvQuiz_answerCorrect', 'wpAdvQuiz_answerIncorrect');
                });

                qsa($e, '.wpAdvQuiz_listItem').forEach(function (li) {
                    li._waqCheck = false;
                });

                qsa($e, '.wpAdvQuiz_response').forEach(function (r) {
                    hide(r);
                    hide(children(r));
                });

                plugin.methode.resetMatrix(qsa($e, '.wpAdvQuiz_listItem'));

                qsa($e, '.wpAdvQuiz_sortStringItem, .wpAdvQuiz_sortable').forEach(function (el) {
                    el.removeAttribute('style');
                });

                hide(qsa($e, '.wpAdvQuiz_clozeCorrect, .wpAdvQuiz_QuestionButton, .wpAdvQuiz_resultsList > li'));

                show(qsa($e, '.wpAdvQuiz_question_page, input[name="tip"], input[name="skip"]'));

                qsa($e, '.wpAdvQuiz_resultForm').forEach(function (el) {
                    el.textContent = '';
                    hide(el);
                });

                hide(qs(globalElements.results, '.wpAdvQuiz_time_limit_expired'));

                var last = eq(globalElements.next, -1);
                if (last) last.value = lastButtonValue;

                inViewQuestions = false;
            },

            /**
             * Grade and reveal the answers for a list of questions (default: the current question).
             * @param list   li.wpAdvQuiz_listItem element or array
             * @param endCheck  true when grading on finish (does not emit questionSolved)
             */
            checkQuestion: function (list, endCheck) {
                list = (list === undefined) ? currentQuestion : list;

                toArr(list).forEach(function (li) {
                    var ql = questionListOf(li);
                    var qd = config.json ? config.json[data(ql, 'question_id')] : null;

                    questionTimer.questionStop();

                    if (!qd || li._waqCheck) {
                        return;
                    }

                    var name = (qd.type == 'single' || qd.type == 'multiple') ? 'singleMulti' : qd.type;
                    var result = checker(name, qd, li, ql);

                    show(qs(li, '.wpAdvQuiz_response'));
                    hide(qsa(li, globalNames.check));
                    hide(qsa(li, globalNames.skip));
                    show(qsa(li, globalNames.next));

                    results[qd.id].points = result.p;
                    results[qd.id].correct = Number(result.c);
                    results[qd.id].data = result.s;

                    results['comp'].points += result.p;

                    catResults[qd.catId] = (catResults[qd.catId] || 0) + result.p;

                    if (result.c) {
                        show(qs(li, '.wpAdvQuiz_correct'));
                        results['comp'].correctQuestions += 1;
                    } else {
                        show(qs(li, '.wpAdvQuiz_incorrect'));
                    }

                    setText(qsa(li, '.wpAdvQuiz_responsePoints'), result.p);

                    li._waqCheck = true;

                    if (!endCheck)
                        trigger('questionSolved', {
                            item: li,
                            index: index(li),
                            solved: true,
                            fake: true
                        });
                });
            },

            /**
             * "Practice" button: preview the answer of one question WITHOUT scoring it
             * (the original added points on every click, inflating the final score).
             * Click again to hide the answer and retry that question.
             */
            practiceQuestion: function (btn) {
                var li = btn.closest('.wpAdvQuiz_listItem');
                if (!li) return;

                var response = qs(li, '.wpAdvQuiz_response');

                if (response && isVisible(response)) {
                    hide(response);
                    hide(children(response));
                    resetInputs(li);
                    qsa(li, '.wpAdvQuiz_answerCorrect, .wpAdvQuiz_answerIncorrect').forEach(function (el) {
                        el.classList.remove('wpAdvQuiz_answerCorrect', 'wpAdvQuiz_answerIncorrect');
                    });
                    hide(qsa(li, '.wpAdvQuiz_clozeCorrect'));
                    return;
                }

                var ql = questionListOf(li);
                var qd = config.json ? config.json[data(ql, 'question_id')] : null;
                if (!qd) return;

                var name = (qd.type == 'single' || qd.type == 'multiple') ? 'singleMulti' : qd.type;
                var result = checker(name, qd, li, ql);

                hide(qsa(li, '.wpAdvQuiz_correct, .wpAdvQuiz_incorrect'));
                show(response);
                show(qs(li, result.c ? '.wpAdvQuiz_correct' : '.wpAdvQuiz_incorrect'));
                setText(qsa(li, '.wpAdvQuiz_responsePoints'), result.p);
            },

            // "Clear" button: clear the choices of the question containing the button (the original cleared
            // the whole quiz) and remove its "answered" mark in the review box.
            clearQuestion: function (btn) {
                var li = btn.closest('.wpAdvQuiz_listItem');

                if (!li) {
                    resetInputs($e);
                    return;
                }

                resetInputs(li);

                trigger('questionSolved', {
                    item: li,
                    index: index(li),
                    solved: false
                });
            },

            showTip: function (btn) {
                var li = btn.parentNode;
                var questionBox = children(li).filter(function (c) {
                    return c.classList.contains('wpAdvQuiz_question');
                })[0];
                var id = data(questionListOf(questionBox), 'question_id');

                toggle(children(li).filter(function (c) {
                    return c.classList.contains('wpAdvQuiz_tipp');
                }));

                if (results[id]) results[id].tip = 1;

                if (plugin._tipHandler) return;

                plugin._tipHandler = function (e) {
                    var tips = qsa($e, '.wpAdvQuiz_tipp');
                    var btns = qsa($e, 'input[name="tip"]');

                    var inTip = tips.some(function (t) {
                        return t.contains(e.target);
                    });

                    if (!inTip && btns.indexOf(e.target) < 0) {
                        hide(tips);
                        document.removeEventListener('mouseup', plugin._tipHandler);
                        plugin._tipHandler = null;
                    }
                };

                document.addEventListener('mouseup', plugin._tipHandler);
            },

            ajax: function (payload, success, error) {
                ajax(payload, success, error);
            },

            checkQuizLock: function () {
                quizStatus.loadLock = 1;

                ajax({
                    action: 'wp_adv_quiz_admin_ajax',
                    func: 'quizCheckLock',
                    data: {
                        quizId: config.quizId
                    }
                }, function (json) {
                    if (json.lock != undefined) {
                        quizStatus.isLocked = json.lock.is;

                        if (json.lock.pre) {
                            hide(qsa($e, 'input[name="restartQuiz"]'));
                        }
                    }

                    if (json.prerequisite != undefined) {
                        quizStatus.isPrerequisite = 1;
                        setText(qs($e, '.wpAdvQuiz_prerequisite span'), json.prerequisite);
                    }

                    if (json.startUserLock != undefined) {
                        quizStatus.isUserStartLocked = json.startUserLock;
                    }

                    quizStatus.loadLock = 0;

                    if (quizStatus.isQuizStart) {
                        plugin.methode.startQuiz();
                    }
                }, function () {
                    // Network error: unlock so the Start button does not hang
                    quizStatus.loadLock = 0;
                });
            },

            loadQuizData: function () {
                ajax({
                    action: 'wp_adv_quiz_admin_ajax',
                    func: 'loadQuizData',
                    data: {
                        quizId: config.quizId
                    }
                }, function (json) {
                    if (json.toplist) {
                        plugin.methode.handleToplistData(json.toplist);
                    }

                    if (json.averageResult != undefined) {
                        plugin.methode.setAverageResult(json.averageResult, true);
                    }
                });
            },

            setAverageResult: function (p, g) {
                var cell = qsa($e, '.wpAdvQuiz_resultValue')[g ? 0 : 1];
                if (!cell) return;

                var v = children(cell);

                setText(v[1], p + '%');
                if (v[0]) v[0].style.width = (240 * p / 100) + 'px';
            },

            handleToplistData: function (json) {
                var tp = qs($e, '.wpAdvQuiz_addToplist');
                if (!tp) return;

                var addBoxOuter = qs(tp, '.wpAdvQuiz_addBox');
                show(addBoxOuter);

                var addBox = children(addBoxOuter).filter(function (c) {
                    return c.nodeName === 'DIV';
                });

                if (json.canAdd) {
                    show(tp);
                    hide(qs(tp, '.wpAdvQuiz_addToplistMessage'));
                    show(qsa(tp, '.wpAdvQuiz_toplistButton'));

                    toplistData.token = json.token;
                    toplistData.isUser = 0;

                    if (json.userId) {
                        hide(addBox);
                        toplistData.isUser = 1;

                        if (bitOptions.isAddAutomatic) {
                            hide(tp);
                        }
                    } else {
                        show(addBox);

                        var captcha = addBox[0] ? children(addBox[0])[1] : null;

                        if (captcha) {
                            if (json.captcha) {
                                var pre = qs(captcha, 'input[name="wpAdvQuiz_captchaPrefix"]');
                                var img = qs(captcha, '.wpAdvQuiz_captchaImg');
                                var inp = qs(captcha, 'input[name="wpAdvQuiz_captcha"]');

                                if (pre) pre.value = json.captcha.code;
                                if (img) img.setAttribute('src', json.captcha.img);
                                if (inp) inp.value = '';

                                show(captcha);
                            } else {
                                hide(captcha);
                            }
                        }
                    }
                } else {
                    hide(tp);
                }
            },

            scrollTo: function (e, h) {
                e = toArr(e)[0];
                if (!e) return;

                var x = docTop(e) - 100;

                if (h || window.pageYOffset > x) {
                    smoothScrollTo(x);
                }
            },

            addToplist: function () {
                if (bitOptions.preview)
                    return;

                var msg = qs($e, '.wpAdvQuiz_addToplistMessage');
                var addBox = qs($e, '.wpAdvQuiz_addBox');

                setText(msg, globalCfg().loadData);
                show(msg);
                hide(addBox);

                var val = function (name) {
                    var el = qs(addBox, 'input[name="' + name + '"]');
                    return el ? el.value : '';
                };

                ajax({
                    action: 'wp_adv_quiz_admin_ajax',
                    func: 'addInToplist',
                    data: {
                        quizId: config.quizId,
                        token: toplistData.token,
                        name: val('wpAdvQuiz_toplistName'),
                        email: val('wpAdvQuiz_toplistEmail'),
                        captcha: val('wpAdvQuiz_captcha'),
                        prefix: val('wpAdvQuiz_captchaPrefix'),
                        points: results.comp.points,
                        totalPoints: config.globalPoints
                    }
                }, function (json) {
                    setText(msg, json.text);

                    if (json.clear) {
                        hide(addBox);
                        plugin.methode.updateToplist();
                    } else {
                        show(addBox);
                    }

                    if (json.captcha) {
                        var img = qs(addBox, '.wpAdvQuiz_captchaImg');
                        var pre = qs(addBox, 'input[name="wpAdvQuiz_captchaPrefix"]');
                        var inp = qs(addBox, 'input[name="wpAdvQuiz_captcha"]');

                        if (img) img.setAttribute('src', json.captcha.img);
                        if (pre) pre.value = json.captcha.code;
                        if (inp) inp.value = '';
                    }
                });
            },

            updateToplist: function () {
                if (typeof window.wpAdvQuiz_fetchToplist === 'function') {
                    window.wpAdvQuiz_fetchToplist();
                }
            },

            // Mark a question as "answered" when the user picks/types (bound once, event delegation)
            registerSolved: function () {
                $e.addEventListener('change', function (e) {
                    var t = e.target;
                    if (!t || !t.matches) return;

                    var p = t.closest('.wpAdvQuiz_listItem');
                    if (!p || !$e.contains(p)) return;

                    var s;

                    if (t.matches('.wpAdvQuiz_questionInput[type="text"]')) {
                        s = t.value != '';
                    } else if (t.matches('.wpAdvQuiz_questionList[data-type="single"] .wpAdvQuiz_questionInput, .wpAdvQuiz_questionList[data-type="assessment_answer"] .wpAdvQuiz_questionInput')) {
                        s = t.checked;
                    } else if (t.matches('.wpAdvQuiz_cloze input')) {
                        s = qsa(p, '.wpAdvQuiz_cloze input').every(function (i) {
                            return i.value != '';
                        });
                    } else if (t.matches('.wpAdvQuiz_questionList[data-type="multiple"] .wpAdvQuiz_questionInput')) {
                        s = qsa(p, '.wpAdvQuiz_questionList[data-type="multiple"] .wpAdvQuiz_questionInput').some(function (i) {
                            return i.checked;
                        });
                    } else {
                        return;
                    }

                    trigger('questionSolved', {
                        item: p,
                        index: index(p),
                        solved: s
                    });
                });
            },

            loadQuizDataAjax: function (quizStart) {
                ajax({
                    action: 'wp_adv_quiz_admin_ajax',
                    func: 'quizLoadData',
                    data: {
                        quizId: config.quizId
                    }
                }, function (json) {
                    config.globalPoints = json.globalPoints;
                    config.catPoints = json.catPoints;
                    config.json = json.json;

                    var oldQuiz = qs($e, '.wpAdvQuiz_quiz');
                    if (oldQuiz) oldQuiz.parentNode.removeChild(oldQuiz);

                    var anchor = qs($e, '.wpAdvQuiz_quizAnker');
                    if (anchor) {
                        anchor.insertAdjacentHTML('afterend', json.content);
                    } else {
                        $e.insertAdjacentHTML('beforeend', json.content);
                    }

                    loadGlobalElements();

                    plugin.methode.initQuiz();

                    if (quizStart)
                        plugin.methode.startQuiz(true);
                }, function () {
                    // Network error: go back to the start page so the user can retry
                    // (the old jQuery version stayed on "Quiz is loading..." forever).
                    hide(qs($e, '.wpAdvQuiz_loadQuiz'));
                    show(globalElements.quizStartPage);
                });
            },

            initQuiz: function () {
                plugin.methode.setClozeStyle();
            }
        };

        function notSolvedBlocked() {
            return bitOptions.forcingQuestionSolve && !quizSolved[index(currentQuestion)]
                && (bitOptions.quizSummeryHide || !bitOptions.reviewQustion);
        }

        // One click handler for the whole quiz (replaces the separate .click() bindings of the jQuery version).
        function onClick(e) {
            var t = e.target;

            // Question list on the "Quiz-summary" page: click a number to go back to that question
            var sumLi = t.closest('.wpAdvQuiz_checkPage ol > li');
            if (sumLi && $e.contains(sumLi)) {
                hide(qs($e, '.wpAdvQuiz_checkPage'));
                show(globalElements.quiz);
                reviewBox.show(true);

                plugin.methode.showQuestion(index(sumLi));
                return;
            }

            var btn = t.closest('input[name]');
            if (!btn || !$e.contains(btn)) return;

            switch (btn.name) {
                case 'startQuiz':
                    e.preventDefault();
                    plugin.methode.startQuiz();
                    break;
                case 'reShowQuestion':
                    plugin.methode.showQustionList();
                    break;
                case 'restartQuiz':
                    plugin.methode.restartQuiz();
                    break;
                case 'review':
                    plugin.methode.reviewQuestion();
                    break;
                case 'wpAdvQuiz_toplistAdd':
                    e.preventDefault();
                    plugin.methode.addToplist();
                    break;
                case 'quizSummary':
                    plugin.methode.showQuizSummary();
                    break;
                case 'endQuizSummary':
                    if (bitOptions.forcingQuestionSolve && !solvedAll()) {
                        alert(globalCfg().questionsNotSolved);
                        return;
                    }

                    if (bitOptions.formActivated && config.formPos == formPosConst.END && !formClass.checkForm())
                        return;

                    plugin.methode.finishQuiz();
                    break;
                case 'endInfopage':
                    if (formClass.checkForm())
                        plugin.methode.finishQuiz();
                    break;
                case 'showToplist':
                    hide(globalElements.quiz);
                    toggle(globalElements.toplistShowInButton);
                    break;
                case 'next':
                    if (notSolvedBlocked()) {
                        alert(globalCfg().questionNotSolved);
                        return;
                    }

                    plugin.methode.nextQuestion();
                    break;
                case 'back':
                    plugin.methode.prevQuestion();
                    break;
                case 'check':
                    if (notSolvedBlocked()) {
                        alert(globalCfg().questionNotSolved);
                        return;
                    }

                    plugin.methode.checkQuestion();
                    break;
                case 'checkSingle':
                    if (bitOptions.forcingQuestionSolve && (bitOptions.quizSummeryHide || !bitOptions.reviewQustion) && !solvedAll()) {
                        alert(globalCfg().questionsNotSolved);
                        return;
                    }

                    plugin.methode.showQuizSummary();
                    break;
                case 'tip':
                    plugin.methode.showTip(btn);
                    break;
                case 'clear':
                    plugin.methode.clearQuestion(btn);
                    break;
                case 'practice':
                    plugin.methode.practiceQuestion(btn);
                    break;
                case 'skip':
                    plugin.methode.skipQuestion();
                    break;
                case 'wpAdvQuiz_pageLeft':
                    plugin.methode.showSinglePage(currentPage - 1);
                    break;
                case 'wpAdvQuiz_pageRight':
                    plugin.methode.showSinglePage(currentPage + 1);
                    break;
            }
        }

        /**
         * @memberOf plugin
         */
        plugin.preInit = function () {
            plugin.methode.parseBitOptions();
            reviewBox.init();

            $e.addEventListener('click', onClick);
            bindSortable($e);
            plugin.methode.registerSolved();

            on('questionSolved', plugin.methode.questionSolved);

            if (bitOptions.checkBeforeStart && !bitOptions.preview) {
                plugin.methode.checkQuizLock();
            }

            if (!bitOptions.maxShowQuestion) {
                plugin.methode.initQuiz();
            }

            if (bitOptions.autoStart)
                plugin.methode.startQuiz();
        };

        plugin.on = on;

        plugin.preInit();
    }

    /* ------------------------------------------------------------------
     * Boot
     * ------------------------------------------------------------------ */

    function init(el, options) {
        if (typeof el === 'string') el = document.querySelector(el);
        if (!el || el._wpAdvQuizFront) return el ? el._wpAdvQuizFront : null;

        el._wpAdvQuizFront = new WpAdvQuizFront(el, options);
        return el._wpAdvQuizFront;
    }

    window.WpAdvQuizFront = {init: init};

    function boot() {
        var list = window.wpAdvQuizInitList = window.wpAdvQuizInitList || [];

        list.forEach(function (item) {
            init(item.id, item.init);
        });

        // Quizzes inserted after page load (e.g. content loaded via AJAX)
        list.push = function () {
            Array.prototype.forEach.call(arguments, function (item) {
                init(item.id, item.init);
            });
            return Array.prototype.push.apply(this, arguments);
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
