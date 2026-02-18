import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "contexts/authContext";
import { useAppNavigate } from "hooks/useAppNavigate";
import useAPIv2 from "hooks/useAPIv2";
import { SidebarData, INavLink } from "layout/sidebar/SidebarData";
import { TSyllabus } from "types/syllabuses";
import { CommandItem, CommandGroup, RecentItem } from "./types";

const STORAGE_KEY = "commandPaletteRecent";
const MAX_RECENT = 5;
const MAX_RESULTS_PER_CATEGORY = 5;

const roleLabel: Record<string, string> = {
  student: "학생",
  teacher: "교사",
  parents: "학부모",
  admin: "관리자",
};

export function getRecentSearches(): RecentItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveRecentSearch(item: CommandItem) {
  const recent = getRecentSearches();
  const filtered = recent.filter((r) => r.label !== item.label);
  filtered.unshift({
    label: item.label,
    description: item.description,
    category: item.category,
    icon: item.icon,
    path: item.id,
  });
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(filtered.slice(0, MAX_RECENT))
  );
}

export function clearRecentSearches() {
  localStorage.removeItem(STORAGE_KEY);
}

const useCommandPaletteSearch = (query: string) => {
  const { currentUser, currentRegistration, currentSeason } = useAuth();
  const { SyllabusAPI } = useAPIv2();
  const navigate = useAppNavigate();

  const [courseResults, setCourseResults] = useState<TSyllabus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const syllabusCache = useRef<TSyllabus[] | null>(null);

  // Page items from SidebarData (flattened)
  const pageItems = useMemo((): CommandItem[] => {
    if (!currentUser) return [];

    const sidebarItems: INavLink[] = SidebarData(
      currentUser.auth,
      currentRegistration?.role
    );

    return sidebarItems.flatMap((item) => {
      const items: CommandItem[] = [];

      if (item.path) {
        items.push({
          id: `page-${item.title}`,
          category: "page",
          label: item.name,
          icon: "search",
          action:
            item.type === "link"
              ? () => window.open(item.path!, "_blank")
              : () => navigate(item.path!),
        });
      }

      if (item.subLink) {
        for (const sub of item.subLink) {
          items.push({
            id: `page-${item.title}-${sub.title}`,
            category: "page",
            label: `${item.name} > ${sub.name}`,
            icon: "search",
            action:
              sub.type === "link"
                ? () => window.open(sub.path, "_blank")
                : () => navigate(sub.path),
          });
        }
      }

      return items;
    });
  }, [currentUser, currentRegistration, navigate]);

  // User items from registrations
  const userItems = useMemo((): CommandItem[] => {
    if (!currentSeason?.registrations) return [];

    return currentSeason.registrations.map((reg) => {
      const role = reg.role ? roleLabel[reg.role] || reg.role : "";
      const parts = [role, reg.grade, reg.group].filter(Boolean);

      return {
        id: `user-${reg.user}`,
        category: "user" as const,
        label: reg.userName,
        description: `${reg.userId}${parts.length > 0 ? ` · ${parts.join(" ")}` : ""}`,
        icon: "user",
        action: () => navigate(`/search/${reg.user}`),
      };
    });
  }, [currentSeason, navigate]);

  // Course search (debounced API call + cache)
  useEffect(() => {
    if (query.length < 2) {
      setCourseResults([]);
      return;
    }

    const debounce = setTimeout(async () => {
      if (!syllabusCache.current && currentRegistration?.season) {
        setIsLoading(true);
        try {
          const { syllabuses } = await SyllabusAPI.RSyllabuses({
            query: { season: currentRegistration.season },
          });
          syllabusCache.current = syllabuses;
        } catch {
          syllabusCache.current = [];
        }
        setIsLoading(false);
      }

      if (syllabusCache.current) {
        const filtered = syllabusCache.current.filter(
          (s) =>
            s.classTitle.includes(query) ||
            s.userName.includes(query) ||
            s.teachers?.some((t) => t.userName.includes(query))
        );
        setCourseResults(filtered);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, currentRegistration]);

  // Build course CommandItems
  const courseItems = useMemo((): CommandItem[] => {
    return courseResults.map((s) => {
      const teacherNames = s.teachers
        ?.filter((t) => t.confirmed)
        .map((t) => t.userName)
        .join(", ");
      const timeDesc = s.time
        ?.map((t) => `${t.day} ${t.start}~${t.end}`)
        .join(", ");
      const parts = [teacherNames, s.classroom, timeDesc].filter(Boolean);

      return {
        id: `course-${s._id}`,
        category: "course" as const,
        label: s.classTitle,
        description: parts.join(" · "),
        icon: "menuBook",
        action: () => navigate(`/courses/list`),
      };
    });
  }, [courseResults, navigate]);

  // Filter and group results
  const results = useMemo((): CommandGroup[] => {
    const trimmed = query.trim();
    const groups: CommandGroup[] = [];

    if (!trimmed) {
      // Empty query: show quick navigation (all pages)
      if (pageItems.length > 0) {
        groups.push({
          category: "page",
          label: "빠른 이동",
          items: pageItems,
        });
      }
      return groups;
    }

    // Filter pages
    const filteredPages = pageItems
      .filter((item) => item.label.includes(trimmed))
      .slice(0, MAX_RESULTS_PER_CATEGORY);

    if (filteredPages.length > 0) {
      groups.push({
        category: "page",
        label: "페이지",
        items: filteredPages,
      });
    }

    // Filter users
    const filteredUsers = userItems
      .filter(
        (item) =>
          item.label.includes(trimmed) ||
          (item.description && item.description.includes(trimmed))
      )
      .slice(0, MAX_RESULTS_PER_CATEGORY);

    if (filteredUsers.length > 0) {
      groups.push({
        category: "user",
        label: "사용자",
        items: filteredUsers,
      });
    }

    // Courses (already filtered via API/cache)
    const limitedCourses = courseItems.slice(0, MAX_RESULTS_PER_CATEGORY);
    if (limitedCourses.length > 0) {
      groups.push({
        category: "course",
        label: "수업",
        items: limitedCourses,
      });
    }

    return groups;
  }, [query, pageItems, userItems, courseItems]);

  const flatResults = useMemo(
    () => results.flatMap((group) => group.items),
    [results]
  );

  return { results, flatResults, isLoading };
};

export default useCommandPaletteSearch;
