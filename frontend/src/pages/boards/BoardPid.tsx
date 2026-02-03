/**
 * @file Board Posts List Page - Redirects to main boards page with boardId
 *
 * @author
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 *
 * -------------------------------------------------------
 */

import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const BoardPid = () => {
  const navigate = useNavigate();
  const { boardId } = useParams<{ boardId: string }>();

  useEffect(() => {
    // Redirect to the main boards page with the boardId parameter
    if (boardId) {
      navigate(`/boards?boardId=${boardId}`, { replace: true });
    } else {
      navigate("/boards", { replace: true });
    }
  }, [boardId, navigate]);

  return null;
};

export default BoardPid;
