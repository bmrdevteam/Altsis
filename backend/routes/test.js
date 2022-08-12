const express = require('express');
const School = require('../models/School');
const Syllabus=require('../models/Syllabus');
const router = express.Router();
const {classroomsTable}=require('../utils/util');

// const {data,add}=require('../databases/connection')   
// router.post('/test2', (req, res) => {
//     add({key:req.body.key,val:req.body.val});
//     res.status(200).json({
//         data
//     })
// })

router.get('/classrooms', async (req, res) => {

    const schoolId=req.query.schoolId;
    const year=req.query.year;
    const term=req.query.term;

    const syllabuses=await Syllabus(req.user.dbName).find({schoolId,year,term});

    const table=await classroomsTable(syllabuses);

    res.status(200).json({table})
})


router.get('/date', (req, res) => {
    res.status(200).json({
        success:true,
        parse:  Date.parse(req.body.createdAt)
    })
})

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