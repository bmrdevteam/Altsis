import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Sidebar from "./layout/navbar/Sidebar";
import Http404 from "./pages/error/404";
import { useAuth } from "./contexts/authContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

import Academy from "./pages/Academy";
import { useSidebar } from "./contexts/sidebarContext";
import Test from "./pages/Test";

// import Http404 from "./pages/error/404";

function RouterPage() {
  const { sidebarClose } = useSidebar();

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
              <Route index element={<Home />}></Route>
              <Route path="academy" element={<Academy />}></Route>
              <Route path="login" element={<Login />}></Route>
              <Route path="Register" element={<Register />}></Route>

              <Route path="test" element={<Test />}></Route>
            </Route>
            {/* 마지막에 404 페이지 */}
            <Route path="*" element={<Http404 />}></Route>
          </Routes>
        </div>
      </BrowserRouter>
    </div>
  );
}

export default RouterPage;
