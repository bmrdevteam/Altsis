import { useMemo, useState } from "react";
import { TPost } from "types/post";
import { MarkdownViewer } from "components/markdown";
import style from "./postBlogView.module.scss";

type Props = {
  posts: TPost[];
  onClickPost: (post: TPost) => void;
};

const PAGE_SIZE = 10;

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

// S3 서명 URL → 만료되지 않는 리다이렉트 URL로 변환
const processContent = (content: string): string => {
  if (!content) return "";
  return content.replace(
    /https?:\/\/[^/\s)]*\.s3\.[^/\s)]*\.amazonaws\.com\/([^?\s)]+\/posts\/[^?\s)]+)\?[^\s)]*/g,
    (_match, key) =>
      `${process.env.REACT_APP_SERVER_URL}/api/posts/file/view?key=${encodeURIComponent(key)}`
  );
};

const PostBlogCard = ({
  post,
  onClickPost,
}: {
  post: TPost;
  onClickPost: (post: TPost) => void;
}) => {
  const processedContent = useMemo(
    () => processContent(post.content),
    [post.content]
  );

  return (
    <div className={style.card}>
      <div className={style.cardHeader}>
        <div>
          {post.isPinned && (
            <span className={style.pinnedBadge}>[공지]</span>
          )}
          <div
            className={style.cardTitle}
            onClick={() => onClickPost(post)}
          >
            {post.title}
          </div>
        </div>
      </div>

      <div className={style.authorRow}>
        <div
          className={style.authorAvatar}
          style={
            post.authorProfile
              ? { backgroundImage: `url(${post.authorProfile})` }
              : undefined
          }
        >
          {!post.authorProfile && post.authorName?.charAt(0)}
        </div>
        <span>{post.authorName}</span>
        <span className={style.dot}>·</span>
        <span>{formatDate(post.createdAt)}</span>
      </div>

      {post.content && (
        <div className={style.contentWrapper}>
          <MarkdownViewer content={processedContent} />
        </div>
      )}

      <div className={style.cardFooter}>
        <span>조회 {post.viewCount}</span>
      </div>
    </div>
  );
};

const PostBlogView = ({ posts, onClickPost }: Props) => {
  const [page, setPage] = useState(0);

  if (posts.length === 0) {
    return <div className={style.empty}>게시글이 없습니다.</div>;
  }

  const totalPages = Math.ceil(posts.length / PAGE_SIZE);
  const pagedPosts = posts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className={style.container}>
      {pagedPosts.map((post) => (
        <PostBlogCard
          key={post._id}
          post={post}
          onClickPost={onClickPost}
        />
      ))}

      {totalPages > 1 && (
        <div className={style.pagination}>
          <button
            className={style.pageBtn}
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            이전
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`${style.pageBtn} ${
                i === page ? style.pageBtnActive : ""
              }`}
              onClick={() => setPage(i)}
            >
              {i + 1}
            </button>
          ))}
          <button
            className={style.pageBtn}
            disabled={page === totalPages - 1}
            onClick={() => setPage(page + 1)}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
};

export default PostBlogView;
