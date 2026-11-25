export type UserRole = "USER" | "ADMIN";
export type UserStatus = "ACTIVE" | "DISABLED" | "DELETED";
export type CommunityStatus = "NORMAL" | "FROZEN" | "ARCHIVED";
export type CommunityMemberRole = "ADMIN" | "MEMBER";
export type CommunityMemberStatus = "PENDING" | "APPROVED" | "REJECTED" | "LEFT";
export type JoinRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type PostStatus = "PENDING" | "PUBLISHED" | "HIDDEN" | "DELETED";
export type PageVersionStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type CommunityPageAccent = "forest" | "ocean" | "amber";
export type CommunityCardType = "hero" | "notice" | "stats" | "action";
export type CommunityCardAction =
  | "publish-post"
  | "join-community"
  | "browse-posts";

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
  requestId?: string;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

export interface UserSummary {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface User extends UserSummary {
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  expiresIn: number;
  user: User;
}

export interface SectionSummary {
  id: number;
  communityId: number;
  name: string;
  sortOrder: number;
}

export interface CommunitySummary {
  id: number;
  name: string;
  slug: string;
  description: string;
  ownerId: number;
  joinApprovalRequired: boolean;
  memberPostingOnly: boolean;
  status: CommunityStatus;
  memberCount: number;
  postCount: number;
  createdAt: string;
}

export interface CommunityDetail extends CommunitySummary {
  sections: SectionSummary[];
}

export interface ViewerMembership {
  id: number;
  role: CommunityMemberRole;
  status: CommunityMemberStatus;
}

export interface ViewerJoinRequest {
  id: number;
  status: JoinRequestStatus;
  createdAt: string;
}

export interface CommunityViewerState {
  membership: ViewerMembership | null;
  joinRequest: ViewerJoinRequest | null;
}

export interface JoinCommunityResult extends CommunityViewerState {}

export interface PostAuthor extends UserSummary {}

export interface PostCommunityRef {
  id: number;
  name: string;
  slug: string;
}

export interface PostSectionRef {
  id: number;
  name: string;
}

export interface Post {
  id: number;
  title: string | null;
  body: string;
  postType: string;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
  community: PostCommunityRef;
  section: PostSectionRef;
}

export interface CreatePostInput {
  communityId: number;
  sectionId: number;
  title?: string;
  body: string;
}

export interface UpdatePostInput {
  title?: string;
  body?: string;
}

export interface CommunityCard {
  id: string;
  type: CommunityCardType;
  title: string;
  body: string;
  action: CommunityCardAction | null;
}

export interface CommunityPageSchema {
  version: 1;
  theme: {
    accent: CommunityPageAccent;
  };
  cards: CommunityCard[];
}

export interface PageVersionSummary {
  id: number;
  versionNo: number;
  status: PageVersionStatus;
  changeSummary: string | null;
  createdBy: Pick<UserSummary, "id" | "displayName">;
  publishedAt: string | null;
  createdAt: string;
}

export interface PublishedCommunityPage {
  pageId: number;
  pageKey: string;
  versionNo: number;
  schema: CommunityPageSchema;
  publishedAt: string;
}

export interface CommunityPageDraftState {
  pageId: number | null;
  pageKey: string;
  draftSchema: CommunityPageSchema;
  published: PublishedCommunityPage | null;
  versions: PageVersionSummary[];
}
