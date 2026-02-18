import { TPost } from "types/post";
import style from "./postGalleryView.module.scss";

type Props = {
  posts: TPost[];
  onClickPost: (post: TPost) => void;
};

const fallbackColors = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#3b82f6",
  "#10b981",
  "#ef4444",
];

function getColorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return fallbackColors[Math.abs(hash) % fallbackColors.length];
}

function getInitials(title: string): string {
  return title.trim().substring(0, 2);
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const PostGalleryView = ({ posts, onClickPost }: Props) => {
  if (posts.length === 0) {
    return <div className={style.empty}>게시글이 없습니다.</div>;
  }

  return (
    <div className={style.container}>
      {posts.map((post) => (
          <div
            key={post._id}
            className={style.card}
            onClick={() => onClickPost(post)}
          >
            <div className={style.coverWrap}>
              <div
                className={style.coverPlaceholder}
                style={{ backgroundColor: getColorFromId(post._id) }}
              >
                <span className={style.coverInitials}>
                  {getInitials(post.title)}
                </span>
              </div>
              {post.isPinned && (
                <span className={style.pinnedBadge}>공지</span>
              )}
            </div>

            <div className={style.cardBody}>
              <div className={style.cardTitle}>{post.title}</div>
              <div className={style.cardFooter}>
                <span className={style.authorName}>{post.authorName}</span>
                <span>{formatDate(post.createdAt)}</span>
              </div>
            </div>
          </div>
      ))}
    </div>
  );
};

export default PostGalleryView;
