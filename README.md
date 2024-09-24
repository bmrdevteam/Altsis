<p align="center">
 <img width="100px" src="https://github.com/user-attachments/assets/5ca2ed76-8aca-400c-900e-97d065690102" align="center" alt="GitHub Readme Stats" />
 <h1 align="center">Altsis</h1>
 <p align="center">특별한 학교를 위한 대안적인 학교 정보 시스템</p>
</p>
  <p align="center">
    <a href="https://github.com/bmrdevteam/Altsis/blob/62cbf4be719fe13160df48a08d495215c9cac272/LICENSE">
      <img alt="Tests Passing" src="https://img.shields.io/badge/license-MIT-blue.svg?style=" />
    </a>
    <a href="https://github.com/bmrdevteam/Altsis">
      <img alt="created-at" src="https://img.shields.io/github/created-at/bmrdevteam/Altsis?style=&logo=&logoColor=&color=gold&label=created at"/>
    </a>
    <a href="https://github.com/bmrdevteam/Altsis">
      <img alt="count" src="https://img.shields.io/github/languages/top/bmrdevteam/Altsis?color=gold"/>
    </a>
    <a href="https://github.com/bmrdevteam/Altsis">
      <img alt="count" src="https://img.shields.io/github/languages/count/bmrdevteam/Altsis?color=gold"/>
    </a>
    </a>
    <a href="https://github.com/bmrdevteam/Altsis/graphs/contributors">
      <img alt="GitHub Contributors" src="https://img.shields.io/github/contributors/bmrdevteam/Altsis?color=violet" />
    </a>
    <a href="https://github.com/bmrdevteam/Altsis/issues">
      <img alt="Issues" src="https://img.shields.io/github/issues/bmrdevteam/Altsis?color=violet" />
    </a>
    <a href="https://github.com/bmrdevteam/Altsis/pulls">
      <img alt="GitHub pull requests" src="https://img.shields.io/github/issues-pr/bmrdevteam/Altsis?color=violet" />
    </a>
    <a href="https://github.com/bmrdevteam/Altsis">
      <img alt="commit-activity" src="https://img.shields.io/github/commit-activity/t/bmrdevteam/Altsis?style=&logo=&logoColor=&color=0088ff&label=commits" />
    </a>
    <a href="https://github.com/bmrdevteam/Altsis">
      <img alt="commits-since" src="https://img.shields.io/github/commits-since/bmrdevteam/Altsis/latest?color=0088ff" />
    </a>
    <br />
    
# 목차 <!-- omit in toc -->

