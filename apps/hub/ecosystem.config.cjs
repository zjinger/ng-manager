module.exports = {
  apps: [
    {
      name: "ngm-hub",
      script: "index.js",
      cwd: "/opt/ngm-hub/current",
      node_args: "--enable-source-maps",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        PORT: 7007,
        LOG_DIR: "/opt/ngm-hub/current/logs",
      },
      output: "/opt/ngm-hub/current/logs/out.log",
      error: "/opt/ngm-hub/current/logs/error.log",
      time: true,
    },
  ],
};
