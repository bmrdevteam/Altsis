import { useNavigate, NavigateOptions, To } from "react-router-dom";
import { useAppPrefix } from "./useAppPrefix";
import { useAuth } from "contexts/authContext";

const UNPREFIXED_PATHS = ["/login", "/register", "/owner", "/guide"];

function shouldPrefix(path: string): boolean {
  if (!path.startsWith("/")) return false;
  for (const up of UNPREFIXED_PATHS) {
    if (path === up || path.startsWith(up + "/") || path.startsWith(up + "?")) {
      return false;
    }
  }
  if (/^\/[^/]+\/login/.test(path)) return false;
  return true;
}

export function useAppNavigate() {
  const navigate = useNavigate();
  const prefix = useAppPrefix();
  const { currentUser } = useAuth();

  return (to: To | number, options?: NavigateOptions) => {
    if (typeof to === "number") {
      return navigate(to);
    }

    if (typeof to === "string") {
      if (to.startsWith("#")) {
        return navigate(to, options);
      }

      if (shouldPrefix(to)) {
        if (prefix && to.startsWith(prefix)) {
          return navigate(to, options);
        }
        // Already has academyId prefix (e.g. school switching to different school)
        if (
          currentUser?.academyId &&
          to.startsWith(`/${currentUser.academyId}/`)
        ) {
          return navigate(to, options);
        }
        return navigate(`${prefix}${to}`, options);
      }

      return navigate(to, options);
    }

    if (typeof to === "object" && to.pathname && shouldPrefix(to.pathname)) {
      if (prefix && !to.pathname.startsWith(prefix)) {
        if (
          currentUser?.academyId &&
          to.pathname.startsWith(`/${currentUser.academyId}/`)
        ) {
          return navigate(to, options);
        }
        return navigate(
          { ...to, pathname: `${prefix}${to.pathname}` },
          options
        );
      }
    }

    return navigate(to, options);
  };
}
