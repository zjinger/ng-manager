import type { languages } from 'monaco-editor';

/**
 * Register nginx language with Monaco editor.
 * Must be called after Monaco is loaded (nz-code-editor triggers Monaco lazy load).
 */
export function registerNginxLanguage(): void {
  const w = window as any;
  if (!w.monaco) return;

  const monaco = w.monaco;
  if (monaco.languages.getLanguages().some((l: any) => l.id === 'nginx')) return;

  monaco.languages.register({ id: 'nginx', extensions: ['.conf'], aliases: ['Nginx'] });

  monaco.languages.setMonarchTokensProvider('nginx', {
    tokenizer: {
      root: [
        // Comments
        [/#.*$/, 'comment'],
        // Section blocks
        [/^\s*(http|server|events|stream|upstream|location|map|geo|types|if|in|limit_except|split_clients|match)\b/, 'keyword.control'],
        // Directive keywords (common nginx directives)
        [
          /\b(root|index|try_files|alias|return|rewrite|proxy_pass|fastcgi_pass|scgi_pass|uwsgi_pass|include|set|add_header|expires|proxy_set_header|fastcgi_param|listen|server_name|error_page|default_server|upstream|zone|least_conn|ip_hash|keepalive|keepalive_requests|keepalive_timeout|worker_processes|worker_connections|use|multi_accept|accept_mutex|sendfile|tcp_nopush|tcp_nodelay|reset_timedout|resolver|resolver_timeout|client_max_body_size|client_body_buffer|gzip|gunzip|gzip_types|gzip_comp_level|gzip_vary|open_file_cache|open_file_cache_valid|open_file_cache_min_uses|log_format|access_log|error_log|pid|user|group|daemon|master_process|worker_rlimit_nofile|worker_rlimit_core|worker_shutdown|load_module|types|default_type|server_tokens|aio|directio|sendfile_max_chunk|proxy_buffering|proxy_buffer_size|proxy_buffers|proxy_busy_buffers_size|proxy_temp_path|proxy_temp_file_write_size|fastcgi_buffer_size|fastcgi_buffers|fastcgi_busy_buffers_size|fastcgi_temp_path|fastcgi_temp_file_write_size|fastcgi_cache|fastcgi_cache_key|fastcgi_cache_path|fastcgi_cache_valid|fastcgi_cache_use_stale|fastcgi_no_cache|fastcgi_cache_bypass|fastcgi_ignore_headers|fastcgi_intercept_errors|fastcgi_next_upstream|fastcgi_next_upstream_tries|fastcgi_connect_timeout|fastcgi_send_timeout|fastcgi_read_timeout|proxy_connect_timeout|proxy_send_timeout|proxy_read_timeout|proxy_ignore_client_abort|proxy_hide_header|proxy_pass_header|proxy_redirect|proxy_cookie_domain|proxy_cookie_path|proxy_set_header|proxy_http_version|proxy_force_ranges|proxy_cache|proxy_cache_key|proxy_cache_path|proxy_cache_valid|proxy_cache_use_stale|proxy_cache_background_update|proxy_cache_lock|proxy_cache_lock_timeout|proxy_no_cache|proxy_cache_bypass|proxy_ignore_headers|proxy_intercept_errors|proxy_next_upstream|proxy_next_upstream_tries|proxy_next_upstream_timeout|proxy_store|proxy_store_access|auth_basic|auth_basic_user_file|satisfy|allow|deny|limit_req|limit_req_zone|limit_req_status|limit_conn|limit_conn_zone|limit_conn_status|return|rewrite|break|set|if|set_by_lua|access_by_lua|content_by_lua|header_filter_by_lua|body_filter_by_lua|log_by_lua|rewrite_by_lua|init_by_lua|init_worker_by_lua|ssl_certificate|ssl_certificate_key|ssl_session_cache|ssl_session_timeout|ssl_protocols|ssl_ciphers|ssl_prefer_server_ciphers|ssl_verify_client|ssl_client_certificate|ssl_trusted_certificate|ssl_crl|real_ip_header|set_real_ip_from|geo|geoip_country|geoip_city|memcached_pass|memcached_connect_timeout|memcached_send_timeout|memcached_read_timeout|grpc_pass|grpc_connect_timeout|grpc_send_timeout|grpc_read_timeout|grpc_buffer_size|websocket|websocket_connect_timeout|websocket_send_timeout|websocket_read_timeout|websocket_ping_interval|websocket_ping_timeout|concat|concat_types|secure_link|secure_link_md5|add_before_body|add_after_body|addition_types|image_filter|xslt_stylesheet|xslt_types|random_index|geo|map|perl|perl_modules|perl_require|perl_handler|slice|mp4|mp4_buffer_size|mp4_max_buffer_size|flv|ogmp|status|status_format|check|check_http_send|check_http_expect_alive|check_shm_size|check_status|upstream_conf|js_set|js_content|js_header_filter_by_lua|js_body_filter_by_lua|js_log_by_lua|js_access_by_lua|js_content_by_lua|js_rewrite_by_lua|js_preread_by_lua|influxdb|set_|add_|proxy_|fastcgi_|uwsgi_|scgi_|grpc_|limit_|auth_|secure_|websocket_|ssl_|real_|memcached_|grpc_|proxy_next_upstream_tries|proxy_next_upstream_timeout)\b/,
          'keyword.directive',
        ],
        // Boolean/keyword values
        [/\b(on|off|yes|no|true|false|default|none|any|auto|inline|upstream|down|backup|weight|max_fails|fail_timeout)\b/, 'keyword.value'],
        // Numbers (with size units)
        [/\b\d+[kKmMgG]?\b/, 'number'],
        // Strings
        [/"[^"]*"/, 'string'],
        [/'[^']*'/, 'string'],
        // Variables
        [/\$[a-zA-Z_][a-zA-Z0-9_]*/, 'variable'],
        // IP addresses and ports in configs
        [/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?\b/, 'number'],
        // Ports
        [/\b\d{1,5}\b/, 'number'],
      ],
    },
  } as languages.LanguageConfiguration);

  // Theme
  monaco.editor.defineTheme('nginx-theme', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
      { token: 'keyword.control', foreground: '0000FF', fontStyle: 'bold' },
      { token: 'keyword.directive', foreground: '795E26' },
      { token: 'keyword.value', foreground: '0000FF' },
      { token: 'string', foreground: 'A31515' },
      { token: 'number', foreground: '098658' },
      { token: 'variable', foreground: '001188' },
    ],
  });
}
