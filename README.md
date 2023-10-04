# [Altsis](https://altsis.org/) &middot; [![Altsis license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/bmrdevteam/Altsis/blob/62cbf4be719fe13160df48a08d495215c9cac272/LICENSE)

Altsis(Alternative School Infomation System)는 학교에서 다루는 모든 형태의 정보를 관리합니다. 

- 대안학교에서 만든 대안교육을 위한 **대안적인 학교 정보 시스템**
- 다양한 학교와 교육과정에 적용 할 수 있는 **유연하고 독창적인 시스템**
- 미래 지향적인 교육철학을 실현하는 **교육적인 시스템**

## 역사
- 2016 [별무리학교](http://bmrschool.net) 수강 신청을 위한 맞춤형 학습 관리 시스템 [BLMS](https://github.com/devgoodway/BLMS_OSV) 개발 @[devgoodway](https://github.com/devgoodway)
- 2022 BLMS를 발전시킨 [ALTSIS](https://github.com/bmrdevteam/Altsis) 개발 @[devgoodway](https://github.com/devgoodway) @[jessie129j](https://github.com/jessie129j) @[seedlessapple](https://github.com/seedlessapple) and @[O-ye](https://github.com/O-ye)
- 2023 [ALTSIS](https://github.com/bmrdevteam/Altsis) 오픈 소스 프로젝트 시작 @[devgoodway](https://github.com/devgoodway)

## 주요특징
### 🏫 Multiple School
아카데미에서 여러 학교를 생성하여 동시에 운영
### ❌ No-code
코드 없이 맞춤형 시스템 구성
### 🎒 Student-centered
학생 중심 수업 개설 및 수강 신청 시스템
### 1️⃣ One-stop
학생의 수업, 평가, 기록, 출력을 하나의 시스템에서 관리

## 시스템 구조
* Academy(관리)
    * School(학교)
        * Season(학기)
            * Syllabus(수업)
            * Enrollment(수강정보)
            * Form(양식)
            * SeasonUser(학생, 교사)
        * SchoolUser(학생, 교사)
            * Archive(기록)
    * Forms(양식)
        * TimeTable(시간표)
        * Syllabus(강의계획서)
        * Docs(문서)
    * AcamdemyUser(학생, 교사)

## [설치(backend)](https://github.com/bmrdevteam/Altsis/wiki/Docs-(new)#%EC%8B%A4%ED%96%89-%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8-1)
### 환경 설정

프로젝트를 실행하려면 다음 환경 변수를 설정해야 합니다. 관리자에게 키를 받거나 새로 설정하세요.

```yaml
URL: cors 설정을 위한 클라이언트 주소
SERVER_PORT: 서버를 실행할 포트

DB_URL: MongoDB 클러스터 연결 URI
REDIS_URL: Redis 연결 URI
session_key: 세션 저장에 사용할 암호키

GOOGLE_CLIENT_ID: 
- 구글 로그인에 사용되는 client ID (구글 클라우드에서 생성)

# S3에 프로필 사진을 저장하기 위한 환경 변수
s3_accessKeyId: AWS S3 업로드 권한을 가진 IAM의 keyId
s3_secretAccessKey: secretAccessKey
s3_region: s3 region
s3_bucket: 버킷명

# S3에 파일을 저장하기 위한 환경 변수
s3_accessKeyId2: AWS S3 업로드 권한을 가진 IAM의 keyId
s3_secretAccessKey2: secretAccessKey
s3_bucket2: 버킷명

# s3에 로그를 저장하기 위한 환경 변수
s3_bucket3: 버킷명

# 수강 정보의 평가 정보를 암호화하기 위한 환경 변수 (mongoose-encryption)
ENCKEY_E: 공개키
SIGKEY_E: 비밀키

# 학생 기록 정보를 암호화하기 위한 환경 변수 (mongoose-encryption)
ENCKEY_A: 공개키
SIGKEY_A: 비밀키

saltRounds: 비밀번호 해싱을 위한 설정값 (passport)
```

### 실행 가이드라인

1. 프로젝트를 클론합니다.

2. `프로젝트 디렉토리 > backend`로 이동합니다.

3. 의존성 패키지를 설치합니다. 

   `yarn`

4. cross-env, nodemon을 전역으로 설치합니다.

   `yarn global add cross-env`
   
   `yarn global add nodemon`

5. `.env` 파일을 생성하고, 필요한 환경 변수 값을 설정합니다.

6. 서버를 실행합니다.

   `yarn dev`

### [처음 실행 시✨](https://github.com/bmrdevteam/Altsis/wiki/Docs-(new)#%EC%B2%98%EC%9D%8C-%EC%8B%A4%ED%96%89-%EC%8B%9C)

## [설치(frontend)](https://github.com/bmrdevteam/Altsis/wiki/Docs-(new)#%EC%8B%A4%ED%96%89-%EA%B0%80%EC%9D%B4%EB%93%9C%EB%9D%BC%EC%9D%B8-2)
### 환경 설정

프로젝트를 실행하려면 다음 환경 변수를 설정해야 합니다. 관리자에게 키를 받거나 새로 설정하세요.

```yaml
REACT_APP_GOOGLE_CLIENT_ID='구글 로그인에 사용되는 client ID (구글 클라우드에서 생성)'
REACT_APP_SERVER_URL='cors 설정을 위한 클라이언트 주소'
PORT=서버를 실행할 포트
```

**example**

```yaml
REACT_APP_GOOGLE_CLIENT_ID='[개인키].apps.googleusercontent.com'
REACT_APP_SERVER_URL='http://localhost:8080'
PORT=3030
```
### 실행 가이드라인

1. 프로젝트를 클론합니다.

2. `프로젝트 디렉토리 > frontend`로 이동합니다.

3. 의존성 패키지를 설치합니다. 

   `yarn`

4. `.env` 파일을 생성하고, 필요한 환경 변수 값을 설정합니다.

5. 서버를 실행합니다.

   `yarn start`


## 문서

Altsis와 관련된 문서는 [Github Page](https://github.com/bmrdevteam/Altsis)에서 확인 할 수 있습니다.

문서는 아래의 섹션으로 나눠져 있습니다.

* [README](https://github.com/bmrdevteam/Altsis/blob/document/README.md)
* [WIKI](https://github.com/bmrdevteam/Altsis/wiki)
* [CONTRIBUTOR](https://github.com/bmrdevteam/Altsis/blob/document/CONTRIBUTOR.md)
* [CONTRIBUTOR_COVENANT](https://github.com/bmrdevteam/Altsis/blob/document/CONTRIBUTOR_COVENANT.md)
* [LICENSE](https://github.com/bmrdevteam/Altsis/blob/document/LISENCE)
  
당신의 참여로  [Altsis](https://github.com/bmrdevteam/Altsis)의 시스템 문서를 발전 시킬 수 있습니다.

## 기여하는 방법

이 프로젝트의 주요 목적은 Altsis의 주요 기능을 더욱 발전 시키고 많은 사람들이 더욱 쉽게 사용하도록 하기 위함입니다. Altsis는 Github를 통해서 개발하게 되는데 이는 오류를 수정하고 코드를 발전시키기 위해 좋은 도구가 됩니다. 반드시 아래 문서를 자세히 읽고 프로젝트에 동참해주세요.

### [Code of Conduct](https://github.com/bmrdevteam/Altsis/blob/document/CONTRIBUTOR_COVENANT.md)

[Code of Conduct](https://github.com/bmrdevteam/Altsis/blob/document/CONTRIBUTOR_COVENANT.md)는 우리 프로젝트에 참여할 때 지켜야 할 약속과 태도를 기술하고 있습니다.

### [Contributing Guide](https://github.com/bmrdevteam/Altsis/blob/0b4c0ce6552edb88e53053553e352b19c87482b7/CONTRIBUTING.md)

[contributing guide](https://reactjs.org/docs/how-to-contribute.html)를 통해서 당신이 우리 프로젝트의 오류를 수정하고 코드를 발전시키는 방법에 대해서 배울 수 있습니다.

### 좋은 첫번째 이슈

당신이 이 프로젝트에 기여하기 위해서 이슈를 올리고자 할 때 [good first issues](https://github.com/bmrdevteam/Altsis/good%20first%20issue)에 있는 이슈를 참고하시면 도움이 될 것 입니다.

### 라이센스

Altsis is [MIT licensed](./LICENSE).
