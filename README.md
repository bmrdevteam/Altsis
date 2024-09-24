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
> Altsis(Alternative School Infomation System)는 특별한 학교를 위한 대안적인 학교 관리 시스템입니다!

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

> [!IMPORTANT]
> 단 하나의 아카데미에서 여러 학교 교육 과정을 운영 할 수 있습니다! 시스템 설정과 에디터를 이용해 각 학교에 필요에 맞는 맞춤형 시스템 구성 할 수 있습니다. 학생이 수강 신청 및 현황을 조회 하는 것 뿐만 아니라 수업 개설 및 평가 등에도 참여 할 수 있는 학생 중심 시스템! 학생과 관련된 모든 정보를 하나의 시스템에서 운영합니다!

> [!NOTE]
> - :school: **Multiple School** : 아카데미에서 여러 학교를 생성하여 동시에 운영
> - :computer: **No-code** : 코드 없이 맞춤형 시스템 구성
> - :student: **Student-centered** : 학생 중심 수업 개설 및 수강 신청 시스템
> - :motorway: **One-stop** : 학생의 수업, 평가, 기록, 출력을 하나의 시스템에서 관리

## 설치

> [!IMPORTANT]
> 배포 환경
> + :floppy_disk: MongoDB, Ec2, S3를 이용해 서버 구성
> + :arrow_backward: Backend는 express를 이용한 REST-ful API
> + :arrow_forward: Frontend는 React를 이용한 Node.js 시스템

## 환경 변수
### backend
`altsis>backend>.env`
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
> - URL은 REST-API를 호출하는 Frontend 서버의 URL이다.
> - 환경 변수를 저장하기 위해 MongoDB, Redis, Google Cloud, AWS S3에 환경 설정 및 해당 값을 호출 할 준비를 한다!
> - mongoose-encryption를 이용해 세션 및 암호키를 생성하도록 한다.

### frontend
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
> - Google Cloud Client ID는 Backend 설정과 동일하다.

> [!NOTE]
> - **🏫 Multiple School** : 아카데미에서 여러 학교를 생성하여 동시에 운영
> - **❌ No-code** : 코드 없이 맞춤형 시스템 구성
> - **🎒 Student-centered** : 학생 중심 수업 개설 및 수강 신청 시스템
> - **1️⃣ One-stop** : 학생의 수업, 평가, 기록, 출력을 하나의 시스템에서 관리

## 기능

> [!IMPORTANT]
> 시스템을 운영하기 위한 관리자 기능과 데이터를 활용하는 사용자 기능이 있습니다.

> [!NOTE]
> - **🏫 Multiple School** : 아카데미에서 여러 학교를 생성하여 동시에 운영
> - **❌ No-code** : 코드 없이 맞춤형 시스템 구성
> - **🎒 Student-centered** : 학생 중심 수업 개설 및 수강 신청 시스템
> - **1️⃣ One-stop** : 학생의 수업, 평가, 기록, 출력을 하나의 시스템에서 관리

### 관리자 기능

> [!IMPORTANT]
> :gear: 관리자 : 시스템 관리자(owner), 아카데미 관리자(admin), 학교 관리자(manager)

> [!NOTE]
> - **🏫 Multiple School** : 아카데미에서 여러 학교를 생성하여 동시에 운영
> - **❌ No-code** : 코드 없이 맞춤형 시스템 구성
> - **🎒 Student-centered** : 학생 중심 수업 개설 및 수강 신청 시스템
> - **1️⃣ One-stop** : 학생의 수업, 평가, 기록, 출력을 하나의 시스템에서 관리

### 사용자 기능

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
