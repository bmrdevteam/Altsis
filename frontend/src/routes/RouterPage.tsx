import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

//owner pages
import Owner from "../pages/owner/Index";
import Academies from "../pages/owner/academies/Index";
import Academy from "../pages/owner/academies/Pid";

//admin pages
import Admin from "../pages/admin/Index";
import Users from "../pages/admin/users/Index";
import Schools from "../pages/admin/schools/Index";
import School from "../pages/admin/schools/Pid";

//dev pages
import Test from "../pages/dev/Test";
import E from "../pages/dev/E";

// basic pages
import Home from "../pages/index/Home";
import Login from "../pages/login/Login";
import Register from "../pages/Register";

// course pages
import Course from "pages/courses/Index";
import CoursePid from "pages/courses/Pid";
import CourseDesign from "../pages/courses/Design";
import CourseEnroll from "../pages/courses/Enroll";
import CourseList from "pages/courses/List";
import CourseMyList from "pages/courses/MyList";
import CourseMentoringList from "pages/courses/Mentoring/List";
import CourseMentoringPid from "pages/courses/Mentoring/Pid";
import CourseEnrollmentPid from "pages/courses/Enrollment";

// apps pages
import AppsIndex from "pages/apps/Index";
import Apps from "pages/apps/Apps";
// notification pages
import Notifications from "pages/notifications/Index";

//error pages
import Http404 from "../pages/error/404";

//components
import Sidebar from "../layout/sidebar/Sidebar";

//hooks
import { useAuth } from "../contexts/authContext";

import Settings from "../pages/settings/Index";
import Forms from "../pages/admin/forms/Index";
import Form from "../pages/admin/forms/Pid";
import Myaccount from "pages/myaccount/Index";
import Archive from "pages/archive/Index";
import ArchiveField from "pages/archive/Pid";
import Docs from "pages/docs/Index";
import ChooseAcademy from "pages/login/ChooseAcademy";

