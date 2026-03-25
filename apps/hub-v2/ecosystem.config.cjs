module.exports = {
  apps: [
    {
      name: "ngm-hub-v2",
      script: "index.js",
      cwd: "/opt/ngm-hub-v2/current",
      node_args: "--enable-source-maps",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
        PORT: 7008
      },
      output: "/opt/ngm-hub-v2/current/logs/out.log",
      error: "/opt/ngm-hub-v2/current/logs/error.log",
      time: true
    }
  ]
};
