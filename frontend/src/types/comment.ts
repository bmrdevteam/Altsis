export type TComment = {
  _id: string;
  post: string;
  author: string;
  authorId: string;
  authorName: string;
  authorProfile?: string;
  content: string;
  isActive: boolean;
  parentComment?: string | null;
  createdAt: string;
  updatedAt: string;
};
