
const config=require('./config/config')

const redisClient=require('redis').createClient({
    url:config['REDIS'],
    logErrors:true,
    legacyMode: true
  })
  
  redisClient.connect();
  
  redisClient.on('error', function(err) {
      console.log('Redis error: ' + err);});
    redisClient.on('ready', () => {
      console.log('✅ redis is ready')
    })
    redisClient.on('connect', () => {
      console.log('✅ redis is connected')
    })
    redisClient.on('error', (error) => {
      Logger.error(error)
    })
    
  module.exports=redisClient;