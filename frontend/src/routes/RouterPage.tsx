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
import Academies from "../pages/owner/Academies";

//admin pages
import Academy from "../pages/admin/Index";
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

//ummm naming,,??
import Enrollment from "../pages/enrollment/Index";
import Courses from "../pages/courses/Index";
import Course from "../pages/courses/Pid";

//error pages
import Http404 from "../pages/error/404";

//components
import Sidebar from "../layout/sidebar/Sidebar";

//hooks
import { useAuth } from "../contexts/authContext";

import CourseDesign from "../pages/courses/Design";
import Settings from "../pages/settings/Index";
import Forms from "../pages/admin/forms/Index";
import Form from "../pages/admin/forms/Pid";
import List from "pages/admin/List/Index";

// import Http404 from "./pages/error/404";

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

              {/* admin routes */}
              <Route path="owner">
                {/* <Route index element={<>}></Route>  */}
                <Route path="academy" element={<Academies />}></Route>
              </Route>

              {/* ----------------------------------------------------- */}

              {/* academy admin routes */}

              <Route path="admin">
                {/* [!make!] an hook to identify the number of */}
                <Route
                  path=""
                  element={
                    <RequireAuth>
                      <Academy />
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
                  path="list"
                  element={
                    <RequireAuth>
                      <List />
                    </RequireAuth>
                  }
                ></Route>
              </Route>

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

              {/* idk(some kInd of school function routes) routes */}

              <Route
                path="enrollment"
                element={
                  <RequireAuth>
                    <Enrollment />
                  </RequireAuth>
                }
              ></Route>
              <Route
                path="courses"
                element={
                  <RequireAuth>
                    <Courses />
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
                path="courses/:pid"
                element={
                  <RequireAuth>
                    <Course />
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
