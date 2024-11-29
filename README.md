<p align="center">
 <img width="100px" src="https://github.com/user-attachments/assets/5ca2ed76-8aca-400c-900e-97d065690102" align="center" alt="GitHub Readme Stats" />
 <h1 align="center">Altsis</h1>
 <p align="center">모든 학교를 위한 대안적인 학교 정보 시스템</p>
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

- [:smile: 안녕하세요!](#안녕하세요-)
    - [역사](#역사)
    - [특징](#특징)
- [:computer: 설치해 봅시다!](#설치해-봅시다)
    - [Clone](#clone)
    - [Backend](#backend)
    - [Frontend](#frontend)
    - [초기 설정](#초기-설정)
- [:keyboard: 어떻게 사용하나요?](#어떻게-사용하나요)
    - [관리자 기능](#관리자-기능)
    - [사용자 기능](#사용자-기능)
- [:bulb: 개발을 위한 정보!](#개발을-위한-정보)
    - [서버](#서버)
    - [데이터베이스](#데이터베이스)
    - [파일 저장소](#파일-저장소)
    - [배포](#배포)
    - [API](#api)
    - [LOGGING](#logging)
- [:open_hands: 직접 설치하기 어려운 경우](#직접-설치하기-어려운-경우)
- [:books: 문서들은 어디에?](#문서들은-어디에)
- [:heart: 기여하는 방법](#기여하는-방법)

# 안녕하세요! <!-- omit in toc -->

> [!IMPORTANT]
> 안녕하세요!
> **Altsis(Alternative School Infomation System)는** 모든 학교를 위한 대안적인 학교 정보 시스템입니다!

> [!TIP]
> <img width="100px" src="https://github.com/user-attachments/assets/5ca2ed76-8aca-400c-900e-97d065690102" align="center" alt="GitHub Readme Stats" />
> - **Alt** : 대안적이고 수준높은 교육을 지향하는 **교육적인 시스템**
> - **Function Key** : 다양한 기능으로 커스텀 할 수 있는 **맞춤형 시스템**
> - **Keyboard** : 정보를 체계적으로 다룰 수 있는 **전문적인 시스템**

## 역사

> [!IMPORTANT]\
> 2016년 별무리학교 수강 신청 시스템을 위해 개발된 BLMS를 보완하고 발전시키위해 2022년 별무리학교 교사와 졸업생이 힘을 모아 개발한 Altsis입니다. 지금은 AEG를 운영하여 대안적인 학교 관리 시스템이 필요한 많은 학교들에게 보급하기 위해 힘쓰고 있습니다!

> [!NOTE]
> - 2016 [별무리학교](http://bmrschool.net) 수강 신청을 위한 맞춤형 학습 관리 시스템 [BLMS](https://github.com/devgoodway/BLMS_OSV) 개발 [@devgoodway](https://github.com/devgoodway)
> - 2022 BLMS를 발전시킨 [ALTSIS](https://github.com/bmrdevteam/Altsis) 개발 [@devgoodway](https://github.com/devgoodway) [@jessie129j](https://github.com/jessie129j) [@seedlessapple](https://github.com/seedlessapple) and [@O-ye](https://github.com/Yeonwu)
> - 2023 [ALTSIS](https://github.com/bmrdevteam/Altsis) 오픈 소스 프로젝트 시작 [@devgoodway](https://github.com/devgoodway)
> - 2024 [AEG](https://github.com/bmrdevteam/Altsis/blob/dev/AEG_README.md) Altsis Educator Group 시작 [@devgoodway](https://github.com/devgoodway)

## 특징
> [!IMPORTANT]
> - 대안학교에서 만든 대안교육을 위한 **대안적인 학교 정보 시스템**
> - 다양한 학교와 교육과정에 적용 할 수 있는 **유연하고 독창적인 시스템**
> - 미래 지향적인 교육철학을 실현하는 **교육적인 시스템**

> [!NOTE]
> - :school: **아카데미 시스템** : 단 하나의 아카데미에서 복수의 학교 단위 교육 과정 운영 가능
> - :computer: **맞춤형 시스템** : 시스템 설정과 에디터를 이용해 필요에 맞는 맞춤형 시스템 구성 가능 
> - :student: **학생 중심 시스템** : 학생이 수업 개설 및 평가 등에도 참여 할 수 있는 학생 중심 시스템
> - :motorway: **통합 시스템** : 학생의 수업, 평가, 기록, 출력을 하나의 시스템에서 관리

# 설치해 봅시다!

> [!IMPORTANT]
> 배포 환경
> + :floppy_disk: **Server** : MongoDB, Redis, AWS Ec2, AWS S3를 이용해 서버 구성
> + :arrow_backward: **Backend** : express를 이용한 REST-ful API
> + :arrow_forward: **Frontend** : React를 이용한 Node.js 시스템

## Clone
``` nodejs
git clone https://github.com/bmrdevteam/Altsis.git
```

## Backend
1. `프로젝트 디렉토리 > backend`로 이동합니다.
``` nodejs
cd Altsis\backend
```

2. 의존성 패키지를 설치합니다. 
``` nodejs
yarn
```
> [!TIP]
> OS 환경에 맞게 [yarn](https://yarnpkg.com)을 설치해 둡시다!

3. cross-env, nodemon을 전역으로 설치합니다.
``` nodejs
yarn global add cross-env
yarn global add nodemon
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
yarn dev
```

## frontend
1. 의존성 패키지를 설치합니다. 
``` nodejs
yarn
```

2. `.env` 파일을 생성하고, 필요한 환경 변수 값을 설정합니다.

`altsis>frontend>.env`
```.env
# Google Login에 사용되는 client ID (Google Cloud)
REACT_APP_GOOGLE_CLIENT_ID='*********************************************.apps.googleusercontent.com'

# Frontend 서버 URL : Backend PORT - 예시
REACT_APP_SERVER_URL='http://localhost:8080'

# Frontend 서버 PORT - 예시
PORT=3030
```
> [!TIP]
> - Google Cloud Client ID는 Backend 설정과 동일합니다.

3. 서버를 실행합니다.
``` nodejs
yarn start
```

## 초기 설정
1. 설치한 [MongoDB Database](https://www.mongodb.com/products/platform/atlas-database)에 접속합니다.
> [!TIP]
> <details>
> <summary>사진/영상</summary>
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
> <summary>사진/영상</summary>
> 
> ![image](https://github.com/bmrdevteam/school-information-system/assets/19641212/a2e60467-0d89-4cf0-8c49-a369864a4582)
>  
> </details>

3. 아카데미가 생성되었는지 확인하기 위해 클라이언트를 실행합니다. 다음과 같은 아카데미 입장 화면이 나오면 아카데미 ID에 `root`를 입력하고 입장이 정상적으로 이루어지는지 확인합니다.
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![녹화_2023_09_13_17_26_06_930](https://github.com/bmrdevteam/school-information-system/assets/19641212/be2c3c58-1147-4d60-9852-cec58bff3ab2)
>  
> </details>

4. `root` 데이터베이스에 `users` 컬렉션을 추가합니다.
> [!TIP]
> <details>
> <summary>사진/영상</summary>
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
> <summary>사진/영상</summary>
> 
> ![image](https://github.com/bmrdevteam/school-information-system/assets/19641212/e3bf2a28-7254-4745-86d4-a670cc52844d)
>  
> </details>

6. 사용자 계정이 생성되었는지 확인하기 위해 로그인 화면에서 아이디에 위에서 설정한 userId를 입력하고 비밀번호를 임의로 입력한 후 '비밀번호가 틀렸습니다'라는 메시지가 나오는지 확인합니다.
> [!TIP]
> <details>
> <summary>사진/영상</summary>
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
> <summary>사진/영상</summary>
> 
> ![image](https://github.com/bmrdevteam/school-information-system/assets/19641212/0487e48c-871f-49c9-a530-83fae1186ed4)
>  
> </details>

8. 서버를 재실행한 후 로그인합니다.
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![녹화_2023_09_13_17_31_24_852](https://github.com/bmrdevteam/school-information-system/assets/19641212/8ff6c478-d364-4615-92de-a1625d03f4a1)
>  
> </details>

9. 사용자 설정에서 비밀번호를 변경합니다. 7번에서 설정한 주석을 해제한 후 서버를 재실행합니다. 로그아웃 후 설정한 비밀번호로 로그인이 되는지 확인합니다.
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![녹화_2023_09_13_17_33_36_431](https://github.com/bmrdevteam/school-information-system/assets/19641212/4ae29955-cfbb-44f0-8b02-2b5c9cb76263)
>  
> </details>

# 어떻게 사용하나요?
> [!IMPORTANT]
> 시스템을 운영하기 위한 관리자 기능과 데이터를 활용하는 사용자 기능이 있습니다.

## 관리자 기능

> [!IMPORTANT]
> :gear: 관리자 : ⚫ 시스템 관리자(owner), 🔴 아카데미 관리자(admin), 🔵 학교 관리자(manager)

## 아카데미
### 아카데미 생성 ⚫
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![CAcademy](https://github.com/bmrdevteam/school-information-system/assets/19641212/eb46c17a-74cb-40a7-b353-4e2d3c49edea)
>  
> </details>

### 백업 ⚫🔴
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> https://github.com/bmrdevteam/school-information-system/assets/19641212/10ed8af1-3797-4524-9df9-ca0326532ead
>  
> </details>

## 학교
### 학교 생성 🔴
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![CSchool](https://github.com/bmrdevteam/school-information-system/assets/19641212/45c09a4c-f6fc-4f1c-8872-8e5061f0f964)
>  
> </details>

### 사용자 계정 생성 🔴
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![CUsers](https://github.com/bmrdevteam/school-information-system/assets/19641212/5159672d-5c41-4b56-878f-9d6b00416a6e)
>  
> </details>

### 사용자 학교에 등록 🔴
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![CUserSchool](https://github.com/bmrdevteam/school-information-system/assets/19641212/c9950fcc-178d-4d76-a935-13b66d41718e)
>  
> </details>

## 학기
### 학기 생성 🔵
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![CSeason](https://github.com/bmrdevteam/school-information-system/assets/19641212/4c1e65ef-2c6d-4868-b107-922d88fcfa27)
>  
> </details>

### 학기 복사하여 생성 🔵
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![CCopySeason](https://github.com/bmrdevteam/school-information-system/assets/19641212/74abc4ee-f23c-4638-b759-4f267dcabca1)
>  
> </details>

### 학기에 사용자 등록 🔵
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![CRegistration](https://github.com/bmrdevteam/school-information-system/assets/19641212/8acb70bf-e71f-492c-af83-96bd71ea153e)
>  
> </details>

### 학기 교과목 설정 🔵
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![USeasonSubject](https://github.com/bmrdevteam/school-information-system/assets/19641212/bd4e9529-6599-4b6f-990a-47ccfaa9645f)
>  
> </details>

### 학기 강의실 설정 🔵
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![USeasonClassrooms](https://github.com/bmrdevteam/school-information-system/assets/19641212/74806d0f-a085-4552-9b05-52a57cd58866)
>  
> </details>

## 양식
### 평가 양식 🔵
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![UFormEvaluation](https://github.com/bmrdevteam/school-information-system/assets/19641212/2606d9c6-2545-49cc-9686-8455a8af6056)
>  
> </details>

### 기록 양식 🔵
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![USchoolFormArchive](https://github.com/bmrdevteam/school-information-system/assets/19641212/1752d599-6321-4d67-963c-c3bcf0d601e5)
>  
> </details>

### 시간표 양식 (에디터⚠️) 🔵
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![UFormTimetable](https://github.com/bmrdevteam/school-information-system/assets/19641212/6fb3ae8d-a5c3-4d7d-a8ea-9a363fbce7ef)
>  
> </details>

### 강의계획서 양식 (에디터⚠️) 🔵
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![UFormSylabus](https://github.com/bmrdevteam/school-information-system/assets/19641212/8590ef3c-6d99-44e9-9480-d1f7855152b3)
>  
> </details>

### 출력 양식 (에디터⚠️)🔵
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![CFormPrint](https://github.com/bmrdevteam/school-information-system/assets/19641212/9709fe06-8ada-4a34-85ca-4bfbdd6e22b1)
>  
> </details>

## 권한
### 학기 권한 설정 🔵
> [!NOTE]
> 1. 수업 개설 권한 
> 2. 수강신청 권한
> 3. 평가 권한

> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![USeasonPermission](https://github.com/bmrdevteam/school-information-system/assets/19641212/12786622-07bd-445d-a18f-a8d5e994bd1c)
>  
> </details>

### 학기 활성화/비활성화 🔵
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![UActivateSeason](https://github.com/bmrdevteam/school-information-system/assets/19641212/f31f4561-49aa-4c4f-b882-732a3da6d1a3)
>  
> </details>

## 사용자 기능
> [!IMPORTANT]
> :smile: 사용자 : 학생(student), 교사(teacher)

## 수업
### 강의계획서 생성 ⚪
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![CSyllabus](https://github.com/bmrdevteam/school-information-system/assets/19641212/82c1e603-ccc0-4272-a9b8-44cc67a3ecf9)
>  
> </details>

### 수강 신청 ⚪
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![CEnrollment](https://github.com/bmrdevteam/school-information-system/assets/19641212/0a46bc38-e72c-46cf-ac60-3a8eaae85b06)
>
> ⭐ 수강신청이 몰리는 경우 아래와 같이 수강신청 대기창이 활성화된다.
>
> https://github.com/bmrdevteam/school-information-system/assets/19641212/7d8e473f-40dd-4935-9076-a136c227bf94
> </details>

### 수업 초대 ⚪
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![CEnrollmentByMentor](https://github.com/bmrdevteam/school-information-system/assets/19641212/4e4c8f5a-7b98-4bfe-91ac-1b5f0a9e8fe4)
>  
> </details>

### 평가 ⚪
> [!IMPORTANT]
>❗ 기본적으로 교과목이 같은 수업은 한 학기 내에서 평가 정보가 동기화되고, 평가 단위가 '학년도'인 평가 항목은 한 학년도 내에서 평가 정보가 동기화된다.

> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> - 평가
> ![CEvaluation](https://github.com/bmrdevteam/school-information-system/assets/19641212/cdf858d6-8e6a-462e-8afa-4cde7d7486b5)
> 
> - 평가 동기화
> ![CEvaluation2](https://github.com/bmrdevteam/school-information-system/assets/19641212/39a4fc73-96a9-4d9b-975a-6d83251f661c)
> 
> </details>


## 기록
### 누적 기록 입력 ⚪
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![UArchive1](https://github.com/bmrdevteam/school-information-system/assets/19641212/26c4cf0e-6a3e-4b16-947e-c2110d13f377)
>  
> </details>


### 단일 기록 입력 ⚪
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![UArchive2](https://github.com/bmrdevteam/school-information-system/assets/19641212/330a8e86-d0ad-4024-ba1e-f75b2dce440d)
>  
> </details>

## 문서
### 문서 조회 ⚪
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![RDocument](https://github.com/bmrdevteam/school-information-system/assets/19641212/3c896f56-7a55-49b4-ba1c-93ee5db03eeb)
>  
> </details>

## 편의 기능
### 일정 ⚪
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> https://github.com/bmrdevteam/school-information-system/assets/19641212/1006af77-a1d3-422a-9362-26da06421450
>  
> </details>

### 사용자 검색 ⚪
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![UserSearch](https://github.com/bmrdevteam/school-information-system/assets/19641212/bbcd381b-4c3b-40bc-b00b-9100e412979a)
>  
> </details>

### 알림 ⚪
> [!TIP]
> <details>
> <summary>사진/영상</summary>
> 
> ![CNotification](https://github.com/bmrdevteam/school-information-system/assets/19641212/e6232191-9b7b-4955-b361-1ad51aa3ac8f)
>  
> </details>

# 개발을 위한 정보!
## 서버
> **Node.js**

### 서버 구조
> [!IMPORTANT]
> 프로젝트는 다음과 같은 구조로 이루어져 있습니다.
>
> - 라우트(Route): HTTP 요청을 라우팅합니다.
> - 컨트롤러 (Controller): 라우팅된 요청을 처리합니다. 데이터베이스와 상호작용하며 필요한 데이터 처리를 수행합니다.
> - 모델 (Model): 데이터베이스에 저장될 데이터 스키마를 설정합니

## 데이터베이스
> [!NOTE]
> - **MongoDB Cloud**: 메인 DB입니다.
>   - 학교 데이터는 관계가 많아서 sql이 적합할 수 있지만 서비스의 가장 큰 특징인 커스터마이징 기능을 살리기 위해서는 객체 형태로 저장할 수 있는 MongoDB가 적합하다고 판단했습니다. 
> - **Redis Cloud**: 일시적이고 빠르게 가져와야 하는 데이터를 저장합니다.
>   - 로그인 세션 저장
>   - 알림 수신 시 실시간 알림을 위한 소켓 정보 저장
>   - 수강신청 시 실시간 대기번호 전송을 위한 소켓 정보 저장

### 데이터베이스 구조
> [!IMPORTANT]
> - MongoDB 클러스터 내에 두 종류의 데이터베이스가 있습니다.
>   - 루트 DB(`root`): 아카데미 도큐먼트와 소유자 권한을 가진 사용자 도큐먼트가 저장된다.
>   - 아카데미 DB(`{academyId}-db`): 가입된 아카데미별로 도큐먼트가 저장된다. ex) `knu-db`
> - 각 데이터베이스에는 동일한 구조의 컬렉션이 생성됩니다.

> [!NOTE]
> **루트 DB**
> 
> - academies: 가입된 아카데미 
> - users: 아카데미를 생성/관리할 수 있는 소유자 계정 

> [!NOTE]
> **아카데미 DB**
> 
> - users: 관리자 계정을 포함한 아카데미 사용자 계정
> - schools: 학교 정보
>   - 학교 별로 기록 양식을 설정할 수 있습니다.
> - seasons: 학교에 생성된 학기 정보
>   - 학기 별로 권한과 양식을 설정할 수 있습니다.
>   - 권한: 수업 개설/수강신청/평가 권한
>   - 양식: 강의실, 교과목, 강의계획서 양식, 평가 양식
> - registrations: 학기 등록 정보
>   - user A, school B, season C가 있을 때 user A를 school B에 등록한 후에 season C에 학생 또는 선생으로 등록할 수 있습니다. 
> - syllabus: 강의계획서
> - enrollment: 수강 정보
>   - user A, syllabus B가 있을 때 user A가 B 수업에 수강신청을 하면 enrollment C가 생성됩니다.
>   - 수강 정보에는 평가 정보(evaluation)가 포함되고, 평가 정보는 암호화되어 저장됩니다.
> - archive: 기록 정보
>   - 학교 사용자에 대한 기록 정보를 저장합니다
>   - 암호화되어 저장됩니다
> - forms: 양식
>   - 학교 별로 강의계획서, 시간표, 문서 등의 양식을 생성하고 정의합니다
> - notification: 알림
>   - 수업의 멘토인 선생님은 수강생들에게 알림을 전송할 수 있습니다

### 01 MongoDB Atlas | 메인 DB
> [!NOTE]
> **There are two types of DB**; Root DB and academy DB
> - Root DB(`root-db`)
>     - 아카데미 도큐먼트와 사용자(소유자) 도큐먼트가 저장된다.
> - Academy DB(`{academyId}-db`)
>     - 아카데미 관련 도큐먼트가 저장된다.
>         - 학교, 사용자(관리자, 매니저, 멤버), 학기, …

### 데이터 모델 설계
> [!NOTE]
> - https://bmrdevteam.github.io/altsis-docs/api/Models.html
> - `backend>models` 폴더 내의 각 모델 파일에서 jsdoc으로 문서를 정의한다
> - `npm run jsdoc` 실행 시 `backend>docs`에 html 파일이 생성됨 -> 이를 개발 문서 업로드 레포에 업로드한다

### 02 Redis Cloud | 캐시 DB
> [!NOTE]
> - 로그인 세션 저장
> - 알림 수신 시 실시간 알림을 위한 소켓 정보 저장
> - 수강신청 시 실시간 대기번호 전송을 위한 소켓 정보 저장

### 03 AWS S3 | 파일 저장소
> [!NOTE]
> - 프로필 사진 
> - 기록 파일 
> - 아카데미 백업 파일
> - 로그 

## 파일 저장소
> [!NOTE]
> - **AWS S3**
>   - 프로필 사진 버킷
>     - `/original/` 경로에 프로필 사진 업로드되면 AWS Lambda가 트리거되어 사진을 리사이징하고 `/thumb/` 경로에 저장됩니다.
>   - 아카데미 파일 버킷
>     - 학생 기록(archive) 파일 저장 
>     - 백업 파일 저장
>   - 로깅 버킷
>     - `/raw/` 경로에 배포 환경 로그가 실시간으로 저장됩니다.
>     -  정각이 되면 AWS Lambda가 트리거되어 전날의 로그를 `/yyyy-mm-dd/` 경로로 옮깁니다.

## 배포
### 배포 환경
> [!NOTE]
> - **AWS S3**: 클라이언트가 빌드되어 배포됩니다.
> - **AWS CloudFront**: 클라이언트에 도메인 주소를 적용해고 https 통신을 적용하기 위해 사용합니다. 
>   - 캐싱으로 속도 향상에 이점을 줄 수 있지만 현재는 변경사항을 바로 적용하기 위해 적용하지 않았습니다.
> - **AWS EC2, Docker**: EC2 인스턴스에 Docker로 서버 컨테이너가 실행됩니다.
> - **ALB**: https 통신을 적용하기 위해 사용합니다. 
>   - Auto Scaling도 고려했으나 적용하지 않았습니다.

## 배포 설계 | AWS
### 클라이언트 배포
> [!NOTE]
> - AWS S3
> - AWS CloudFront
> - AWS Route53
> - AWS Certificate Manager(ACM)
    - https 통신을 위한 SSL 인증서 발급

### 서버 배포
> [!NOTE]
> - AWS EC2
> - AWS ALB(Application Load Balancer)
>     - https 통신을 위해 적용함
> - AWS Route53
>     - 서브도메인으로 서버 주소 할당

## CI/CD | Gihub Actions
### 배포용 Access Token을 발급받고 Github secret에 등록 방법
> [!NOTE]
> 1. Personal Access Token 생성:
>   - GitHub 계정으로 로그인합니다.
>   - 오른쪽 상단의 프로필 사진을 클릭하고, "Settings"로 이동합니다.
>   - 왼쪽 메뉴에서 "Developer settings" 아래의 "Personal access tokens"을 선택합니다.
>   - "Generate token"을 클릭하고 필요한 권한을 선택합니다.
>   - 배포에 필요한 권한을 선택해야 하며, worlflow, write:packages, delete:packages를 선택합니다.
>   - 토큰을 생성하고 안전한 장소에 복사합니다.
> 2. GitHub Secrets에 등록:
>   - 레포지토리로 이동하여 "Settings"를 클릭합니다.
>   - 왼쪽 메뉴에서 "Secrets"를 선택하고, "New repository secret"을 클릭하여 새로운 시크릿을 추가합니다.
>   - 시크릿 이름(GHCR_TOKEN_아이디)을 지정하고, 앞서 생성한 Personal Access Token 값을 입력합니다.

### 클라이언트 배포 자동화
> [!NOTE]
> - See `.github > workflows > frontend-pipeline.yml`
> - frontend 브랜치에 push가 일어나면 배포가 시작됨
> - CI/CD
>     1. Github container registry에서 캐시 받아옴
>     2. Github secrets에 저장된 값으로 .env파일 생성
>     3. 모듈 설치 후 빌드
>     4. 빌드 파일 s3 클라이언트 배포용 버켓에 업로드
>     5. 슬랙 알림

### 서버 배포 자동화
> [!NOTE]
> - See `.github > workflows > backend-pipeline.yml`
> - backend 브랜치에 push가 일어나면 배포가 시작됨
> - CI
>     1. GitHub 컨테이너 레지스트리에 로그인
>     2. Github secrets에 저장된 값으로 .env파일 생성
>     3. `bakcend>Dockerfile`로 Docker image 빌드하고 Github container registry에 push
>     4. 슬랙 알림
> - CD
>     1. action runner로 등록된 ec2에서 실행됨
>     2. Github container registry에 로그인 후 Docker image pull
>     3. Docker container 실행
>         - `--restart on-failure` 옵션으로 서버가 다운됐을 때 자동으로 재실행되도록 설정
>     4. 슬랙 알림

## API
### API 문서
> [!NOTE]
> - https://bmrdevteam.github.io/altsis-docs/api/APIs.html
> - `backend>controllers` 폴더 내의 각 컨트롤러 파일에서 jsdoc으로 문서를 정의한다
> - `npm run jsdoc` 실행 시 `backend>docs`에 html 파일이 생성됨 -> 이를 개발 문서 업로드 레포에 업로드한다

### 클라이언트에서 API 호출하는 방법
> [!NOTE]
> - `frontend>...>hooks>useAPIv2` 훅으로 API를 정의하고 호출할 수 있다
> - `useAPIv2`에서 사용하는 API 이름과 API 문서에서의 API 이름은 동일하다

### API 버그 해결 예시
> [!NOTE]
> 1. 학기 생성 기능에 버그 발견
> 2. 클라이언트에서 학기 생성에 어떤 API를 사용하는지 확인한다 ex) CSeason API
> 3. API 문서에서 CSeason API를 찾고 요청을 제대로 보냈는지 확인
> 4. 요청을 제대로 보냈다면 backend 폴더에서 "CSeason"을 검색하여 해당 API 코드 확인
> 5. 응답에 에러 메시지가 있다면 해당 에러 메시지를 보내는 부분을 찾아 원인 파악
> 6. 버그 수정 후 배포

## LOGGING
### 로깅 관련 모듈
> [!NOTE]
> `winston`, `winston-daily-rotate-file`, `morgan`, `s3-streamlogger-daily`

### 로컬 환경에서의 로깅
> [!NOTE]
> - `backend>logs` 폴더에 로그 파일 생성됨

### 배포 환경에서의 로깅
> [!NOTE]
> - AWS S3의 로그 버킷에 로그 파일 생성됨
> - `raw` 폴더에 실시간 로그 기록됨
>     - 실시간 로그 파일 이름은 서버가 실행된 시간으로, 실제 서버가 기록되는 시간과는 무관하다
> - 매일 자정에 AWS Lambda 스케줄러가 실행되어 전날 로그를 `archived` 폴더로 옮긴다
>     - ex) 2023년 1월 10일에 기록된 로그는 2023년 1월 11일 자정에 `archived/2023-01-10` 폴더로 옮겨진다
 
### 로그 구성
> [!NOTE]
> 요청 시각, http, http 버전, ip 주소, user.academyId, user._id, method(POST, GET, ...), url, req.body, res.status, response time(ms), referrer, user agent

# 직접 설치하기 어려운 경우
> [!IMPORTANT]
> Altsis는 오픈 소스 프로젝트이기 때문에 사용자가 직접 서버에 설치하여 이용 할 수 있습니다. 하지만 직접 설치하기 어려운 경우 이미 서버를 이용하고 있는 관리자에게 요청하여 아카데미를 발급받아 이용 할 수도 있습니다. 아래는 아카데미 서버를 제공하는 단체의 안내입니다.

> [!TIP]
> - AEG(Altsis Educator Group)는 별무리학교에서 운영하는 Altsis 서버(https://altsis.org) 를 임대하여 학교(또는 단체)에서 제공하는 역할을 합니다. 자세한 사항은 [AEG](https://github.com/bmrdevteam/Altsis/blob/dev/AEG_README.md) 문서를 확안하세요.

# 문서들은 어디에?
> [!IMPORTANT]
> Altsis와 관련된 문서는 [Github Page](https://github.com/bmrdevteam/Altsis)에서 확인 할 수 있습니다.

> [!TIP]
> 문서는 아래의 섹션으로 나눠져 있습니다.
> * [README](https://github.com/bmrdevteam/Altsis/blob/document/README.md)
> * [WIKI](https://github.com/bmrdevteam/Altsis/wiki)
> * [CONTRIBUTOR](https://github.com/bmrdevteam/Altsis/blob/document/CONTRIBUTOR.md)
> * [CODE_OF_CONDUCT](https://github.com/bmrdevteam/Altsis/blob/document/CODE_OF_CONDUCT.md)
> * [AEG](https://github.com/bmrdevteam/Altsis/blob/dev/AEG_README.md)
> * [LICENSE](https://github.com/bmrdevteam/Altsis/blob/document/LISENCE)
> * [SECURITY](https://github.com/bmrdevteam/Altsis/blob/document/SECURITY.md)
>   
> 당신의 참여로 [Altsis](https://github.com/bmrdevteam/Altsis)의 시스템 문서를 발전 시킬 수 있습니다.

# 기여하는 방법!
> [!IMPORTANT]
> 이 프로젝트의 주요 목적은 Altsis의 주요 기능을 더욱 발전 시키고 많은 사람들이 더욱 쉽게 사용하도록 하기 위함입니다. Altsis는 Github를 통해서 개발하게 되는데 이는 오류를 수정하고 코드를 발전시키기 위해 좋은 도구가 됩니다. 반드시 아래 문서를 자세히 읽고 프로젝트에 동참해주세요.

## [Code of Conduct](https://github.com/bmrdevteam/Altsis/blob/document/CODE_OF_CONDUCT.md)
> [!TIP]
> [Code of Conduct](https://github.com/bmrdevteam/Altsis/blob/document/CODE_OF_CONDUCT.md)는 우리 프로젝트에 참여할 때 지켜야 할 약속과 태도를 기술하고 있습니다.

## 라이센스
> Altsis is [MIT licensed](./LICENSE).
