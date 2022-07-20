module.exports = {
  apps: [
    {
      name: 'task',
      script: './cli.js',
      autorestart: false,
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS',
      max_restarts: 0,
      kill_timeout: 10000,
      min_uptime: '10s',
      node_args:['--max-old-space-size=1536']
    }
  ]
}
