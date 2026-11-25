<?php

class WpAdvQuiz_View_InfoAdaptation extends WpAdvQuiz_View_View
{
    public function show()
    {
        ?>

        <div class="wrap">
            <h2><?php _e('WP-Adv-Quiz special modification', 'ct-pro-quiz-lite'); ?></h2>

            <p><?php _e('You need special WP-Adv-Quiz modification for your website?', 'ct-pro-quiz-lite'); ?></p>

            <h3><?php _e('We offer you:', 'ct-pro-quiz-lite'); ?></h3>
            <ol style="list-style-type: disc;">
                <li><?php _e('Design adaption for your theme', 'ct-pro-quiz-lite'); ?></li>
                <li><?php _e('Creation of additional modules for your needs', 'ct-pro-quiz-lite'); ?></li>
                <li style="display: none;"><?php _e('Premium Support', 'ct-pro-quiz-lite'); ?></li>
            </ol>

            <h3><?php _e('Contact us:', 'ct-pro-quiz-lite'); ?></h3>
            <ol style="list-style-type: disc;">
                
            </ol>

            <p>
                <?php _e('After receiving your e-mail we will verify your request on feasibility. After this you will receive e-mail from us with further details and offer.',
                    'ct-pro-quiz-lite'); ?>
            </p>

            <p>
                <?php _e('Extended support in first 6 months. Reported bugs and updates of WP Pro Quiz are supported. Exception are major releases (update of main version)',
                    'ct-pro-quiz-lite'); ?>
            </p>
        </div>

        <?php
    }
}