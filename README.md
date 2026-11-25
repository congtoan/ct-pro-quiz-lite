# CT Pro Quiz Lite

A lightweight, maintained quiz plugin for WordPress. It drops jQuery from the frontend, only loads its assets on pages that actually contain a quiz, and is fully translatable.

CT Pro Quiz Lite is a **fork of [Advanced Quiz](https://wordpress.org/plugins/advanced-quiz/) 1.0.4** by Markus Begerow ([GitHub](https://github.com/markusbegerow/wp-adv-quiz)). Advanced Quiz is itself a continuation of **Wp-Pro-Quiz** by Julius Fischer. All credit for the original quiz engine, admin screens, statistics and import/export goes to those authors. This fork keeps their work under the same GPL v2+ license.

- License: GPL v2 or later
- Requires WordPress 5.0+, PHP 5.6+
- Current version: 1.0.1 ([changelog](CHANGELOG.md))

## Why this fork exists

Advanced Quiz works, but it has not been updated by its author for a long time, and on a real, performance-sensitive site it causes problems that are hard to work around from the outside:

1. **It forces jQuery on every page.** The frontend controller calls `wp_enqueue_script('jquery')` on every request, whether or not the page has a quiz. On a site where the theme and the other plugins no longer need jQuery, this plugin alone keeps jQuery (and jQuery Migrate) loading site-wide. That costs Core Web Vitals on thousands of pages that never show a quiz.
2. **It loads its CSS everywhere too.** The quiz stylesheet is printed on every page. When a quiz is shown, it also pulls in jQuery UI Core, Mouse, Sortable and the touch-punch library, even for quizzes that only use single-choice questions.
3. **Its headings pollute tables of contents.** The quiz markup contains hidden `<h4>`/`<h5>` headings: "Quiz-summary", "Information", "Results", "Categories", "Question", "Hint". Table-of-contents plugins pick them up, so a post with two quizzes gets eight meaningless TOC entries ("1.1 Quiz-summary", "1.2 Information", ...). Some TOC plugins also inject an anchor `<span>` into those headings. That breaks the original script, which then writes the "questions completed" counter into the heading.
4. **The frontend cannot be translated in practice.** The bundled code uses the `wp-adv-quiz` text domain while the wordpress.org project is `advanced-quiz`. Community translations therefore never load, and quiz takers see English ("Start quiz", "Quiz-summary", "Clear"...) on non-English sites.
5. **Several frontend bugs.**
   - The "Practice" button adds points every time it is clicked, inflating the final score.
   - "Clear" wipes every question in the quiz instead of the current one.
   - The review box scrollbar cannot be dragged, because a search-and-replace during the rename turned `stopPropagation` into `stopAdvpagation`.
   - A network error while loading questions leaves the quiz stuck on "Quiz is loading..." forever.
6. **The shipped JavaScript does not match its source.** The minified file that is actually loaded contains features (Clear, Practice) that are missing from the unminified source, so the source cannot be safely edited and rebuilt.

## What is different in CT Pro Quiz Lite

### No jQuery on the frontend
- The quiz script and the leaderboard script are rewritten in plain JavaScript: no jQuery, no jQuery UI, no touch-punch. The port is based on the minified build that Advanced Quiz really ships, so Clear and Practice are included.
- Drag & drop for "sorting" and "matrix sorting" questions uses a small Pointer Events implementation that works with mouse and touch.
- AJAX uses `fetch`. Requests are encoded exactly like `jQuery.param()`, so the PHP side and the stored statistics are unchanged.
- The inline boot code no longer calls `jQuery(document).ready()`. Every quiz pushes its config to `window.wpAdvQuizInitList`. Quizzes inserted after page load initialise themselves.
- Public API for integrations: `WpAdvQuizFront.init(element, options)`, plus DOM events such as `wpAdvQuiz:questionSolved` and `wpAdvQuiz:changeQuestion` on the quiz element.

### Assets only where they are needed
- CSS and JS are enqueued only on posts/pages containing `[WpAdvQuiz]`, `[WpAdvQuiz_toplist]` or the quiz block. You can override this with the `wpAdvQuiz_should_enqueue_assets` filter.
- Shortcodes rendered outside the post content (widgets, templates) still work: the shortcode enqueues its own assets as a fallback.
- The quiz block no longer runs a database query on every frontend page view. The quiz list is only fetched in the editor.
- Script URLs carry the file modification time, so caches pick up new versions immediately.

### Clean markup
- Section titles inside the quiz are bold `<div class="wpAdvQuiz_header">` elements instead of `<h4>`/`<h5>`. Table-of-contents plugins ignore them, and the page outline stays meaningful.
- The quiz title (`<h2>`, when not hidden) is kept, because it is real content.

### Translatable frontend
- Own text domain `ct-pro-quiz-lite`, loaded on `init`. Fresh `languages/ct-pro-quiz-lite.pot` with all 530 strings.
- Ships with a complete **Vietnamese** translation of everything quiz takers see. The existing German translation is kept.
- `tools/po2mo.py` compiles `.po` to `.mo` with plain Python, no gettext or Poedit needed.

### Bug fixes
- "Practice" shows the answer of one question without scoring it; click again to retry.
- "Clear" only clears the question it belongs to and resets its "answered" mark.
- The review box scrollbar can be dragged (mouse and touch).
- After a network error the quiz goes back to the start page instead of hanging.
- "Sort by category" only reorders the current quiz, not every quiz on the page.
- Random order uses a proper Fisher-Yates shuffle.
- Very short times no longer display as "08:00:00".

## Compatibility with Advanced Quiz

CT Pro Quiz Lite uses **the same database tables, options, shortcodes and block name** as Advanced Quiz 1.0.4. Existing quizzes, questions, statistics and leaderboards keep working without migration.

Because the PHP class names are also the same, **the two plugins must not be active at the same time**. If Advanced Quiz is active, CT Pro Quiz Lite stays inactive and shows a notice.

### Switching from Advanced Quiz

1. Install CT Pro Quiz Lite (upload the zip from the [releases](https://github.com/congtoan/ct-pro-quiz-lite/releases), or copy the `ct-pro-quiz-lite` folder to `wp-content/plugins/`).
2. **Deactivate** Advanced Quiz.
3. Activate CT Pro Quiz Lite.
4. Clear your page cache.

> ⚠️ **Do not click "Delete" on Advanced Quiz in the Plugins screen.** Its uninstaller drops the quiz tables and options, and CT Pro Quiz Lite uses the same ones. If you want to remove the old plugin, delete the `wp-content/plugins/advanced-quiz` folder via FTP or your host's file manager instead.

> The same applies to CT Pro Quiz Lite itself: deleting it from the Plugins screen removes all quiz data, exactly like the original.

### Notes
- The "Touch library deactivate" setting no longer has any effect, because there is no touch library anymore.
- The legacy "CORS" option is ignored. It only existed for old Internet Explorer through `jQuery.support.cors`.
- Some admin screens still mention "WP-Adv-Quiz" in their texts. Those strings are kept for now so existing translations keep matching.

## Translating

1. Copy `languages/ct-pro-quiz-lite.pot` to `ct-pro-quiz-lite-{locale}.po` (for example `ct-pro-quiz-lite-fr_FR.po`) and translate it with Poedit or any editor.
2. Compile it:
   ```
   python tools/po2mo.py languages/ct-pro-quiz-lite-fr_FR.po
   ```
3. Put the `.mo` either in the plugin's `languages/` folder, or in `wp-content/languages/plugins/` (this one survives plugin updates).

Pull requests with new translations are welcome.

## Shortcodes

| Shortcode | Purpose |
|---|---|
| `[WpAdvQuiz 1]` | Show quiz with ID 1 |
| `[WpAdvQuiz_toplist 1]` | Show the leaderboard of quiz 1 |

The Gutenberg block "CT Pro Quiz Lite" inserts the same shortcode.

## Development

There is no build step. The files in `js/` and `css/` are loaded as they are.

| File | Role |
|---|---|
| `ct-pro-quiz-lite.php` | Bootstrap, autoloader, translations |
| `lib/controller/WpAdvQuiz_Controller_Front.php` | Asset registration, conditional loading, shortcodes |
| `lib/view/WpAdvQuiz_View_FrontQuiz.php` | Quiz markup |
| `js/wpAdvQuiz_front.js` | Quiz logic (plain JS) |
| `js/wpAdvQuiz_toplist.js` | Leaderboard (plain JS) |
| `css/wpAdvQuiz_front.min.css` | Stylesheet that is loaded (`wpAdvQuiz_front.css` is the readable copy; keep both in sync) |

The first commit of this repository is the unmodified Advanced Quiz 1.0.4 code, so `git diff` against it shows every change made by this fork.

## Credits

- **Wp-Pro-Quiz** by Julius Fischer: the original plugin.
- **Advanced Quiz (WP-Adv-Quiz)** by Markus Begerow: continuation of Wp-Pro-Quiz, the base of this fork. <https://wordpress.org/plugins/advanced-quiz/>, <https://github.com/markusbegerow/wp-adv-quiz>
- **CT Pro Quiz Lite** by Cong Toan: jQuery-free frontend, conditional loading, markup and translation work, bug fixes.

## License

GPL v2 or later. See [LICENSE](LICENSE).
