import { useEffect } from "react";
import { useAppNavigate } from "hooks/useAppNavigate";

const RedirectToAppSettings = () => {
  const navigate = useAppNavigate();

  useEffect(() => {
    navigate("/settings?tab=app", { replace: true });
  }, [navigate]);

  return null;
};

export default RedirectToAppSettings;
