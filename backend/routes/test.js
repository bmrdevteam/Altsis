const express = require('express');
const School = require('../models/School');
const Syllabus=require('../models/Syllabus');
const router = express.Router();
const {classroomsTable}=require('../utils/util');
const _ = require('lodash');

const client=require('../redis')

// const {data,add}=require('../databases/connection')   
// router.post('/test2', (req, res) => {
//     add({key:req.body.key,val:req.body.val});
//     res.status(200).json({
//         data
//     })
// })

router.get('/lodash/indexof',(req,res)=>{
    const arr=['abc','def'];
    const arr2=[['abc','def'],['abc2','def2']];
    const arr3=[{'first':'abc'},{'second':'def'}];

    const resArr=[];

    resArr.push(_.indexOf(arr,'abc'));
    resArr.push(_.indexOf(arr,'qwer'));

    resArr.push(_.findIndex(arr2, function(el) { return _.isEqual(el,['abc','def'])}));
    resArr.push(_.findIndex(arr2, function(el) { return _.isEqual(el,['abcdef'])}));

    resArr.push(_.findIndex(arr3,{'second':'def'}));
    resArr.push(_.findIndex(arr3,{'thrid':'def'}));

    return res.status(200).send({resArr});
})

router.get('/lodash',(req,res)=>{
    const arr11_1=[1,1];
    const arr11_2=[1,1];
    const arr12=[1,2];

    const res1=_.isEqual(arr11_1,arr11_2);
    const res2=_.isEqual(arr11_1,arr12);

    const obj1={a:1,b:1};
    const obj2={a:1,b:1};
    const obj3={a:1,b:2};

    const res3=_.isEqual(obj1,obj2);
    const res4=_.isEqual(obj1,obj3);

    const objArr1=[{a:1,b:1},{a:1,b:1}];
    const objArr2=[{a:1,b:1},{a:1,b:1}];
    const objArr3=[{a:1,b:1},{a:1,b:2}];

    const res5=_.isEqual(objArr1,objArr2);
    const res6=_.isEqual(objArr1,objArr3);

    const test1= [ { label: '월5', day: '월', start: '9:00', end: '9:50' },{ label: '월2', day: '월', start: '10:00', end: '10:50' }];
    const test2= [ { label: '월5', day: '월', start: '9:00', end: '9:50' },{ label: '월2', day: '월', start: '10:00', end: '10:55' }];

    let res7=[];
    for(let i=0;i<test1.length;i++){
        res7.push(
            [test1[i],test2[i],_.isEqual(test1[i],test2[i])]
        )
    }
    const res8=_.difference(test1,test2);

    return res.status(200).send({res1,res2,res3,res4,res5,res6,res7,res8});
})

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
        message: "hello world! this is test1"
    })
})

router.get("/session", (req, res) => {
    res.json({
      "req.session": req.session, // 세션 데이터
      "req.user": req.user, // login시 저장되는 데이터
    })
})

router.post("/session", (req, res) => {
    req.session[req.body.key]=req.body.value;
    return req.session.save(()=>{                   
        return res.status(200).send({success:true});
    }) 
})

router.post('/redis',(req,res)=>{
    client.set(req.body.key,req.body.value);
    return res.status(200).send({success:true});
})

router.get('/redis',(req,res)=>{
    client.keys('*',(err,keys)=>{
        return res.status(200).send({keys});
    })
})

router.delete('/redis/all',(req,res)=>{
    client.keys('*',(err,keys)=>{
        keys.map(key=>{
            client.del(key);
        })
        return res.status(200).send({success:true});
    })   
})

router.delete('/redis/:key',(req,res)=>{
    console.log('key: ',req.params.key);
    client.del(req.params.key);
    return res.status(200).send({success:true});
})

router.get('/passport',(req,res)=>{
    return res.status(200).send({passport:req.session.passport});
})


module.exports = router;