const express = require('express');
const router = express.Router();

router.get('/test1', (req, res) => {
    res.status(200).json({
        success:true,
        message: "hello world!"
    })
})

router.get("/session", (req, res) => {
    res.json({
      "req.session": req.session, // 세션 데이터
      "req.user": req.user, // login시 저장되는 데이터
    })
})

router.post("/session", (req, res) => {
    req.session.message=req.body.message;
    return req.session.save(()=>{                   
        return res.status(200).send({success:true,message:req.session.message});
    }) 
})

module.exports = router;