# Changelog

All notable changes to CT Pro Quiz Lite. The base is Advanced Quiz 1.0.4 (first commit of this repository).

## [1.0.0] - 2026-11-25

First release of CT Pro Quiz Lite, forked from Advanced Quiz 1.0.4 by Markus Begerow (itself derived from Wp-Pro-Quiz by Julius Fischer).

### Renamed
- Plugin name **CT Pro Quiz Lite**, folder and main file `ct-pro-quiz-lite`, text domain `ct-pro-quiz-lite`.
- Unchanged for compatibility: database tables, options, shortcodes `[WpAdvQuiz]` / `[WpAdvQuiz_toplist]`, block name `wp-adv-quiz/quiz`, PHP class names, script handles.
- If Advanced Quiz is active, the plugin stays inactive and shows an admin notice instead of crashing on duplicate classes.
- `Update URI` points to this repository, so WordPress never offers an unrelated update from wordpress.org.

### Frontend without jQuery
- `js/wpAdvQuiz_front.js` rewritten in plain JavaScript. It is ported from the shipped `wpAdvQuiz_front.min.js`, which, unlike the unminified source, contains the Clear and Practice buttons.
- `js/wpAdvQuiz_toplist.js` rewritten in plain JavaScript.
- jQuery UI Sortable and `jquery.ui.touch-punch` replaced by a small Pointer Events drag & drop (mouse and touch). A matrix criterion cell only accepts an item while empty, as before.
- `$.post` replaced by `fetch` with a `jQuery.param`-compatible encoder, so `$_POST['data'][...]` is unchanged.
- Inline boot code no longer uses `jQuery(document).ready()`. The "limited number of questions" mode used it and broke without jQuery. All modes now push to `window.wpAdvQuizInitList`.
- Late-inserted quizzes initialise automatically. New API `WpAdvQuizFront.init(el, options)`, and `wpAdvQuiz:*` DOM events.
- Removed `wpAdvQuiz_front.min.js`, `wpAdvQuiz_toplist.min.js`, `jquery.ui.touch-punch.min.js`. No build step; asset versions include the file modification time.
- Admin quiz preview uses the same script.

### Conditional loading
- CSS/JS are only enqueued when the viewed post contains `[WpAdvQuiz]`, `[WpAdvQuiz_toplist]` or the quiz block. Filter: `wpAdvQuiz_should_enqueue_assets`.
- Shortcode callbacks enqueue as a fallback (widgets, templates); WordPress prints the late CSS in the footer.
- The block registration no longer queries every quiz on each frontend request (only in admin/REST).
- Global settings are read lazily.

### Markup
- `<h4>` (Quiz-summary, Information, Results, Categories) and `<h5>` (Question, Sort elements, Hint) replaced by `<div class="wpAdvQuiz_header ...">`, with CSS for bold, larger text. Table-of-contents plugins no longer list them.
- The "questions completed" counter has its own class `.wpAdvQuiz_solvedCount`. The old selector (`span:eq(0)`) hit anchors injected by TOC plugins.
- Question label changed from `1. Question` to `Question 1`, which translates more naturally.

### Translations
- New `languages/ct-pro-quiz-lite.pot` (530 strings, generated with `wp i18n make-pot`).
- Vietnamese translation of all frontend strings (`ct-pro-quiz-lite-vi.po/.mo`). German translation kept and renamed.
- Translations load on `init` (avoids the WordPress 6.7 "loaded too early" notice).
- `tools/po2mo.py`: compile `.po` to `.mo` with plain Python.

### Fixed (bugs present in Advanced Quiz 1.0.4)
- Practice added the question's points on every click, inflating the final score, and did nothing in single-page mode. It now only previews the answer, and a second click hides it again.
- Clear reset every question in the quiz. It now resets only its own question and its "answered" mark.
- Review box scrollbar drag threw an error (`e.stopAdvpagation` typo). It now works with mouse and touch.
- `sortCategories` reordered all quizzes on the page instead of the current one.
- Elapsed time used `parseInt` on floats (`parseInt(8e-6) === 8`) and could show `08:00:00`.
- A network error while loading questions left the quiz on "Quiz is loading..." forever. A failed lock check could also block the Start button. Both now recover.
- Errors inside AJAX callbacks were swallowed; they now reach the console.
- Shuffling used `sort(() => random)` (biased). It now uses Fisher-Yates.

### Notes
- The "Touch library deactivate" setting no longer does anything.
- The CORS option (old IE only) is ignored.

### Tested
- PHP lint on PHP 8.1. Quiz markup rendered by the new view contains no heading tags.
- Browser test on a real post with two quizzes, with **every script removed, including jQuery**, and AJAX answered by a mock server:
  - start, AJAX question loading, timer, answering, review colours, Clear, quiz summary (jump back to a question), finish, results, average score;
  - leaderboard display and submission, restart and start again.
- Separate page covering every question type: multiple choice, free text, sorting (real mouse drag), matrix sorting (drag, occupied cell rejected), cloze, assessment.
- Back, Hint, Practice, Restart, and auto-finish when the time limit runs out.
- The `completedQuiz` payload uses the same nested `data[results][<id>][...]` format as the jQuery version.
