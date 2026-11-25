<?php

class WpAdvQuiz_Controller_Front
{

    /**
     * @var WpAdvQuiz_Model_GlobalSettings
     */
    private $_settings = null;

    /**
     * Shortcodes / block handled by the plugin. Assets are only loaded on pages that contain one of them.
     */
    const SHORTCODES = array('WpAdvQuiz', 'WpAdvQuiz_toplist');
    const BLOCK_NAME = 'wp-adv-quiz/quiz';

    public function __construct()
    {
        // Register early (priority 5) so shortcodes outside the post content (widgets, templates...)
        // can still enqueue while rendering; enqueue for real at the default priority when the post has a quiz.
        add_action('wp_enqueue_scripts', array($this, 'registerAssets'), 5);
        add_action('wp_enqueue_scripts', array($this, 'maybeEnqueueAssets'));
        add_shortcode('WpAdvQuiz', array($this, 'shortcode'));
        add_shortcode('WpAdvQuiz_toplist', array($this, 'shortcodeToplist'));
    }

    /**
     * Data for JS (WpAdvQuizGlobal). Shared by the quiz, the leaderboard and the admin Preview page.
     */
    public static function jsGlobals()
    {
        return array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'loadData' => __('Loading', 'ct-pro-quiz-lite'),
            'questionNotSolved' => __('You must answer this question.', 'ct-pro-quiz-lite'),
            'questionsNotSolved' => __('You must answer all questions before you can completed the quiz.',
                'ct-pro-quiz-lite'),
            'fieldsNotFilled' => __('All fields have to be filled.', 'ct-pro-quiz-lite')
        );
    }

    /**
     * Register (do not load yet) the frontend CSS and JS. The JS is plain JavaScript, no jQuery dependency.
     * Handle names are kept from the original so outside code can still dequeue/replace them.
     */
    public function registerAssets()
    {
        $data = array(
            'src' => plugins_url('css/wpAdvQuiz_front' . (WPADVQUIZ_DEV ? '' : '.min') . '.css', WPADVQUIZ_FILE),
            'deps' => array(),
            'ver' => WPADVQUIZ_VERSION,
        );

        $data = apply_filters('wpAdvQuiz_front_style', $data);

        wp_register_style('wpAdvQuiz_front_style', $data['src'], $data['deps'], $data['ver']);

        $footer = !$this->settings()->isJsLoadInHead();

        wp_register_script(
            'wpAdvQuiz_front_javascript',
            plugins_url('js/wpAdvQuiz_front.js', WPADVQUIZ_FILE),
            array(),
            self::assetVersion('js/wpAdvQuiz_front.js'),
            $footer
        );
        wp_localize_script('wpAdvQuiz_front_javascript', 'WpAdvQuizGlobal', self::jsGlobals());

        wp_register_script(
            'wpAdvQuiz_front_javascript_toplist',
            plugins_url('js/wpAdvQuiz_toplist.js', WPADVQUIZ_FILE),
            array(),
            self::assetVersion('js/wpAdvQuiz_toplist.js'),
            $footer
        );
        wp_localize_script('wpAdvQuiz_front_javascript_toplist', 'WpAdvQuizGlobal', self::jsGlobals());
    }

    /**
     * Version based on file modification time, so browsers/CDNs fetch new JS right after an edit.
     */
    public static function assetVersion($relative)
    {
        $file = WPADVQUIZ_PATH . '/' . $relative;

        return file_exists($file) ? WPADVQUIZ_VERSION . '.' . filemtime($file) : WPADVQUIZ_VERSION;
    }

    /**
     * Does the current post/page contain a quiz (shortcode or block in the content)?
     * Can be forced with the 'wpAdvQuiz_should_enqueue_assets' filter.
     *
     * @return array ['quiz' => bool, 'toplist' => bool]
     */
    private function detectInContent()
    {
        $found = array('quiz' => false, 'toplist' => false);

        if (is_singular()) {
            $post = get_queried_object();

            if ($post instanceof WP_Post) {
                $content = $post->post_content;

                $found['quiz'] = has_shortcode($content, 'WpAdvQuiz') || has_block(self::BLOCK_NAME, $post);
                $found['toplist'] = has_shortcode($content, 'WpAdvQuiz_toplist');
            }
        }

        return (array)apply_filters('wpAdvQuiz_should_enqueue_assets', $found) + $found;
    }

    public function maybeEnqueueAssets()
    {
        $found = $this->detectInContent();

        if ($found['quiz']) {
            $this->enqueueAssets(true, false);
        }

        if ($found['toplist']) {
            $this->enqueueAssets(false, true);
        }
    }

    /**
     * Enqueue CSS + JS. Safe to call repeatedly. The shortcode also calls this (fallback for shortcodes
     * outside the post content, e.g. in a widget): WordPress then prints the CSS in the footer.
     */
    private function enqueueAssets($quiz = true, $toplist = false)
    {
        wp_enqueue_style('wpAdvQuiz_front_style');

        if ($quiz) {
            wp_enqueue_script('wpAdvQuiz_front_javascript');
        }

        if ($toplist) {
            wp_enqueue_script('wpAdvQuiz_front_javascript_toplist');
        }
    }

    public function shortcode($attr)
    {
        $id = isset($attr[0]) ? $attr[0] : 0;
        $content = '';

        $this->enqueueAssets(true, false);

        if (is_numeric($id)) {
            ob_start();

            $this->handleShortCode($id);

            $content = ob_get_contents();

            ob_end_clean();
        }

        if ($this->settings()->isAddRawShortcode()) {
            return '[raw]' . $content . '[/raw]';
        }

        return $content;
    }

    public function handleShortCode($id)
    {
        $view = new WpAdvQuiz_View_FrontQuiz();

        $quizMapper = new WpAdvQuiz_Model_QuizMapper();
        $questionMapper = new WpAdvQuiz_Model_QuestionMapper();
        $categoryMapper = new WpAdvQuiz_Model_CategoryMapper();
        $formMapper = new WpAdvQuiz_Model_FormMapper();

        $quiz = $quizMapper->fetch($id);

        $maxQuestion = false;

        if ($quiz->isShowMaxQuestion() && $quiz->getShowMaxQuestionValue() > 0) {

            $value = $quiz->getShowMaxQuestionValue();

            if ($quiz->isShowMaxQuestionPercent()) {
                $count = $questionMapper->count($id);

                $value = ceil($count * $value / 100);
            }

            $question = $questionMapper->fetchAll($id, true, $value);
            $maxQuestion = true;

        } else {
            $question = $questionMapper->fetchAll($id);
        }
		
        if (empty($quiz) || empty($question)) {
			//echo '';
            return;
        }

        $view->quiz = $quiz;
        $view->question = $question;
        $view->category = $categoryMapper->fetchByQuiz($quiz->getId());
        $view->forms = $formMapper->fetch($quiz->getId());
		
		$mapper = new WpAdvQuiz_Model_GlobalSettingsMapper();
		$view->start_btn_width = $mapper->getButtonProperty('wpAdvQuiz_start_btn_width');
		$view->start_btn_height = $mapper->getButtonProperty('wpAdvQuiz_start_btn_height');
		$view->start_btn_color = $mapper->getButtonProperty('wpAdvQuiz_start_btn_color');
		
		$view->restart_btn_width = $mapper->getButtonProperty('wpAdvQuiz_restart_btn_width');
		$view->restart_btn_height = $mapper->getButtonProperty('wpAdvQuiz_restart_btn_height');
		$view->restart_btn_color = $mapper->getButtonProperty('wpAdvQuiz_restart_btn_color');
		
		$view->review_btn_width = $mapper->getButtonProperty('wpAdvQuiz_review_btn_width');
		$view->review_btn_height = $mapper->getButtonProperty('wpAdvQuiz_review_btn_height');
		$view->review_btn_color = $mapper->getButtonProperty('wpAdvQuiz_review_btn_color');

		$view->summary_btn_width = $mapper->getButtonProperty('wpAdvQuiz_summary_btn_width');
		$view->summary_btn_height = $mapper->getButtonProperty('wpAdvQuiz_summary_btn_height');
		$view->summary_btn_color = $mapper->getButtonProperty('wpAdvQuiz_summary_btn_color');

		$view->practice_btn_width = $mapper->getButtonProperty('wpAdvQuiz_practice_btn_width');
		$view->practice_btn_height = $mapper->getButtonProperty('wpAdvQuiz_practice_btn_height');
		$view->practice_btn_color = $mapper->getButtonProperty('wpAdvQuiz_practice_btn_color');
		
		$view->finish_btn_width = $mapper->getButtonProperty('wpAdvQuiz_finish_btn_width');
		$view->finish_btn_height = $mapper->getButtonProperty('wpAdvQuiz_finish_btn_height');
		$view->finish_btn_color = $mapper->getButtonProperty('wpAdvQuiz_finish_btn_color');
		
		$view->hint_btn_width = $mapper->getButtonProperty('wpAdvQuiz_hint_btn_width');
		$view->hint_btn_height = $mapper->getButtonProperty('wpAdvQuiz_hint_btn_height');
		$view->hint_btn_color = $mapper->getButtonProperty('wpAdvQuiz_hint_btn_color');
		
		$view->back_btn_width = $mapper->getButtonProperty('wpAdvQuiz_back_btn_width');
		$view->back_btn_height = $mapper->getButtonProperty('wpAdvQuiz_back_btn_height');
		$view->back_btn_color = $mapper->getButtonProperty('wpAdvQuiz_back_btn_color');

		$view->clear_btn_width = $mapper->getButtonProperty('wpAdvQuiz_clear_btn_width');
		$view->clear_btn_height = $mapper->getButtonProperty('wpAdvQuiz_clear_btn_height');
		$view->clear_btn_color = $mapper->getButtonProperty('wpAdvQuiz_clear_btn_color');
		
		$view->check_btn_width = $mapper->getButtonProperty('wpAdvQuiz_check_btn_width');
		$view->check_btn_height = $mapper->getButtonProperty('wpAdvQuiz_check_btn_height');
		$view->check_btn_color = $mapper->getButtonProperty('wpAdvQuiz_check_btn_color');
	
		$view->next_btn_width = $mapper->getButtonProperty('wpAdvQuiz_next_btn_width');
		$view->next_btn_height = $mapper->getButtonProperty('wpAdvQuiz_next_btn_height');
		$view->next_btn_color = $mapper->getButtonProperty('wpAdvQuiz_next_btn_color');
		
			$view->skip_btn_width = $mapper->getButtonProperty('wpAdvQuiz_skip_btn_width');
		$view->skip_btn_height = $mapper->getButtonProperty('wpAdvQuiz_skip_btn_height');
		$view->skip_btn_color = $mapper->getButtonProperty('wpAdvQuiz_skip_btn_color');
		
		$view->view_btn_width = $mapper->getButtonProperty('wpAdvQuiz_view_btn_width');
		$view->view_btn_height = $mapper->getButtonProperty('wpAdvQuiz_view_btn_height');
		$view->view_btn_color = $mapper->getButtonProperty('wpAdvQuiz_view_btn_color');

			$view->leaderboard_btn_width = $mapper->getButtonProperty('wpAdvQuiz_leaderboard_btn_width');
		$view->leaderboard_btn_height = $mapper->getButtonProperty('wpAdvQuiz_leaderboard_btn_height');
		$view->leaderboard_btn_color = $mapper->getButtonProperty('wpAdvQuiz_leaderboard_btn_color');
		
        if ($maxQuestion) {
            $view->showMaxQuestion();
        } else {
            $view->show();
        }
    }

    public function shortcodeToplist($attr)
    {
        $id = isset($attr[0]) ? $attr[0] : 0;
        $content = '';

        $this->enqueueAssets(false, true);

        if (is_numeric($id)) {
            ob_start();

            $this->handleShortCodeToplist($id, isset($attr['q']));

            $content = ob_get_contents();

            ob_end_clean();
        }

        if ($this->settings()->isAddRawShortcode() && !isset($attr['q'])) {
            return '[raw]' . $content . '[/raw]';
        }

        return $content;
    }

    /**
     * Maximum points of one attempt, shown as "maximum of X points" above the leaderboard.
     * The original always summed every question of the quiz, which is wrong when the quiz
     * only shows a random subset ("show only X questions" / "X percent"), upstream #85.
     *
     * @param WpAdvQuiz_Model_Quiz $quiz
     * @return int
     */
    public static function maxAttemptPoints($quiz)
    {
        $quizMapper = new WpAdvQuiz_Model_QuizMapper();
        $quizId = $quiz->getId();

        if ($quiz->isShowMaxQuestion() && $quiz->getShowMaxQuestionValue() > 0) {
            $value = $quiz->getShowMaxQuestionValue();

            if ($quiz->isShowMaxQuestionPercent()) {
                $questionMapper = new WpAdvQuiz_Model_QuestionMapper();
                $value = ceil($questionMapper->count($quizId) * $value / 100);
            }

            return (int)$quizMapper->sumTopQuestionPoints($quizId, (int)$value);
        }

        return (int)$quizMapper->sumQuestionPoints($quizId);
    }

    private function handleShortCodeToplist($quizId, $inQuiz = false)
    {
        $quizMapper = new WpAdvQuiz_Model_QuizMapper();
        $view = new WpAdvQuiz_View_FrontToplist();

        $quiz = $quizMapper->fetch($quizId);

        if ($quiz->getId() <= 0 || !$quiz->isToplistActivated()) {
            //echo '';

            return;
        }

        $view->quiz = $quiz;
        $view->points = self::maxAttemptPoints($quiz);
        $view->inQuiz = $inQuiz;
        $view->show();
    }

    /**
     * Global settings, read lazily (all options are autoloaded, so no extra query).
     *
     * @return WpAdvQuiz_Model_GlobalSettings
     */
    private function settings()
    {
        if ($this->_settings === null) {
            $mapper = new WpAdvQuiz_Model_GlobalSettingsMapper();

            $this->_settings = $mapper->fetchAll();
        }

        return $this->_settings;
    }

    public static function ajaxQuizLoadData($data)
    {
        $id = $data['quizId'];

        $view = new WpAdvQuiz_View_FrontQuiz();

        $quizMapper = new WpAdvQuiz_Model_QuizMapper();
        $questionMapper = new WpAdvQuiz_Model_QuestionMapper();
        $categoryMapper = new WpAdvQuiz_Model_CategoryMapper();
        $formMapper = new WpAdvQuiz_Model_FormMapper();

        $quiz = $quizMapper->fetch($id);

        if ($quiz->isShowMaxQuestion() && $quiz->getShowMaxQuestionValue() > 0) {

            $value = $quiz->getShowMaxQuestionValue();

            if ($quiz->isShowMaxQuestionPercent()) {
                $count = $questionMapper->count($id);

                $value = ceil($count * $value / 100);
            }

            $question = $questionMapper->fetchAll($id, true, $value);

        } else {
            $question = $questionMapper->fetchAll($id);
        }

        if (empty($quiz) || empty($question)) {
            return null;
        }

        $view->quiz = $quiz;
        $view->question = $question;
        $view->category = $categoryMapper->fetchByQuiz($quiz->getId());
        $view->forms = $formMapper->fetch($quiz->getId());
		
		$mapper = new WpAdvQuiz_Model_GlobalSettingsMapper();
		$view->start_btn_width = $mapper->getButtonProperty('wpAdvQuiz_start_btn_width');
		$view->start_btn_height = $mapper->getButtonProperty('wpAdvQuiz_start_btn_height');
		$view->start_btn_color = $mapper->getButtonProperty('wpAdvQuiz_start_btn_color');
		
		$view->restart_btn_width = $mapper->getButtonProperty('wpAdvQuiz_restart_btn_width');
		$view->restart_btn_height = $mapper->getButtonProperty('wpAdvQuiz_restart_btn_height');
		$view->restart_btn_color = $mapper->getButtonProperty('wpAdvQuiz_restart_btn_color');
		
		$view->review_btn_width = $mapper->getButtonProperty('wpAdvQuiz_review_btn_width');
		$view->review_btn_height = $mapper->getButtonProperty('wpAdvQuiz_review_btn_height');
		$view->review_btn_color = $mapper->getButtonProperty('wpAdvQuiz_review_btn_color');

		$view->summary_btn_width = $mapper->getButtonProperty('wpAdvQuiz_summary_btn_width');
		$view->summary_btn_height = $mapper->getButtonProperty('wpAdvQuiz_summary_btn_height');
		$view->summary_btn_color = $mapper->getButtonProperty('wpAdvQuiz_summary_btn_color');

		$view->finish_btn_width = $mapper->getButtonProperty('wpAdvQuiz_finish_btn_width');
		$view->finish_btn_height = $mapper->getButtonProperty('wpAdvQuiz_finish_btn_height');
		$view->finish_btn_color = $mapper->getButtonProperty('wpAdvQuiz_finish_btn_color');
		
		$view->hint_btn_width = $mapper->getButtonProperty('wpAdvQuiz_hint_btn_width');
		$view->hint_btn_height = $mapper->getButtonProperty('wpAdvQuiz_hint_btn_height');
		$view->hint_btn_color = $mapper->getButtonProperty('wpAdvQuiz_hint_btn_color');
		
		$view->back_btn_width = $mapper->getButtonProperty('wpAdvQuiz_back_btn_width');
		$view->back_btn_height = $mapper->getButtonProperty('wpAdvQuiz_back_btn_height');
		$view->back_btn_color = $mapper->getButtonProperty('wpAdvQuiz_back_btn_color');

		$view->check_btn_width = $mapper->getButtonProperty('wpAdvQuiz_check_btn_width');
		$view->check_btn_height = $mapper->getButtonProperty('wpAdvQuiz_check_btn_height');
		$view->check_btn_color = $mapper->getButtonProperty('wpAdvQuiz_check_btn_color');

		$view->next_btn_width = $mapper->getButtonProperty('wpAdvQuiz_next_btn_width');
		$view->next_btn_height = $mapper->getButtonProperty('wpAdvQuiz_next_btn_height');
		$view->next_btn_color = $mapper->getButtonProperty('wpAdvQuiz_next_btn_color');
		
			$view->skip_btn_width = $mapper->getButtonProperty('wpAdvQuiz_skip_btn_width');
		$view->skip_btn_height = $mapper->getButtonProperty('wpAdvQuiz_skip_btn_height');
		$view->skip_btn_color = $mapper->getButtonProperty('wpAdvQuiz_skip_btn_color');
		
		$view->view_btn_width = $mapper->getButtonProperty('wpAdvQuiz_view_btn_width');
		$view->view_btn_height = $mapper->getButtonProperty('wpAdvQuiz_view_btn_height');
		$view->view_btn_color = $mapper->getButtonProperty('wpAdvQuiz_view_btn_color');
		
			$view->leaderboard_btn_width = $mapper->getButtonProperty('wpAdvQuiz_leaderboard_btn_width');
		$view->leaderboard_btn_height = $mapper->getButtonProperty('wpAdvQuiz_leaderboard_btn_height');
		$view->leaderboard_btn_color = $mapper->getButtonProperty('wpAdvQuiz_leaderboard_btn_color');
		
        return json_encode($view->getQuizData());
    }
}