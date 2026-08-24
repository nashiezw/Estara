# Estara Connect for WordPress

Install the `estara-connect` folder as a WordPress plugin, then add an Estara API base, API key and webhook signing secret under Settings -> Estara Connect.

The plugin includes:

- `[estara_properties]` shortcode for displaying Estara listings.
- Authenticated requests to `/api/v1/properties`.
- A signed webhook receiver at `/wp-json/estara/v1/webhook`.
- A WordPress-safe HMAC verification example using `hash_equals`.

Use an Estara credential with only the scopes required by the site, and configure IP allowlisting in Estara when the WordPress host has stable outbound IP addresses.
