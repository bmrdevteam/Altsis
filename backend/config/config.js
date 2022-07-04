if(process.env.NODE_ENV.trim()==='development'){
    module.exports=require('./dev');
}
else if (process.env.NODE_ENV.trim()==='production'){
    module.exports=require('./prod');
}