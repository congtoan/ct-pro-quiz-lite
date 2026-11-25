<?php

class WpAdvQuiz_View_WaqSupport extends WpAdvQuiz_View_View
{

    public function show()
    {
        ?>

        <div class="wrap">
            <h2><?php _e('Support Wp-Adv-Quiz', 'ct-pro-quiz-lite'); ?></h2>

            <h3><?php _e('Donate', 'ct-pro-quiz-lite'); ?></h3>

            <a class="button" style="background-color: #ffb735;font-weight: bold;" target="_blank" href="https://www.paypal.com/donate?hosted_button_id=7EL8K7ELFWHSY"><?php _e('PayPal Donate', 'ct-pro-quiz-lite'); ?></a>

            <p>
                <?php _e('WP-Adv-Quiz is small but nice free quiz plugin for WordPress.', 'ct-pro-quiz-lite'); ?> <br>
                <?php _e('Your donations can help to ensure that the project continues to remain free.',
                    'ct-pro-quiz-lite'); ?>
            </p>

            <h3>Wp-Adv-Quiz on Github</h3>

            <a class="button" target="_blank" href="https://github.com/markusbegerow/Wp-Adv-Quiz"><?php _e('Wp-Adv-Quiz on Github', 'ct-pro-quiz-lite'); ?></a>

            <h3 style="margin-top: 20px;"><?php _e('Translate Wp-Adv-Quiz', 'ct-pro-quiz-lite'); ?></h3>
            <p>
                <?php _e('To translate WP-Adv-Quiz, please follow these steps:', 'ct-pro-quiz-lite'); ?>
            </p>

            <ul style="list-style: decimal; padding: 0 22px;">
                <li><?php _e('Login to your account on wordpress.org (or create an account if you don’t have one yet).', 'ct-pro-quiz-lite'); ?></li>
                <li><?php _e('Go to https://translate.wordpress.org.', 'ct-pro-quiz-lite'); ?></li>
                <li><?php _e('Select your language and click ‘Contribute Translation’.', 'ct-pro-quiz-lite'); ?></li>
                <li><?php _e('Go to the Plugins tab and search for ‘Wp-Adv-Quiz’.', 'ct-pro-quiz-lite'); ?></li>
                <li><?php _e('Select the plugin and start translating!', 'ct-pro-quiz-lite'); ?></li>
            </ul>

        </div>

        <?php
    }
}
