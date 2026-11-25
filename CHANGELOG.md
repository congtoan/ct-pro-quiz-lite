# Changelog

All notable changes to CT Pro Quiz Lite. The base is Advanced Quiz 1.0.4 (first commit of this repository).

## [1.0.1] - 2026-11-25

Small fixes for issues reported on the original Advanced Quiz repository.

### Fixed
- **Apostrophes and symbols shown as HTML codes** (`&#8217;`, `&#039;`, `&#247;`...) whenever questions are loaded via AJAX ("show only X questions" mode). The AJAX handler passed its JSON through `filter_var(..., FILTER_FLAG_ENCODE_AMP)`, turning `&#8217;` into `&amp;#8217;`. The JSON is now sent untouched, with a `application/json` content type. Upstream [#24](https://github.com/markusbegerow/wp-adv-quiz/issues/24), [#43](https://github.com/markusbegerow/wp-adv-quiz/issues/43), [#74](https://github.com/markusbegerow/wp-adv-quiz/issues/74), [#84](https://github.com/markusbegerow/wp-adv-quiz/issues/84).
- **Button styles could not be overridden** by the theme. Every button printed `width:px !Important; height:px !Important; background-color: !important`, even when nothing was configured (invalid CSS). Now only the values set in the plugin's button settings are printed. Upstream [#75](https://github.com/markusbegerow/wp-adv-quiz/issues/75), [#85](https://github.com/markusbegerow/wp-adv-quiz/issues/85).
- **Leaderboard "maximum of X points"** summed every question of the quiz, even when only a random subset is shown. It now uses the best score one attempt can reach: the sum of the X highest question points. Upstream [#85](https://github.com/markusbegerow/wp-adv-quiz/issues/85).
- Stray `"` after the "Restart quiz" button's style attribute.

### Added
- Per-button CSS classes `wpAdvQuiz_button_<name>`, for example `wpAdvQuiz_button_startQuiz`, `wpAdvQuiz_button_next` and `wpAdvQuiz_button_restartQuiz`, so themes can style each button.
- Filters `wpAdvQuiz_quiz_name` (`$name, $quiz`) and `wpAdvQuiz_form_field_name` (`$name, $form, $quiz`), so multilingual plugins or custom code can translate the quiz title and custom field labels. Upstream [#83](https://github.com/markusbegerow/wp-adv-quiz/issues/83), [#85](https://github.com/markusbegerow/wp-adv-quiz/issues/85).

### Already fixed in 1.0.0 (for reference)
- Upstream [#49](https://github.com/markusbegerow/wp-adv-quiz/issues/49) (CSS and queries on every page)
- Upstream [#86](https://github.com/markusbegerow/wp-adv-quiz/issues/86) (several quizzes on one page fail in `sortCategories`)
- Upstream [#10](https://github.com/markusbegerow/wp-adv-quiz/issues/10), [#11](https://github.com/markusbegerow/wp-adv-quiz/issues/11), [#76](https://github.com/markusbegerow/wp-adv-quiz/issues/76) (translations not loading)

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
