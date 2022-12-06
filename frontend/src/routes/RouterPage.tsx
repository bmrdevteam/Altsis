/**
 * @file Router Page
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 * - Router Page
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 *
 */
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
import Login from "../pages/Login";
import Register from "../pages/Register";

// course pages
import Course from "pages/courses/Index";
import CoursePid from "pages/courses/Pid";
import CourseDesign from "../pages/courses/Design";
import CourseEnroll from "../pages/courses/Enroll";
import CourseList from "pages/courses/List";
import CourseMyList from "pages/courses/MyList";
import CourseMentoring from "pages/courses/Mentoring";

//error pages
import Http404 from "../pages/error/404";

//components
import Sidebar from "../layout/sidebar/Sidebar";

//hooks
import { useAuth } from "../contexts/authContext";

import Settings from "../pages/settings/Index";
import Forms from "../pages/admin/forms/Index";
import Form from "../pages/admin/forms/Pid";
import Lists from "pages/admin/lists/Index";
import List from "pages/admin/lists/Pid";
import Myaccount from "pages/myaccount/Index";
import Archive from "pages/archive/Index";
import ArchiveField from "pages/archive/Pid";

function RouterPage() {
  // authenticate path with simple userlogin check
  const RequireAuth = ({
    children,
    role,
  }: {
    children: JSX.Element;
    role?: string[];
  }) => {
    const { currentUser } = useAuth();

    if (role !== undefined && !role?.includes(currentUser.auth)) {
      return currentUser ? children : <Navigate to="/" />;
    }

    return currentUser ? children : <Navigate to="/0/login" />;
  };

  return (
    <div className="main" id="main">
      <BrowserRouter>
        <Sidebar />
        <div
          className="content"
          id="content"
          // style={{ maxWidth: `calc(100vw - ${sidebarClose ? 56 : 240}px)` }}
        >
          <Routes>
            <Route path="/">
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
                    <RequireAuth>
                      <Owner />
                    </RequireAuth>
                  }
                ></Route>
                <Route
                  path="academies"
                  element={
                    <RequireAuth>
                      <Academies />
                    </RequireAuth>
                  }
                ></Route>
                <Route
                  path="academies/:pid"
                  element={
                    <RequireAuth>
                      <Academy />
                    </RequireAuth>
                  }
                ></Route>
              </Route>
              {/* ----------------------------------------------------- */}

              {/* academy admin routes */}
              <Route path="admin">
                {/* [!make!] an hook to identify the number of */}
                <Route
                  path=""
                  element={
                    <RequireAuth>
                      <Admin />
                    </RequireAuth>
                  }
                ></Route>

                <Route
                  path="users"
                  element={
                    <RequireAuth>
                      <Users />
                    </RequireAuth>
                  }
                ></Route>
                <Route path="users/add" element={<Schools />}></Route>

                <Route
                  path="schools"
                  element={
                    <RequireAuth role={["member"]}>
                      <Schools />
                    </RequireAuth>
                  }
                ></Route>
                <Route
                  path="schools/:pid"
                  element={
                    <RequireAuth>
                      <School />
                    </RequireAuth>
                  }
                ></Route>

                <Route
                  path="forms"
                  element={
                    <RequireAuth>
                      <Forms />
                    </RequireAuth>
                  }
                ></Route>
                <Route
                  path="forms/:pid"
                  element={
                    <RequireAuth>
                      <Form />
                    </RequireAuth>
                  }
                ></Route>
                <Route
                  path="lists"
                  element={
                    <RequireAuth>
                      <Lists />
                    </RequireAuth>
                  }
                ></Route>
                <Route
                  path="lists/:pid"
                  element={
                    <RequireAuth>
                      <List />
                    </RequireAuth>
                  }
                ></Route>
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

              {/* ----------------------------------------------------- */}

              {/* basic routes */}
              <Route path="login" element={<Login />}></Route>
              <Route path=":pid/login" element={<Login />}></Route>
              <Route path="register" element={<Register />}></Route>

              <Route
                path="settings"
                element={
                  <RequireAuth>
                    <Settings />
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
              <Route
                path="courses"
                element={
                  <RequireAuth>
                    <Course />
                  </RequireAuth>
                }
              ></Route>
              <Route
                path="courses/enroll"
                element={
                  <RequireAuth>
                    <CourseEnroll />
                  </RequireAuth>
                }
              ></Route>
              <Route
                path="courses/design"
                element={
                  <RequireAuth>
                    <CourseDesign />
                  </RequireAuth>
                }
              ></Route>
              <Route
                path="courses/list"
                element={
                  <RequireAuth>
                    <CourseList />
                  </RequireAuth>
                }
              ></Route>
              <Route
                path="courses/mylist"
                element={
                  <RequireAuth>
                    <CourseMyList />
                  </RequireAuth>
                }
              ></Route>
              <Route
                path="courses/mentoring"
                element={
                  <RequireAuth>
                    <CourseMentoring />
                  </RequireAuth>
                }
              ></Route>
              <Route
                path="courses/:pid"
                element={
                  <RequireAuth>
                    <CoursePid />
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
          </Routes>
        </div>
      </BrowserRouter>
    </div>
  );
}

export default RouterPage;
