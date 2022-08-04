# **Sebastian's** LMS **frontend** devlog

## Libraries

- React(v18)
- typescript
- sass

## Table of contents

1. [Cod'ng Style](#codng-style)
    1. [Naming](#naming)
    2. null
2. [Reference](#references)
3. [Docs](#docs)
4. [Log](#log)
5. [ToDo](#todo)
6. [Finished ToDo](#finished-todos)





## Cod'ng Style


### [react](#react)

[-](#nowhere) use cammelCase to define a function

``` javascript
function myFunction(params:type) {
  
}
```
[-](#nowhere) use `PascalCase` letters to define a react component file

``` javascript
HomePage.jsx
```

[-](#nowhere) use ES6 arrow functions when a function returns a `React component` or `HTML`

>use PascalCase

``` javascript
const MyFunction = () =>{
    return <div></div>
}
```


[-](#nowhere) use prefilx `handle` on addeventlisteners and `on` functions 

``` javascript
function handleOnClick(params:type) {
  
}
```

### [typescript](#typescript)

[-](#nowhere) use `.tsx` & `.ts` extention to declare React components to use `typescript`

> `.jsx` &rarr; `.tsx` 

> `.js` &rarr; `.ts` 


[-](#nowhere) use `I` to declare an `interface` 

``` typescript
export default interface IUser{}
```

[-](#nowhere) use prefix `T` to declare an `type` 

``` typescript
export default type TUser{}
```


### [sass](#sass)





## References


## Docs

- [Routes](#routes)
- [Pages](#pages)
- [Components](#components)
- [Hooks](#hooks)
- [Contexts](#contexts)

## **Routes**

**routes**

- [/](#index-hometsx)
- [/login](#login-logintsx)
- [/register](#register-registertsx)
- [/]()
- [/]()
- [/admin]()
    - [/academy]()
- [/academy]()
    - [/schools]()
    - [/school/[id]]()
    - [/users]()
    - [/user/[id]]()
    - [/settings]()


- [/404 not found](#404-not-found)



## **Pages**


### [***/index*** Home.tsx](#index-hometsx)

>Landing Page

- timetable
- search

### [***/login*** Login.tsx](#login-logintsx)

>Login Page

- authForm



### [***/register*** Register.tsx](#register-registertsx)

>Register Page

- authForm


### [404 not found](#404-not-found)

>could not locate page

## **Components**


- [button](#button)
- [authForm]()
- [editor](#editor)


### [***button***](#button)

### [***editor***](#editor)

> an block type editor


## **Hooks**


- [useSearch](#usesearch)
- [useGoogleLogin](#usegooglelogin)
- [useGenerateId](#useGenerateId)
- [useEditor]()
- [useDatabaseCreate](#usedatabasecreate)
- [useDatabaseRead](#usedatabaseread)
- [useDatabaseUpdate](#usedatabaseupdate)
- [useDatabaseDelete](#usedatabasedelete)

### [useSearch](#usesearch)

> searches through an array and returns filtered array

params

usage

```typescript
useSearch(params)
```

return

>filtered array

### [useGoogleLogin](#usegooglelogin)

return

### [useGenerateId](#usegenerateid)

> generates a random id with string

params

|param|type|description|
|:---|---:|:---------|
|length|number|defines the length of the generated string|



usage

```typescript
strId = useGenerateId(length:number)
```

return

>string

### [useEditor](#useeditor)

>functions for the editor

params

>none



usage

```typescript
useEditor(length:number)
```

return

>string

### [useDatabaseCreate](#usedatabasecreate)

>Create from the Database

params

|param|type|description|
|:---|---:|:---------|
|location|string|the location in the database|
|data|object||



usage

```typescript
useDatabaseCreate(location:string,)
```

return

```typescript
{ 
    status: ( success | failed ):string, 
    errorMsg: string
}
```

### [useDatabaseRead](#usedatabaseread)

>Read from the Database

params

|param|type|description|
|:---|---:|:---------|
|location|string|the location in the database|



usage

```typescript
useDatabaseRead(location:string,)
```

return

```typescript
{ 
    status: ( success | failed ):string  
    response: object | string | Array , 
    errorMsg: string 
}
```


### [useDatabaseUpdate](#usedatabaseupdate)

>Update from the Database

params

|param|type|description|
|:---|---:|:---------|
|location|string|the location in the database|
|data|object||


usage

```typescript
useDatabaseUpdate(location:string,)
```

return

```typescript
{ 
    status: ( success | failed ):string  
    response: object | string | Array , 
    errorMsg: string 
}
```


### [useDatabaseDelete](#usedatabasedelete)

>delete from the Database


params

|param|type|description|
|:---|---:|:---------|
|location|string|the location in the database|


usage

```typescript
useDatabaseDelete(location:string,)
```

return

```typescript
{ 
    status: ( success | failed ):string  
    errorMsg: string 
}
```

## [Contexts](#contexts)

## Log

### [2022/7/28](#2022728)

- created devlog
- added coding styles to the devlog
- added docs to devlog
- added academy admmin folder and routes
- added schools page
- added school page with dynamic routing

### [2022/7/29](#2022729)

- the weird insertion of the useState hook

``` typescript
setEditorData((prev) => {
      
    if (insertAfter > 0) {
    return [
        ...prev.slice(0, insertAfter),
        {
        id: generateBlockId(12),
        type: "paragraph",
        data: { text: "" },
        },
        ...prev.slice(insertAfter, prev.length),
    ];
    }

    return [
    {
        id: generateBlockId(12),
        type: "paragraph",
        data: { text: "success" },
    },
    ...prev,
    ];
});
```

- addBlock function
- generateRandomId function
- updated the docs 


### [2022/8/1](#202281)

- deleteBlock function
- save function
- autosave function
- input block
- docs update

### [2022/8/2](#202282)

- [remaking the useSearch hook](#usesearch)
- added lodash lib 
- select block
- filter component
- list component &rarr; none editable table? / simple table


### [2022/8/2](#202282)

- j

## ToDo

- [ ] `+` ~~import Draft.js to use rich text editing~~ - outdated library

[-](#nowhere) src/pages/academey/school/School.tsx

- [ ] `+` get the school info from the backend (`+` useApi hook )

[-](#nowhere) src/components/editorV2

- [ ] `+` editor type undefined , form , text 

[-](#nowhere) src/components/editorV2/Blocks

- [ ] `+` block type input , select , toggle

[-](#nowhere) src/components/editorV2/Blocks/TableBlock

- [ ] `+` addRow and addColumn function 

[-](#nowhere) src/components/editorV2/menu/AppearanceMenu.tsx

- [ ] inline styles in text with `execcommand()` alternatives 
- [ ] `+` Icons Italics , textAlign , linethrough .etc

## Finished Todos


## quick note

``` javascript
function csvToJSON(csv_string){


    const rows = csv_string.split("\r\n");
    // const rows = csv_string.split("\n");
    const jsonArray = [];
    const header = rows[0].split(",");
    for(let i = 1; i < rows.length; i++){
        let obj = {};
        let row = rows[i].split(",");
        for(let j=0; j < header.length; j++){
            obj[header[j]] = row[j];
        }
        jsonArray.push(obj);
    }
    return jsonArray;
    // return JSON.stringify(jsonArray);
}



```