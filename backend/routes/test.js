const express = require('express');
const router = express.Router();

router.post('/test1', (req, res) => {
    console.log(JSON.stringify(req.body))
    res.status(200).json({
        success:true,
        message: "hello world!"
    })
})

module.exports = router;