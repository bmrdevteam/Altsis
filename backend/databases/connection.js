const mongoose=require('mongoose')
const config=require('../config/config')

module.exports ={
    "owner":mongoose.createConnection(config["newUrl"]("owner-db")),
    "bmr":mongoose.createConnection(config["newUrl"]("bmr-db")),
}
// exports.owner={
//     "owner-db":mongoose.createConnection(config["newUrl"]("owner-db")),
// };

// exports.academy={
//     "test":mongoose.createConnection(config["newUrl"]("test")),
// }
