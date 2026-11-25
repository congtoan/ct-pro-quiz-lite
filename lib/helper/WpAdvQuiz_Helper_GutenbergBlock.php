<?php

class WpAdvQuiz_Helper_GutenbergBlock
{
    public function __construct()
    {
        $this->addHooks();
    }

    protected function addHooks()
    {
        if (function_exists('register_block_type')) {
            add_action('init', [$this, 'initHook']);
        }
    }

    public function initHook() {
        $this->registerScripts();
        $this->registerBlock();
    }

    protected function registerScripts()
    {
        $data = array(
            'src' => plugins_url('css/wpAdvQuiz_front' . (WPADVQUIZ_DEV ? '' : '.min') . '.css', WPADVQUIZ_FILE),
            'deps' => array(),
            'ver' => WPADVQUIZ_VERSION,
        );

        wp_register_style('wpAdvQuiz_block-style', $data['src'], $data['deps'], $data['ver']);

        wp_register_script(
            'wpAdvQuiz-block-js',
            plugins_url('js/wpAdvQuiz_block.js', WPADVQUIZ_FILE),
            ['jquery', 'wp-blocks', 'wp-i18n', 'wp-element', 'wp-components', 'wp-editor'],
            WPADVQUIZ_VERSION, true
        );
    }

    protected function registerBlock()
    {
        $results = [];

        // The quiz list is only needed by the block editor (admin / REST).
        // Skipped on the frontend to avoid an extra SELECT on every page view.
        $mapper = new WpAdvQuiz_Model_QuizMapper();
        $quizzes = self::isEditorContext() ? $mapper->fetchAll() : [];

        foreach ($quizzes as $quiz) {
            $results[] = [
                'id' => $quiz->getId(),
                'title' => $quiz->getName(),
            ];
        }

         register_block_type('wp-adv-quiz/quiz', [
            'editor_script' => 'wpAdvQuiz-block-js',
            'editor_style' => 'wpAdvQuiz_block-style',
            'render_callback'   => [$this, 'renderRequest'],
            'attributes'	    => array(
                'idner' => $results,
                'metaFieldValue' => array(
                    'type'  => 'integer',
                ),
                'shortcode' => array(
                    'type'  => 'string',
                ),
                'className' => array(
                    'type'  => 'string',
                ),
            ),
        ]); 
    }

    public function renderRequest($attributes)
    {
        $html = '<p style="text-align:center;">' . __('Please select quiz') . '</p>';

         if(isset($attributes['shortcode']) && $attributes['shortcode'] != '') {
            $html = do_shortcode( $attributes['shortcode'] );
        } 

        return $html;
    }

    protected static function isEditorContext()
    {
        if (is_admin()) {
            return true;
        }

        $uri = isset($_SERVER['REQUEST_URI']) ? (string)$_SERVER['REQUEST_URI'] : '';

        return strpos($uri, '/wp-json/') !== false || isset($_GET['rest_route']);
    }

    public static function init()
    {
        return new self();
    } 
} 