function RouterPage() {
  const { currentUser } = useAuth();

  // authenticate path with simple userlogin check
  const RequireAuth = ({
    children,
    auth,
  }: {
    children: JSX.Element;
    auth?: string[];
  }) => {
    if (
      currentUser &&
      auth !== undefined &&
      !auth?.includes(currentUser.auth)
    ) {
      alert("잘못된 접근입니다.");
      return <Navigate to="/" />;
    }

    return currentUser ? children : <Navigate to="/0/login" />;
  };

  return (
    <div className="main" id="main">
      <BrowserRouter>
        {currentUser && <Sidebar />}
        <div
          className="content"
          id="content"
          // style={{ maxWidth: `calc(100vw - ${sidebarClose ? 56 : 240}px)` }}
        >
          <Routes>
            {/* ----------------------------------------------------- */}

            {/* basic routes */}
            <Route path="login" element={<ChooseAcademy />}></Route>
            <Route path=":pid/login" element={<Login />}></Route>
            <Route path="register" element={<Register />}></Route>
            {/* <Route path="/:academyId"> */}
            {/* ----------------------------------------------------- */}

            {/* index */}
            <Route
              index
              element={
                <RequireAuth>
                  <Home />
                </RequireAuth>
              }
            ></Route>

            {/* ----------------------------------------------------- */}

            {/* owner routes */}
            <Route path="owner">
              <Route
                path=""
                element={
                  <RequireAuth auth={["owner"]}>
                    <Owner />
                  </RequireAuth>
                }
              ></Route>
              <Route
                path="academies"
                element={
                  <RequireAuth auth={["owner"]}>
                    <Academies />
                  </RequireAuth>
                }
              ></Route>
              <Route
                path="academies/:pid"
                element={
                  <RequireAuth auth={["owner"]}>
                    <Academy />
                  </RequireAuth>
                }
              ></Route>
            </Route>

            {/* academy admin & manager routes */}
            <Route path="admin">
              {/* [!make!] an hook to identify the number of */}
              <Route
                path=""
                element={
                  <RequireAuth auth={["admin", "manager"]}>
                    <Admin />
                  </RequireAuth>
                }
              ></Route>

              <Route
                path="users"
                element={
                  <RequireAuth auth={["admin"]}>
                    <Users />
                  </RequireAuth>
                }
              ></Route>
              <Route path="users/add" element={<Schools />}></Route>

              <Route
                path="schools/list"
                element={
                  <RequireAuth auth={["admin", "manager"]}>
                    <Schools />
                  </RequireAuth>
                }
              ></Route>
              <Route
                path="schools/:pid"
                element={
                  <RequireAuth auth={["admin"]}>
                    <School />
                  </RequireAuth>
                }
              ></Route>
              <Route
                path="schools"
                element={
                  <RequireAuth auth={["admin", "manager"]}>
                    <School />
                  </RequireAuth>
                }
              ></Route>

              <Route
                path="forms"
                element={
                  <RequireAuth auth={["admin", "manager"]}>
                    <Forms />
                  </RequireAuth>
                }
              ></Route>

              <Route
                path="forms/:pid"
                element={
                  <RequireAuth auth={["admin", "manager"]}>
                    <Form />
                  </RequireAuth>
                }
              ></Route>

              {/* ----------------------------------------------------- */}

              {/* dev routes */}
              <Route path="dev">
                <Route path="test" element={<Test />}></Route>
                <Route path="e" element={<E />}></Route>
                {/*  404 error */}
                <Route path="*" element={<Http404 />}></Route>
              </Route>

              {/* ----------------------------------------------------- */}

              {/* error routes */}
              <Route path="*" element={<Http404 />}></Route>

              {/* ----------------------------------------------------- */}
            </Route>

            {/* ----------------------------------------------------- */}

            {/* courses routes */}
            <Route path="courses">
              {/* [!make!] an hook to identify the number of */}
              <Route
                path=""
                element={
                  <RequireAuth>
                    <Course />
                  </RequireAuth>
                }
              ></Route>
              <Route
                path="enroll"
                element={
                  <RequireAuth>
                    <CourseEnroll />
                  </RequireAuth>
                }
              ></Route>
              <Route
                path="design"
                element={
                  <RequireAuth>
                    <CourseDesign />
                  </RequireAuth>
                }
              ></Route>

              <Route
                path="list"
                element={
                  <RequireAuth>
                    <CourseList />
                  </RequireAuth>
                }
              ></Route>
              <Route
                path="mylist"
                element={
                  <RequireAuth>
                    <CourseMyList />
                  </RequireAuth>
                }
              ></Route>
              <Route
                path="mylist/:pid"
                element={
                  <RequireAuth>
                    <CoursePid />
                  </RequireAuth>
                }
              ></Route>
              <Route
                path="mentoring"
                element={
                  <RequireAuth>
                    <CourseMentoringList />
                  </RequireAuth>
                }
              ></Route>
              <Route
                path="mentoring/:pid"
                element={
                  <RequireAuth>
                    <CourseMentoringPid />
                  </RequireAuth>
                }
              ></Route>
              <Route
                path=":pid"
                element={
                  <RequireAuth>
                    <CourseEnrollmentPid />
                  </RequireAuth>
                }
              ></Route>

              {/* error routes */}
              <Route path="*" element={<Http404 />}></Route>

              {/* ----------------------------------------------------- */}
            </Route>

            {/* ----------------------------------------------------- */}
            {/* teacher routes */}

            <Route
              path="archive"
              element={
                <RequireAuth>
                  <Archive />
                </RequireAuth>
              }
            ></Route>
            <Route
              path="archive/:pid"
              element={
                <RequireAuth>
                  <ArchiveField />
                </RequireAuth>
              }
            ></Route>

            <Route
              path="docs"
              element={
                <RequireAuth>
                  <Docs />
                </RequireAuth>
              }
            ></Route>

            {/* ----------------------------------------------------- */}

            <Route
              path="notifications"
              element={
                <RequireAuth>
                  <Notifications />
                </RequireAuth>
              }
            ></Route>

            <Route
              path="settings"
              element={
                <RequireAuth>
                  <Settings />
                </RequireAuth>
              }
            ></Route>

            {/* ----------------------------------------------------- */}
            {/* apps routes */}
            <Route
              path="apps"
              element={
                <RequireAuth>
                  <AppsIndex />
                </RequireAuth>
              }
            ></Route>
            <Route
              path="apps/apps"
              element={
                <RequireAuth>
                  <Apps />
                </RequireAuth>
              }
            ></Route>

            {/* ----------------------------------------------------- */}

            {/* school routes */}
            <Route
              path="myaccount"
              element={
                <RequireAuth>
                  <Myaccount />
                </RequireAuth>
              }
            ></Route>

            {/* ----------------------------------------------------- */}

            {/* dev routes */}
            <Route path="dev">
              <Route path="test" element={<Test />}></Route>
              <Route path="e" element={<E />}></Route>
              {/*  404 error */}
              <Route path="*" element={<Http404 />}></Route>
            </Route>
            {/* ----------------------------------------------------- */}

            {/* ----------------------------------------------------- */}

            {/* error routes */}
            <Route path="*" element={<Http404 />}></Route>

            {/* ----------------------------------------------------- */}
            {/* </Route> */}
          </Routes>
        </div>
      </BrowserRouter>
    </div>
  );
}

export default RouterPage;
