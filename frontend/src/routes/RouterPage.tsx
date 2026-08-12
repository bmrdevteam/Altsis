import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";

//owner pages
import Owner from "../pages/owner/Index";
import Academies from "../pages/owner/academies/Index";
import Academy from "../pages/owner/academies/Pid";
import AcademySchool from "../pages/owner/academies/School";

//admin pages
import Admin from "../pages/admin/Index";
import Users from "../pages/admin/users/Index";
import Schools from "../pages/admin/schools/Index";
import School from "../pages/admin/schools/Pid";
import Backup from "../pages/admin/Backup";
import SiteAdmin from "../pages/admin/site/Index";

//dev pages
import Test from "../pages/dev/Test";
import E from "../pages/dev/E";

// basic pages
import Home from "../pages/index/Home";
import Login from "../pages/login/Login";
import Register from "../pages/Register";

// course pages
import Course from "pages/courses/Index";
import CourseDesign from "../pages/courses/Design";
import CourseEnroll from "../pages/courses/Enroll";
import CourseEnrollStatus from "../pages/courses/EnrollStatus";
import CourseList from "pages/courses/List";
import CourseCreatedPid from "pages/courses/tab/Created/Index";
import CourseMentoringPid from "pages/courses/tab/Mentoring/Index";
import CourseEnrollmentPid from "pages/courses/tab/Enrolled/Index";
import CourseEditPid from "pages/courses/view/Edit/Index";

// notification pages
import Notifications from "pages/notifications/Index";

// board pages
import Boards from "pages/boards/Index";
import BoardPid from "pages/boards/BoardPid";
import PostPid from "pages/boards/PostPid";
import PostCreate from "pages/boards/PostCreate";

//error pages
import Http404 from "../pages/error/404";

// search result pages
import UserSearchResult from "pages/userSearchResult/Index";

//components
import Sidebar from "../layout/sidebar/Sidebar";
import Navbar from "layout/navbar/Navbar";
import { AlterProvider } from "contexts/alterContext";

//hooks
import { useAuth } from "../contexts/authContext";

import Settings from "../pages/settings/Index";
import GoalsDashboard from "pages/goals/Index";
import Forms from "../pages/admin/forms/Index";
import Form from "../pages/admin/forms/Pid";
import Myaccount from "pages/myaccount/Index";
import Archive from "pages/archive/Index";
import ArchiveField from "pages/archive/Pid";
import ArchiveViewer from "pages/archiveViewer/Index";
import ArchiveViwerField from "pages/archiveViewer/Pid";
import Docs from "pages/docs/Index";
import ChooseAcademy from "pages/login/ChooseAcademy";
import Dev from "pages/dev/Index";
import Classrooms from "pages/dev/Classrooms";
import UrlContextSync from "./UrlContextSync";

const LegacyRedirect = () => {
  const { currentUser, currentSchool } = useAuth();
  const location = useLocation();

  if (currentUser?.academyId) {
    const schoolId =
      currentSchool?.schoolId || currentUser.schools?.[0]?.schoolId;
    if (schoolId) {
      const homePath = `/${currentUser.academyId}/${schoolId}/`;

      // If path is root "/" or just the academy slug (e.g., "/bmr"),
      // redirect to home instead of appending to avoid bad paths like /bmr/bmrhs/bmr
      const trimmedPath = location.pathname.replace(/^\/+|\/+$/g, "");
      if (!trimmedPath || trimmedPath === currentUser.academyId) {
        return <Navigate to={homePath} replace />;
      }

      const newPath = `/${currentUser.academyId}/${schoolId}${location.pathname}${location.search}${location.hash}`;
      return <Navigate to={newPath} replace />;
    }
  }

  // For unauthenticated users: if the path is a single segment (e.g., "/bmr"),
  // treat it as an academy ID and redirect to its login page
  const trimmedPath = location.pathname.replace(/^\/+|\/+$/g, "");
  if (trimmedPath && !trimmedPath.includes("/")) {
    return <Navigate to={`/${trimmedPath}/login`} replace />;
  }

  return <Navigate to="/login" replace />;
};

/**
 * Layout for top-level /admin routes (no school prefix).
 * If the user has a school, redirects to the prefixed URL.
 * If the user has no school (e.g. new academy admin), renders admin pages directly.
 */
