=== CT Pro Quiz Lite ===
Contributors: congtoan
Tags: quiz, test, elearning, exam, assessment
Requires at least: 5.0
Tested up to: 6.7
Stable tag: 1.0.1
Requires PHP: 5.6
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Lightweight quiz plugin, forked from Advanced Quiz 1.0.4: no jQuery on the frontend, assets only on pages with a quiz, translatable.

== Description ==

CT Pro Quiz Lite is a maintained fork of Advanced Quiz 1.0.4 by Markus Begerow (https://wordpress.org/plugins/advanced-quiz/), which itself continues Wp-Pro-Quiz by Julius Fischer.

Advanced Quiz is no longer updated by its author. This fork addresses the following problems:

* jQuery and the quiz CSS are no longer loaded on every page.
* The frontend no longer needs jQuery / jQuery UI.
* No hidden headings that end up in tables of contents.
* The frontend can be translated.
* Several frontend bugs are fixed.

Existing quizzes, statistics and leaderboards keep working: tables, options and shortcodes are the same.

= Highlights =

* Plain JavaScript frontend (no jQuery, no jQuery UI, no touch-punch); drag & drop with Pointer Events (mouse and touch).
* CSS/JS only on posts that contain `[WpAdvQuiz]`, `[WpAdvQuiz_toplist]` or the quiz block.
* Section titles are bold divs instead of h4/h5, so table-of-contents plugins ignore them.
* Own text domain `ct-pro-quiz-lite`, full POT file, Vietnamese and German translations.
* Bug fixes: Practice no longer inflates scores, Clear only clears its own question, review scrollbar drag works, recovery from network errors.

= Question types =

Single choice, multiple choice, sorting, free text, matrix sorting, cloze, assessment.

Full documentation and source: https://github.com/congtoan/ct-pro-quiz-lite

== Installation ==

1. Upload the `ct-pro-quiz-lite` folder to `/wp-content/plugins/`.
2. If Advanced Quiz is installed, **deactivate** it (do not delete it from the Plugins screen: its uninstaller drops the shared quiz tables).
3. Activate CT Pro Quiz Lite.

== Changelog ==

= 1.0.1 =
* Fix apostrophes and symbols shown as HTML codes (&#8217;) when questions load via AJAX.
* Button styles: no more empty "!important" inline styles; per-button CSS classes.
* Leaderboard "maximum points" respects "show only X questions".
* New filters wpAdvQuiz_quiz_name and wpAdvQuiz_form_field_name.

= 1.0.0 =
* First release, forked from Advanced Quiz 1.0.4. See CHANGELOG.md for details.
