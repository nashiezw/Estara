<?php
/**
 * Plugin Name: Estara Connect
 * Description: Official Estara connector for publishing properties and receiving signed Estara webhooks.
 * Version: 1.0.0
 * Author: Estara
 */

if (!defined('ABSPATH')) { exit; }

const ESTARA_CONNECT_OPTION = 'estara_connect_settings';

function estara_connect_settings() {
  return wp_parse_args(get_option(ESTARA_CONNECT_OPTION, []), [
    'api_base' => 'https://app.estara.co.zw',
    'api_key' => '',
    'webhook_secret' => '',
  ]);
}

add_action('admin_menu', function () {
  add_options_page('Estara Connect', 'Estara Connect', 'manage_options', 'estara-connect', 'estara_connect_settings_page');
});

add_action('admin_init', function () {
  register_setting('estara_connect', ESTARA_CONNECT_OPTION, [
    'sanitize_callback' => function ($value) {
      return [
        'api_base' => esc_url_raw($value['api_base'] ?? 'https://app.estara.co.zw'),
        'api_key' => sanitize_text_field($value['api_key'] ?? ''),
        'webhook_secret' => sanitize_text_field($value['webhook_secret'] ?? ''),
      ];
    },
  ]);
});

function estara_connect_settings_page() {
  $settings = estara_connect_settings(); ?>
  <div class="wrap">
    <h1>Estara Connect</h1>
    <form method="post" action="options.php">
      <?php settings_fields('estara_connect'); ?>
      <table class="form-table" role="presentation">
        <tr><th scope="row"><label for="estara_api_base">API base</label></th><td><input id="estara_api_base" class="regular-text" name="<?php echo esc_attr(ESTARA_CONNECT_OPTION); ?>[api_base]" value="<?php echo esc_attr($settings['api_base']); ?>"></td></tr>
        <tr><th scope="row"><label for="estara_api_key">API key</label></th><td><input id="estara_api_key" class="regular-text" type="password" name="<?php echo esc_attr(ESTARA_CONNECT_OPTION); ?>[api_key]" value="<?php echo esc_attr($settings['api_key']); ?>"></td></tr>
        <tr><th scope="row"><label for="estara_webhook_secret">Webhook secret</label></th><td><input id="estara_webhook_secret" class="regular-text" type="password" name="<?php echo esc_attr(ESTARA_CONNECT_OPTION); ?>[webhook_secret]" value="<?php echo esc_attr($settings['webhook_secret']); ?>"></td></tr>
      </table>
      <?php submit_button('Save Estara settings'); ?>
    </form>
  </div>
<?php }

function estara_connect_request($path, $args = []) {
  $settings = estara_connect_settings();
  $headers = array_merge(['Accept' => 'application/json'], $args['headers'] ?? []);
  if ($settings['api_key']) { $headers['Authorization'] = 'Bearer ' . $settings['api_key']; }
  return wp_remote_request(rtrim($settings['api_base'], '/') . $path, array_merge($args, ['headers' => $headers, 'timeout' => 20]));
}

add_shortcode('estara_properties', function ($atts) {
  $response = estara_connect_request('/api/v1/properties');
  if (is_wp_error($response)) { return '<p>Properties are temporarily unavailable.</p>'; }
  $body = json_decode(wp_remote_retrieve_body($response), true);
  $rows = $body['data'] ?? [];
  if (!$rows) { return '<p>No properties are available yet.</p>'; }
  $html = '<div class="estara-properties">';
  foreach ($rows as $row) {
    $html .= '<article class="estara-property"><h3>' . esc_html($row['title'] ?? 'Property') . '</h3><p>' . esc_html($row['location'] ?? '') . '</p></article>';
  }
  return $html . '</div>';
});

add_action('rest_api_init', function () {
  register_rest_route('estara/v1', '/webhook', [
    'methods' => 'POST',
    'permission_callback' => '__return_true',
    'callback' => function (WP_REST_Request $request) {
      $settings = estara_connect_settings();
      $raw = $request->get_body();
      $header = $request->get_header('x-estara-signature');
      $expected = 'sha256=' . hash_hmac('sha256', $raw, $settings['webhook_secret']);
      if (!$settings['webhook_secret'] || !hash_equals($expected, $header)) {
        return new WP_REST_Response(['error' => 'Invalid Estara signature.'], 401);
      }
      do_action('estara_connect_webhook', json_decode($raw, true));
      return ['received' => true];
    },
  ]);
});
