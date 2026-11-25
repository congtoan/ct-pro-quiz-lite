<?php
/**
 * CT Pro Quiz Lite
 *
 * A maintained fork of Advanced Quiz 1.0.4 by Markus Begerow
 * (https://wordpress.org/plugins/advanced-quiz/, https://github.com/markusbegerow/wp-adv-quiz),
 * which is itself derived from Wp-Pro-Quiz by Julius Fischer.
 *
 * @wordpress-plugin
 * Plugin Name: CT Pro Quiz Lite
 * Plugin URI: https://github.com/congtoan/ct-pro-quiz-lite
 * Description: Lightweight quiz plugin, forked from Advanced Quiz 1.0.4. jQuery-free frontend, assets only on pages with a quiz, no headings that pollute tables of contents, fully translatable frontend.
 * Version: 1.0.1
 * Requires at least: 5.0
 * Requires PHP: 5.6
 * Author: Cong Toan (fork), Markus Begerow (Advanced Quiz), Julius Fischer (Wp-Pro-Quiz)
 * Author URI: https://github.com/congtoan
 * Text Domain: ct-pro-quiz-lite
 * Domain Path: /languages
 * Update URI: https://github.com/congtoan/ct-pro-quiz-lite
 * License: GPL v2 or later
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 */

if (!defined('ABSPATH')) {
    exit;
}

// Same class names, tables and options as Advanced Quiz (so existing quizzes keep working),
// which means the two plugins must never run at the same time. If Advanced Quiz is active,
// stay inactive and tell the admin instead of crashing with "cannot redeclare class".
if (defined('WPADVQUIZ_VERSION') || class_exists('WpAdvQuiz_Controller_Front', false)) {
    add_action('admin_notices', function () {
        echo '<div class="notice notice-error"><p><strong>CT Pro Quiz Lite</strong> is not running because '
            . 'Advanced Quiz (WP-Adv-Quiz) is active. Deactivate Advanced Quiz first. Do <strong>not</strong> '
            . 'delete it from the Plugins screen: its uninstaller drops the quiz tables that CT Pro Quiz Lite '
            . 'shares. Remove its folder via FTP / file manager instead.</p></div>';
    });

    return;
}

define('CTPQL_VERSION', '1.0.1');

// Internal version used for asset cache busting and the upgrade check (kept under the legacy
// constant name because the inherited code uses it everywhere).
define('WPADVQUIZ_VERSION', CTPQL_VERSION);

define('WPADVQUIZ_DEV', false);

define('WPADVQUIZ_PATH', dirname(__FILE__));
define('WPADVQUIZ_URL', plugins_url('', __FILE__));
define('WPADVQUIZ_FILE', __FILE__);
define('WPADVQUIZ_PPATH', dirname(plugin_basename(__FILE__)));
define('WPADVQUIZ_PLUGIN_PATH', WPADVQUIZ_PATH . '/plugin');

$uploadDir = wp_upload_dir();

define('WPADVQUIZ_CAPTCHA_DIR', $uploadDir['basedir'] . '/wp_adv_quiz_captcha');
define('WPADVQUIZ_CAPTCHA_URL', $uploadDir['baseurl'] . '/wp_adv_quiz_captcha');

spl_autoload_register('wpAdvQuiz_autoload');

register_activation_hook(__FILE__, ['WpAdvQuiz_Helper_Upgrade', 'upgrade']);

add_action('plugins_loaded', 'wpAdvQuiz_pluginLoaded');
add_action('init', 'wpAdvQuiz_loadTextdomain', 1);


WpAdvQuiz_Helper_GutenbergBlock::init();

if (is_admin()) {
    new WpAdvQuiz_Controller_Admin();
} else {
    new WpAdvQuiz_Controller_Front();
}

function wpAdvQuiz_autoload($class)
{
    $c = explode('_', $class);

    if ($c === false || count($c) != 3 || $c[0] !== 'WpAdvQuiz') {
        return;
    }

    switch ($c[1]) {
        case 'View':
            $dir = 'view';
            break;
        case 'Model':
            $dir = 'model';
            break;
        case 'Helper':
            $dir = 'helper';
            break;
        case 'Controller':
            $dir = 'controller';
            break;
        case 'Plugin':
            $dir = 'plugin';
            break;
        default:
            return;
    }

    $classPath = WPADVQUIZ_PATH . '/lib/' . $dir . '/' . $class . '.php';
	
    if (file_exists($classPath)) {
        /** @noinspection PhpIncludeInspection */
        include_once $classPath;
    }

}

/**
 * Load translations. WordPress looks in this order:
 *   1. wp-content/languages/plugins/ct-pro-quiz-lite-{locale}.mo  (site override, survives plugin updates)
 *   2. wp-content/plugins/ct-pro-quiz-lite/languages/ct-pro-quiz-lite-{locale}.mo  (bundled)
 * Loaded on 'init' (WordPress 6.7+ warns when translations are loaded earlier).
 */
function wpAdvQuiz_loadTextdomain()
{
    load_plugin_textdomain('ct-pro-quiz-lite', false, WPADVQUIZ_PPATH . '/languages');
}

function wpAdvQuiz_pluginLoaded()
{
    if (get_option('wpAdvQuiz_version') !== WPADVQUIZ_VERSION) {
        WpAdvQuiz_Helper_Upgrade::upgrade();
    }
}

function wpAdvQuiz_achievementsV3()
{
    if (function_exists('achievements')) {
        achievements()->extensions->wp_adv_quiz = new WpAdvQuiz_Plugin_BpAchievementsV3();

        do_action('wpAdvQuiz_achievementsV3');
    }
}

add_action('dpa_ready', 'wpAdvQuiz_achievementsV3');

function wpAdvQuiz_myCred()
{
	$path = WPADVQUIZ_PATH . '/lib/' . 'plugin' . '/' . 'WpAdvQuiz_Plugin_myCredV1' . '.php';
	if(file_exists($path)) {
		include_once($path);
	}
}

add_action('plugins_loaded', 'wpAdvQuiz_myCred');