module.exports = {
  apps: [{
    name: 'aitutor-kb',
    script: 'dist/index.js',
    cwd: '/var/www/aitutor-kb',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};