const AdminFallback = () => {
  const { currentUser, currentSchool } = useAuth();
  const location = useLocation();

  if (!currentUser) return <Navigate to="/login" replace />;

  // If user has a school available, redirect to the prefixed URL
  const schoolId =
    currentSchool?.schoolId || currentUser.schools?.[0]?.schoolId;
  if (schoolId) {
    return (
      <Navigate
        to={`/${currentUser.academyId}/${schoolId}${location.pathname}${location.search}${location.hash}`}
        replace
      />
    );
  }

  // No school — render admin pages directly (admin needs to create schools first)
  if (!["admin", "manager"].includes(currentUser.auth)) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

function RouterPage() {
  const { currentUser, currentSchool } = useAuth();

  /** Home path for authenticated users (used to redirect away from login) */
  const getHomePath = (): string => {
    if (!currentUser) return "/login";
    const schoolId =
      currentSchool?.schoolId || currentUser.schools?.[0]?.schoolId;
    if (schoolId) return `/${currentUser.academyId}/${schoolId}/`;
    if (["admin", "manager"].includes(currentUser.auth))
      return "/admin/schools/list";
    return "/login";
  };

  // authenticate path with simple userlogin check
  const RequireAuth = ({
    children,
    auth,
  }: {
    children: JSX.Element;
    auth?: string[];
  }) => {
    const { academyId: urlAcademyId } = useParams<{
      academyId: string;
    }>();

    if (
      currentUser &&
      auth !== undefined &&
      !auth?.includes(currentUser.auth)
    ) {
      alert("잘못된 접근입니다.");
      if (currentUser?.academyId && currentSchool?.schoolId) {
        return (
          <Navigate
            to={`/${currentUser.academyId}/${currentSchool.schoolId}/`}
          />
        );
      }
      return <Navigate to="/login" />;
    }

    if (!currentUser) {
      // If the URL already contains an academy ID, go directly to its login page
      if (urlAcademyId) {
        return <Navigate to={`/${urlAcademyId}/login`} replace />;
      }
      return <Navigate to="/login" replace />;
    }

    return children;
  };

  return (
    <div className="main" id="main">
      <BrowserRouter>
        {currentUser && <Sidebar />}
        <div
          className="content"
          id="content"
        >
          <AlterProvider>
          {currentUser && <Navbar />}
          <Routes>
            {/* ----------------------------------------------------- */}

            {/* basic routes (no prefix) */}
            <Route
              path="login"
              element={
                currentUser ? (
                  <Navigate to={getHomePath()} replace />
                ) : (
                  <ChooseAcademy />
                )
              }
            ></Route>
            <Route
              path=":pid/login"
              element={
                currentUser ? (
                  <Navigate to={getHomePath()} replace />
                ) : (
                  <Login />
                )
              }
            ></Route>
            <Route path="register" element={<Register />}></Route>

            {/* ----------------------------------------------------- */}

            {/* owner routes (no prefix - owner has no school context) */}
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
              <Route
                path="academies/:pid/:school"
                element={
                  <RequireAuth auth={["owner"]}>
                    <AcademySchool />
                  </RequireAuth>
                }
              ></Route>
            </Route>

            {/* ----------------------------------------------------- */}

            {/* legacy URL redirects (no /:academyId/:schoolId prefix) */}
            {/* Static segments score higher than dynamic params in React Router v6,
                so these will always match before :academyId/:schoolId for unprefixed URLs */}

            {/* admin routes: redirect to prefixed URL if school exists,
                otherwise render directly (admin with no schools yet) */}
            <Route path="admin" element={<AdminFallback />}>
              <Route path="" element={<Admin />} />
              <Route path="backup" element={<Backup />} />
              <Route path="site" element={<SiteAdmin />} />
              <Route path="users" element={<Users />} />
              <Route path="users/add" element={<Schools />} />
              <Route path="schools/list" element={<Schools />} />
              <Route path="schools/:pid" element={<School />} />
              <Route path="schools" element={<School />} />
              <Route path="forms" element={<Forms />} />
              <Route path="forms/:pid" element={<Form />} />
            </Route>
            <Route path="courses/*" element={<LegacyRedirect />} />
            <Route path="forms/*" element={<LegacyRedirect />} />
            <Route path="archive/*" element={<LegacyRedirect />} />
            <Route path="myArchive/*" element={<LegacyRedirect />} />
            <Route path="docs" element={<LegacyRedirect />} />
            <Route path="notifications" element={<LegacyRedirect />} />
            <Route path="chat" element={<LegacyRedirect />} />
            <Route path="boards/*" element={<LegacyRedirect />} />
            <Route path="settings" element={<LegacyRedirect />} />
            <Route path="myaccount" element={<LegacyRedirect />} />
            <Route path="search/*" element={<LegacyRedirect />} />
            <Route path="dev/*" element={<LegacyRedirect />} />

            {/* ----------------------------------------------------- */}

            {/* authenticated routes (under /:academyId/:schoolId) */}
            <Route
              path=":academyId/:schoolId"
              element={<UrlContextSync />}
            >
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

              {/* academy admin & manager routes */}
              <Route path="admin">
                <Route
                  path=""
                  element={
                    <RequireAuth auth={["admin", "manager"]}>
                      <Admin />
                    </RequireAuth>
                  }
                ></Route>
                <Route
                  path="backup"
                  element={
                    <RequireAuth auth={["admin"]}>
                      <Backup />
                    </RequireAuth>
                  }
                ></Route>
                <Route
                  path="site"
                  element={
                    <RequireAuth auth={["admin"]}>
                      <SiteAdmin />
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
                    <RequireAuth auth={["admin", "manager"]}>
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
                  <Route path="*" element={<Http404 />}></Route>
                </Route>

                {/* ----------------------------------------------------- */}

                {/* error routes */}
                <Route path="*" element={<Http404 />}></Route>

                {/* ----------------------------------------------------- */}
              </Route>

              {/* ----------------------------------------------------- */}

              {/* forms routes */}
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

              {/* courses routes */}
              <Route path="courses">
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
                  path="status"
                  element={
                    <RequireAuth>
                      <CourseEnrollStatus />
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
                  path="classrooms"
                  element={
                    <RequireAuth>
                      <Classrooms />
                    </RequireAuth>
                  }
                ></Route>

                <Route
                  path="enrolled/:pid"
                  element={
                    <RequireAuth>
                      <CourseEnrollmentPid />
                    </RequireAuth>
                  }
                ></Route>

                <Route
                  path="created/:pid"
                  element={
                    <RequireAuth>
                      <CourseCreatedPid />
                    </RequireAuth>
                  }
                ></Route>

                <Route
                  path="edit/:pid"
                  element={
                    <RequireAuth>
                      <CourseEditPid />
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
                path="myArchive"
                element={
                  <RequireAuth>
                    <ArchiveViewer />
                  </RequireAuth>
                }
              ></Route>
              <Route
                path="myArchive/:pid"
                element={
                  <RequireAuth>
                    <ArchiveViwerField />
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

              {/* boards routes */}
              <Route path="boards">
                <Route
                  path=""
                  element={
                    <RequireAuth>
                      <Boards />
                    </RequireAuth>
                  }
                ></Route>
                <Route
                  path=":boardId"
                  element={
                    <RequireAuth>
                      <BoardPid />
                    </RequireAuth>
                  }
                ></Route>
                <Route
                  path=":boardId/post/:postId"
                  element={
                    <RequireAuth>
                      <PostPid />
                    </RequireAuth>
                  }
                ></Route>
                <Route
                  path=":boardId/create"
                  element={
                    <RequireAuth>
                      <PostCreate />
                    </RequireAuth>
                  }
                ></Route>
                <Route
                  path=":boardId/edit/:postId"
                  element={
                    <RequireAuth>
                      <PostCreate />
                    </RequireAuth>
                  }
                ></Route>
              </Route>

              <Route
                path="goals"
                element={
                  <RequireAuth>
                    <GoalsDashboard />
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

              {/* search result routes */}
              <Route
                path="search/:uid"
                element={
                  <RequireAuth>
                    <UserSearchResult />
                  </RequireAuth>
                }
              ></Route>

              {/* dev routes */}
              <Route path="dev">
                <Route
                  path=""
                  element={
                    <RequireAuth>
                      <Dev />
                    </RequireAuth>
                  }
                ></Route>
                <Route path="test" element={<Test />}></Route>
                <Route path="e" element={<E />}></Route>
                <Route path="*" element={<Http404 />}></Route>
              </Route>
              {/* ----------------------------------------------------- */}

              {/* error routes */}
              <Route path="*" element={<Http404 />}></Route>

              {/* ----------------------------------------------------- */}
            </Route>

            {/* ----------------------------------------------------- */}

            {/* backward compatibility: redirect old paths to prefixed versions */}
            <Route path="*" element={<LegacyRedirect />} />

            {/* ----------------------------------------------------- */}
          </Routes>
          </AlterProvider>
        </div>
      </BrowserRouter>
    </div>
  );
}

export default RouterPage;
