# [Altsis](https://altsis.org/) &middot; [![Altsis license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/bmrdevteam/school-information-system/blob/62cbf4be719fe13160df48a08d495215c9cac272/LICENSE)

Altsis(Alternative School Infomation System)는 학교에서 다루는 모든 형태의 정보를 관리합니다. 

- 대안학교에서 만든 대안교육을 위한 **대안적인 학교 정보 시스템**
- 다양한 학교와 교육과정에 적용 할 수 있는 **유연하고 독창적인 시스템**
- 미래 지향적인 교육철학을 실현하는 **교육적인 시스템**

## 역사
- 2016 [별무리학교](http://bmrschool.net) 수강 신청을 위한 [BLMS](https://github.com/devgoodway/BLMS_OSV) 개발 @[devgoodway](https://github.com/devgoodway)
- 2022 BLMS를 발전시킨 [ALTSIS](https://github.com/bmrdevteam/school-information-system) 개발 @[devgoodway](https://github.com/devgoodway) @[jessie129j](https://github.com/jessie129j) @[seedlessapple](https://github.com/seedlessapple) and @[O-ye](https://github.com/O-ye)
- 2023 [ALTSIS](https://github.com/bmrdevteam/school-information-system) 오픈 소스 프로젝트 시작

## Idea
- 하나의 교육 공동체(아카데미) 안에는 다양한 학교(교육과정)가 있다.
- 교육과정은 학기라는 이름으로 진행된다.
- 학기마다 학생, 교사, 수업이 등록된다.
- 학생, 교사를 위한 별도의 정보가 기록된다.
- 모든 정보에 대한 관리 방식은 학교의 규칙과 문화에 따라 다르다.

## Concept Tree Map
- Academy(교육 공동체)
    - School(학교)
        - Season(교육과정, 학기)
            - Syllabus(수업)
            - Enrollment(수강정보)
        - Archive(기록)
    - Forms(양식)
        - TimeTable(시간표)
        - Syllabus(강의계획서)
        - Docs(문서)
    - User(학생, 교사, 학부모)

## Installation

React has been designed for gradual adoption from the start, and **you can use as little or as much React as you need**:

* Use [Online Playgrounds](https://reactjs.org/docs/getting-started.html#online-playgrounds) to get a taste of React.
* [Add React to a Website](https://reactjs.org/docs/add-react-to-a-website.html) as a `<script>` tag in one minute.
* [Create a New React App](https://reactjs.org/docs/create-a-new-react-app.html) if you're looking for a powerful JavaScript toolchain.

You can use React as a `<script>` tag from a [CDN](https://reactjs.org/docs/cdn-links.html), or as a `react` package on [npm](https://www.npmjs.com/package/react).

## Documentation

You can find the React documentation [on the website](https://react.dev/).  

Check out the [Getting Started](https://react.dev/learn) page for a quick overview.

The documentation is divided into several sections:

* [Tutorial](https://reactjs.org/tutorial/tutorial.html)
* [Main Concepts](https://reactjs.org/docs/hello-world.html)
* [Advanced Guides](https://reactjs.org/docs/jsx-in-depth.html)
* [API Reference](https://reactjs.org/docs/react-api.html)
* [Where to Get Support](https://reactjs.org/community/support.html)
* [Contributing Guide](https://reactjs.org/docs/how-to-contribute.html)

You can improve it by sending pull requests to [this repository](https://github.com/reactjs/reactjs.org).

## Examples

We have several examples [on the website](https://reactjs.org/). Here is the first one to get you started:

```jsx
import { createRoot } from 'react-dom/client';

function HelloMessage({ name }) {
  return <div>Hello {name}</div>;
}

const root = createRoot(document.getElementById('container'));
root.render(<HelloMessage name="Taylor" />);
```

This example will render "Hello Taylor" into a container on the page.

You'll notice that we used an HTML-like syntax; [we call it JSX](https://reactjs.org/docs/introducing-jsx.html). JSX is not required to use React, but it makes code more readable, and writing it feels like writing HTML. If you're using React as a `<script>` tag, read [this section](https://reactjs.org/docs/add-react-to-a-website.html#optional-try-react-with-jsx) on integrating JSX; otherwise, the [recommended JavaScript toolchains](https://reactjs.org/docs/create-a-new-react-app.html) handle it automatically.

## Contributing

The main purpose of this repository is to continue evolving React core, making it faster and easier to use. Development of React happens in the open on GitHub, and we are grateful to the community for contributing bugfixes and improvements. Read below to learn how you can take part in improving React.

### [Code of Conduct](https://code.fb.com/codeofconduct)

Facebook has adopted a Code of Conduct that we expect project participants to adhere to. Please read [the full text](https://code.fb.com/codeofconduct) so that you can understand what actions will and will not be tolerated.

### [Contributing Guide](https://reactjs.org/docs/how-to-contribute.html)

Read our [contributing guide](https://reactjs.org/docs/how-to-contribute.html) to learn about our development process, how to propose bugfixes and improvements, and how to build and test your changes to React.

### Good First Issues

To help you get your feet wet and get you familiar with our contribution process, we have a list of [good first issues](https://github.com/facebook/react/labels/good%20first%20issue) that contain bugs that have a relatively limited scope. This is a great place to get started.

### License

React is [MIT licensed](./LICENSE).
