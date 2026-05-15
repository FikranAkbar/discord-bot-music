module.exports = {
  apps: [
    {
      name: 'discord-music-bot',
      script: 'dist/index.js',
      watch: false,
      max_memory_restart: '300M',
      restart_delay: 5000,
      max_restarts: 10,
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      merge_logs: true,
    },
  ],
};
