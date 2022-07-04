module.exports = {
    apps: [
        {
            name: 'server',
            script: './app.js',
            exec_mode: 'cluster',
            instances: 1, // 단일 쓰레드
            watch: true,
            env: {
                PORT: 3000,
                "NODE_ENV": "development" // development mode
            },
            env_production: {
                "NODE_ENV": "production"  //production mode
            }
        },
    ]
};