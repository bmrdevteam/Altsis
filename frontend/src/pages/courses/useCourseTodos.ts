import { useEffect, useMemo, useState } from "react";
import { useAuth } from "contexts/authContext";
import useAPIv2 from "hooks/useAPIv2";
import {
  courseTodosCacheKey,
  getCourseTodosCached,
  invalidateCourseTodosCache,
  type TCourseTodoItem,
  type TCourseTodosResult,
} from "./courseTodosCache";
import { evaluationBySyllabusId } from "./groupCourseTodos";

/**
 * Shared course-todos fetch (Sidebar / Courses lists).
 */
export function useCourseTodos() {
  const { currentSchool, currentRegistration, currentSeason } = useAuth();
  const { SyllabusAPI } = useAPIv2();
  const [items, setItems] = useState<TCourseTodoItem[]>([]);
  const [count, setCount] = useState(0);

  const schoolId = currentSchool?._id;
  const seasonId =
    currentRegistration?.season || currentSeason?._id || undefined;

  const refresh = () => {
    if (!schoolId || !seasonId) {
      setItems([]);
      setCount(0);
      return;
    }
    const key = courseTodosCacheKey(schoolId, seasonId);
    invalidateCourseTodosCache(key);
    getCourseTodosCached(key, () =>
      SyllabusAPI.RSyllabusCourseTodos({
        query: { school: schoolId, season: seasonId },
      })
    )
      .then((res: TCourseTodosResult) => {
        setItems(res.items || []);
        setCount(res.count || 0);
      })
      .catch(() => {
        setItems([]);
        setCount(0);
      });
  };

  useEffect(() => {
    if (!schoolId || !seasonId) {
      setItems([]);
      setCount(0);
      return;
    }
    let cancelled = false;
    const key = courseTodosCacheKey(schoolId, seasonId);
    getCourseTodosCached(key, () =>
      SyllabusAPI.RSyllabusCourseTodos({
        query: { school: schoolId, season: seasonId },
      })
    )
      .then((res: TCourseTodosResult) => {
        if (!cancelled) {
          setItems(res.items || []);
          setCount(res.count || 0);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setCount(0);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [schoolId, seasonId]);

  const evaluationMap = useMemo(
    () => evaluationBySyllabusId(items),
    [items]
  );

  return {
    items,
    count,
    evaluationBySyllabusId: evaluationMap,
    refresh,
  };
}
