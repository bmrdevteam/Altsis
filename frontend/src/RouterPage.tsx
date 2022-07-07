import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
// import { useAuth } from "./contexts/authContext";
import Home from "./pages";
import Login from "./pages/Login";
// import Http404 from "./pages/error/404";

function RouterPage() {
  // const RequireAuth = ({ children }: { children: JSX.Element }) => {
  //   const { currentUser } = useAuth();

  //   return currentUser ? children : <Navigate to="/login" />;
  // };
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/">
          <Route
            index
            element={
              // <RequireAuth>
              <Home />
              // </RequireAuth>
            }
          ></Route>
          <Route path="login" element={<Login />}></Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default RouterPage;