- [안녕하세요!](#안녕하세요-)
    - [역사](#역사)
    - [특징](#특징)
    - [설치](#설치)

# 안녕하세요! <!-- omit in toc -->

> [!IMPORTANT]\
> 안녕하세요!
> Altsis(Alternative School Infomation System)는 특별한 학교를 위한 대안적인 학교 정보 시스템입니다!

> [!NOTE]
> - 대안학교에서 만든 대안교육을 위한 **대안적인 학교 정보 시스템**
> - 다양한 학교와 교육과정에 적용 할 수 있는 **유연하고 독창적인 시스템**
> - 미래 지향적인 교육철학을 실현하는 **교육적인 시스템**

## 역사

> [!IMPORTANT]\
> 2016년 별무리학교 수강 신청 시스템을 위해 개발된 BLMS를 보완하고 발전시키위해 2022년 별무리학교 교사와 졸업생이 힘을 모아 개발한 Altsis입니다. 지금은 AEG를 운영하여 대안적인 학교 관리 시스템이 필요한 많은 학교들에게 보급하기 위해 힘쓰고 있습니다!

> [!NOTE]
> - 2016 [별무리학교](http://bmrschool.net) 수강 신청을 위한 맞춤형 학습 관리 시스템 [BLMS](https://github.com/devgoodway/BLMS_OSV) 개발 [@devgoodway](https://github.com/devgoodway)
> - 2022 BLMS를 발전시킨 [ALTSIS](https://github.com/bmrdevteam/Altsis) 개발 [@devgoodway](https://github.com/devgoodway) [@jessie129j](https://github.com/jessie129j) [@seedlessapple](https://github.com/seedlessapple) and [@O-ye](https://github.com/Yeonwu)
> - 2023 [ALTSIS](https://github.com/bmrdevteam/Altsis) 오픈 소스 프로젝트 시작 [@devgoodway](https://github.com/devgoodway)
> - 2024 [AEG](https://github.com/bmrdevteam/Altsis) Altsis Educator Group 시작 [@devgoodway](https://github.com/devgoodway)

## 특징

> [!IMPORTANT]\
> 대안적이고 독창적인 교육과정을 운영 할 수 있는 미래 지향적인 학교 정보 시스템

> [!NOTE]
> - :school: 아카데미 시스템 : 단 하나의 아카데미에서 복수의 학교 단위 교육 과정 운영 가능
> - :computer: 맞춤형 시스템 : 시스템 설정과 에디터를 이용해 필요에 맞는 맞춤형 시스템 구성 가능 
> - :student: 학생 중심 시스템 : 학생이 수업 개설 및 평가 등에도 참여 할 수 있는 학생 중심 시스템
> - :motorway: 통합 시스템 : 학생의 수업, 평가, 기록, 출력을 하나의 시스템에서 관리

# 설치

> [!IMPORTANT]
> 배포 환경
> + :floppy_disk: MongoDB, Ec2, S3를 이용해 서버 구성
> + :arrow_backward: Backend는 express를 이용한 REST-ful API
> + :arrow_forward: Frontend는 React를 이용한 Node.js 시스템

## Git Clone
``` nodejs
> git clone https://github.com/bmrdevteam/Altsis.git
```

## Backend
1. `프로젝트 디렉토리 > backend`로 이동합니다.
``` nodejs
> cd Altsis\backend
```

2. 의존성 패키지를 설치합니다. 
``` nodejs
> yarn
```
> [!TIP]
> OS 환경에 맞게 [yarn](https://yarnpkg.com)을 설치해 둡시다!

3. cross-env, nodemon을 전역으로 설치합니다.
``` nodejs
> yarn global add cross-env
> yarn global add nodemon
```

4. `.env` 파일을 생성하고, 필요한 환경 변수 값을 설정합니다.

`Altsis>backend>.env`
```.env
# CORS 설정을 위한 Frontend URL : 예시
URL='http://localhost:3030'

# Backend 서버를 실행할 PORT : 예시
SERVER_PORT=8080

# MongoDB 클러스터 연결 URI
DB_URL='mongodb+srv://*********:****************@******.*******.mongodb.net'

# Redis 연결 URI
REDIS_URL='redis://default:********************************@redis-*****.****.****************.ec2.cloud.redislabs.com:*****'

# Session 저장에 사용할 암호키 (mongoose-encryption)
session_key='********************************************'

# Google Login에 사용되는 client ID (Google Cloud)
GOOGLE_CLIENT_ID='*********************************************.apps.googleusercontent.com'

# AWS S3 지역 정보 : 예시
s3_region='ap-northeast-2'

# S3에 프로필 사진을 저장하기 위한 환경 변수
# AWS S3 버킷명 : 예시
s3_bucket='altsis-profile'

# AWS S3 업로드 권한을 가진 IAM의 keyId
s3_accessKeyId='********************'

# AWS S3 업로드 권한을 가진 IAM의 secretAccessKey
s3_secretAccessKey='****************************************'

# S3에 파일을 저장하기 위한 환경 변수
# AWS S3 업로드 권한을 가진 IAM의 keyId : 예시
s3_bucket2='altsis-files'

# AWS S3 업로드 권한을 가진 IAM의 keyId
s3_accessKeyId2='********************'

# AWS S3 업로드 권한을 가진 IAM의 secretAccessKey
s3_secretAccessKey2='****************************************'

# 수강 정보의 평가 정보를 암호화하기 위한 환경 변수 (mongoose-encryption)
# 공개키(32비트)
ENCKEY_E=********************************************

# 암호키(64비트)
SIGKEY_E=****************************************************************************************

# 학생 기록 정보를 암호화하기 위한 환경 변수 (mongoose-encryption)
# 공개키(32비트)
ENCKEY_A=********************************************

# 암호키(64비트)
SIGKEY_A=****************************************************************************************

# 비밀번호 해싱을 위한 설정값 (passport) : 예시
saltRounds=10
```
> [!TIP]
> - URL은 REST-API를 호출하는 Frontend 서버의 URL입니다.
> - 환경 변수를 저장하기 위해 MongoDB, Redis, Google Cloud, AWS S3에 환경 설정 및 해당 값을 호출 할 준비를 합니다!
> - mongoose-encryption를 이용해 세션 및 암호키를 생성하도록 합니다.

5. 서버를 실행합니다.
``` nodejs
> yarn dev
```

## frontend
1. 의존성 패키지를 설치합니다. 
``` nodejs
> yarn
```

2. `.env` 파일을 생성하고, 필요한 환경 변수 값을 설정합니다.

`altsis>frontend>.env`
```.env
# Google Login에 사용되는 client ID (Google Cloud)
REACT_APP_GOOGLE_CLIENT_ID='*********************************************.apps.googleusercontent.com'

# Frontend 서버 URL : Backend PORT
REACT_APP_SERVER_URL='http://localhost:8080'

# Frontend 서버 PORT
PORT=3030
```
> [!TIP]
> - Google Cloud Client ID는 Backend 설정과 동일합니다.

3. 서버를 실행합니다.
``` nodejs
> yarn start
```

## 초기 설정
1. 설치한 [MongoDB Database](https://www.mongodb.com/products/platform/atlas-database)에 접속합니다.
> [!TIP]
> <details>
> <summary>:framed_picture: 사진/영상</summary>
> 
> ![image](https://github.com/bmrdevteam/school-information-system/assets/19641212/5616b123-8da1-47ea-bcb7-a3a3450fbdb9)
> 
> ![image](https://github.com/bmrdevteam/school-information-system/assets/19641212/9a618cd4-2977-47c2-93f6-b0456537f1b7)
>  
> </details>

2. `root>academies`에 Academy Document를 생성합니다.
```json
{
  "_id": {
    "$oid": [자동 생성]
  },
  "academyId": "root",
  "academyName": "root",
  "dbName": "root",
  "isActivated": true
}
```
> [!TIP]
> <details>
> <summary>:framed_picture: 사진/영상</summary>
> 
> ![image](https://github.com/bmrdevteam/school-information-system/assets/19641212/a2e60467-0d89-4cf0-8c49-a369864a4582)
>  
> </details>

3. 아카데미가 생성되었는지 확인하기 위해 클라이언트를 실행합니다. 다음과 같은 아카데미 입장 화면이 나오면 아카데미 ID에 `root`를 입력하고 입장이 정상적으로 이루어지는지 확인합니다.
> [!TIP]
> <details>
> <summary>:framed_picture: 사진/영상</summary>
> 
> ![녹화_2023_09_13_17_26_06_930](https://github.com/bmrdevteam/school-information-system/assets/19641212/be2c3c58-1147-4d60-9852-cec58bff3ab2)
>  
> </details>

4. `root` 데이터베이스에 `users` 컬렉션을 추가합니다.
> [!TIP]
> <details>
> <summary>:framed_picture: 사진/영상</summary>
> 
> ![image](https://github.com/bmrdevteam/school-information-system/assets/19641212/c891ebb3-7de1-4a87-9eac-86f19a853faa)
> ![image](https://github.com/bmrdevteam/school-information-system/assets/19641212/f81caa7c-4430-4d94-b9d7-d71430a5bca0)
>  
> </details>

5. `users`에 소유자 Document를 다음과 같이 생성합니다.
```json
{
  "_id": {
    "$oid": [자동 생성]
  },
  "academyId": "root",
  "academyName": "root",
  "auth":"owner",
  "userId": "admin",
  "userName": "관리자",
  "password": "",
}
```
> [!TIP]
> <details>
> <summary>:framed_picture: 사진/영상</summary>
> 
> ![image](https://github.com/bmrdevteam/school-information-system/assets/19641212/e3bf2a28-7254-4745-86d4-a670cc52844d)
>  
> </details>

6. 사용자 계정이 생성되었는지 확인하기 위해 로그인 화면에서 아이디에 위에서 설정한 userId를 입력하고 비밀번호를 임의로 입력한 후 '비밀번호가 틀렸습니다'라는 메시지가 나오는지 확인합니다.
> [!TIP]
> <details>
> <summary>:framed_picture: 사진/영상</summary>
> 
> ![녹화_2023_09_13_17_27_44_774](https://github.com/bmrdevteam/school-information-system/assets/19641212/924d2155-b2a7-4ea4-9aa0-0a2f92fbc1d2)
>  
> </details>

7. `backend>src>_passport>localStrategy2.js` 파일에서 로그인 시 입력한 비밀번호와 사용자 비밀번호를 비교하는 코드(29~35 Line)를 주석처리하고 서버를 재실행합니다. 
> [!WARNING]
> 로그인 후에는 반드시 주석을 풀어주셔야 합니다.

`backend>src>_passport>localStrategy2.js`
```javascript
import passport from "passport";
import { Strategy as CustomStrategy } from "passport-custom";
import { Academy, User } from "../models/index.js";
import {
  ACADEMY_INACTIVATED,
  PASSWORD_INCORRECT,
  __NOT_FOUND,
} from "../messages/index.js";

const local2 = () => {
  passport.use(
    "local2",
    new CustomStrategy(async function (req, done) {
      const { academyId, userId, password } = req.body;

      const academy = await Academy.findOne({
        academyId,
      });
      if (!academy) {
        const err = new Error(__NOT_FOUND("academy"));
        return done(err, null, null);
      }
      if (!academy.isActivated) {
        const err = new Error(ACADEMY_INACTIVATED);
        return done(err, null, null);
      }

      const user = await User(academyId)
        .findOne({ userId })
        .select("+password");
      if (!user) {
        const err = new Error(__NOT_FOUND("user"));
        return done(err, null, null);
      }
// 주석 시작
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        const err = new Error(PASSWORD_INCORRECT);
        return done(err, null, null);
      }
// 주석 끝
      user.password = undefined;
      return done(null, user, academyId);
    })
  );
};

export { local2 };

```
> [!TIP]
> <details>
> <summary>:framed_picture: 사진/영상</summary>
> 
> ![image](https://github.com/bmrdevteam/school-information-system/assets/19641212/0487e48c-871f-49c9-a530-83fae1186ed4)
>  
> </details>

8. 서버를 재실행한 후 로그인합니다.
> [!TIP]
> <details>
> <summary>:framed_picture: 사진/영상</summary>
> 
> ![녹화_2023_09_13_17_31_24_852](https://github.com/bmrdevteam/school-information-system/assets/19641212/8ff6c478-d364-4615-92de-a1625d03f4a1)
>  
> </details>

9. 사용자 설정에서 비밀번호를 변경합니다. 7번에서 설정한 주석을 해제한 후 서버를 재실행합니다. 로그아웃 후 설정한 비밀번호로 로그인이 되는지 확인합니다.
> [!TIP]
> <details>
> <summary>:framed_picture: 사진/영상</summary>
> 
> ![녹화_2023_09_13_17_33_36_431](https://github.com/bmrdevteam/school-information-system/assets/19641212/4ae29955-cfbb-44f0-8b02-2b5c9cb76263)
>  
> </details>

# 기능
> [!IMPORTANT]
> 시스템을 운영하기 위한 관리자 기능과 데이터를 활용하는 사용자 기능이 있습니다.

## 관리자 기능

> [!IMPORTANT]
> :gear: 관리자 : 시스템 관리자(owner), 아카데미 관리자(admin), 학교 관리자(manager)

> [!NOTE]
> - **🏫 Multiple School** : 아카데미에서 여러 학교를 생성하여 동시에 운영
> - **❌ No-code** : 코드 없이 맞춤형 시스템 구성
> - **🎒 Student-centered** : 학생 중심 수업 개설 및 수강 신청 시스템
> - **1️⃣ One-stop** : 학생의 수업, 평가, 기록, 출력을 하나의 시스템에서 관리

## 사용자 기능

> [!IMPORTANT]
> :smile: 사용자 : 학생(student), 교사(teacher)

### 설치
> [!NOTE]
> - **🏫 Multiple School** : 아카데미에서 여러 학교를 생성하여 동시에 운영
> - **❌ No-code** : 코드 없이 맞춤형 시스템 구성
> - **🎒 Student-centered** : 학생 중심 수업 개설 및 수강 신청 시스템
> - **1️⃣ One-stop** : 학생의 수업, 평가, 기록, 출력을 하나의 시스템에서 관리

# 설치

> [!IMPORTANT]
> 시스템을 운영하기 위한 관리자 기능과 데이터를 활용하는 사용자 기능이 있습니다.

> [!NOTE]
> - **🏫 Multiple School** : 아카데미에서 여러 학교를 생성하여 동시에 운영
> - **❌ No-code** : 코드 없이 맞춤형 시스템 구성
> - **🎒 Student-centered** : 학생 중심 수업 개설 및 수강 신청 시스템
> - **1️⃣ One-stop** : 학생의 수업, 평가, 기록, 출력을 하나의 시스템에서 관리

# 문서

> [!IMPORTANT]
> 시스템을 운영하기 위한 관리자 기능과 데이터를 활용하는 사용자 기능이 있습니다.

> [!NOTE]
> - **🏫 Multiple School** : 아카데미에서 여러 학교를 생성하여 동시에 운영
> - **❌ No-code** : 코드 없이 맞춤형 시스템 구성
> - **🎒 Student-centered** : 학생 중심 수업 개설 및 수강 신청 시스템
> - **1️⃣ One-stop** : 학생의 수업, 평가, 기록, 출력을 하나의 시스템에서 관리

# 기여하는 방법

> [!IMPORTANT]
> 시스템을 운영하기 위한 관리자 기능과 데이터를 활용하는 사용자 기능이 있습니다.

> [!NOTE]
> - **🏫 Multiple School** : 아카데미에서 여러 학교를 생성하여 동시에 운영
> - **❌ No-code** : 코드 없이 맞춤형 시스템 구성
> - **🎒 Student-centered** : 학생 중심 수업 개설 및 수강 신청 시스템
> - **1️⃣ One-stop** : 학생의 수업, 평가, 기록, 출력을 하나의 시스템에서 관리



Made with :heart: and JavaScript.
