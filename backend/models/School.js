const mongoose=require('mongoose')
const moment=require('moment')
const {conn}=require('../databases/connection')   


const permissionSchema=mongoose.Schema({
    teacher:{
        type:String,
        default:'N'
    },
    student:{
        type:String,
        default:'N'
    },
    allowlist:[
        mongoose.Schema({
            userId:String,
            userName:String
        },{_id:false})
    ],
    blocklist:[
        mongoose.Schema({
            userId:String,
            userName:String
        },{_id:false})
    ]
},{ _id : false })

const seasonSchema= mongoose.Schema({
    year:{
        type:String,
        required:true
    },
    term:{
        type:String,
        required:true
    },
    period:{
        type:String,
        required:true
    },
    activated:{ /* 시즌 활성화 */
        type:String,
        default:'N'
    },  
    permissions:{
        type:mongoose.Schema({
            syllabus:{
                type:permissionSchema,
            },/* 수업 개설 권한 */
            enrollment:{
                type:permissionSchema
            },/* 수강 신청 권한 */
            evaluation:{
                type:permissionSchema
            } /* 평가 권한 */
        }, { _id : false }),
        default:{
            syllabus:{},
            enrollment:{},
            evaluation:{}
        }
    },
    form:{
        type:mongoose.Schema({
            timetable:{
                type:String,
                required:true
            }, /* 시간표 양식 지정 */
            syllabus:{
                type:String,
                required:true
            }, /* 수업 계획서 양식 지정 */
            evaluation:{
                type:[String],
                required:true
            },/* 평가 양식 #학생,교사 권한에 따라 등록하여 사용 가능 */ 
            archive:{
                type:[String],
                required:true
            },/* 기록 양식 */
            document:{
                type:[String],
                required:true
            }/* 문서 양식 */
        }, { _id : false }),
        required:true
    }
}, { _id : false })

const schoolSchema=mongoose.Schema({
    schoolId:{
        type:String,
        unique:true
    },
    schoolName:String,
    logo:String,
    head:String,
    tel:String,
    email:String,
    address:String,
    homepage:String,
    classrooms:[String],
    subjects:Array,
    seasons:[seasonSchema],
    timestamps:{
        type:String,
        default:moment().format('YYYY-MM-DD HH:mm:ss')
    },
});

module.exports=(dbName)=>{
    return conn[dbName].model('School',schoolSchema);
}