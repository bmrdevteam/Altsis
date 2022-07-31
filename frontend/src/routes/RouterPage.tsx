import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

//admin pages
import Academy from "../pages/admin/Academy";

//academy admin pages
import Schools from "../pages/academey/Schools";
import School from "../pages/academey/school/School";

//dev pages
import Test from "../pages/dev/Test";

// basic pages
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";

//error pages
import Http404 from "../pages/error/404";

//components
import Sidebar from "../layout/navbar/Sidebar";

//hooks
import { useAuth } from "../contexts/authContext";
import { useSidebar } from "../contexts/sidebarContext";

// import Http404 from "./pages/error/404";

function RouterPage() {
  const { sidebarClose } = useSidebar();

  // authenticate path with simple userlogin check
  const RequireAuth = ({ children }: { children: JSX.Element }) => {
    const { currentUser } = useAuth();
    return currentUser ? children : <Navigate to="/login" />;
  };

  return (
    <div className="main" id="main">
      <BrowserRouter>
        <Sidebar />
        <div
          className="content"
          style={{ maxWidth: `calc(100vw - ${sidebarClose ? 56 : 240}px)` }}
        >
          <Routes>
            <Route path="/">
              {/* ----------------------------------------------------- */}

              {/* index */}
              <Route index element={<Home />}></Route>

              {/* ----------------------------------------------------- */}

              {/* admin routes */}
              <Route path="admin">
                {/* <Route index element={<>}></Route>  */}
                <Route path="academy" element={<Academy />}></Route>
              </Route>

              {/* ----------------------------------------------------- */}

              {/* academy admin routes */}
              <Route path="academy">
                {/* [!make!] an hook to identify the number of */}
                <Route path="schools" element={<Schools />}></Route>
                <Route path="school/:pid" element={<School />}></Route>
              </Route>

              {/* ----------------------------------------------------- */}

              {/* basic routes */}
              <Route path="login" element={<Login />}></Route>
              <Route path="Register" element={<Register />}></Route>

              {/* ----------------------------------------------------- */}

              {/* dev routes */}
              <Route path="dev">
                <Route path="test" element={<Test />}></Route>
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
