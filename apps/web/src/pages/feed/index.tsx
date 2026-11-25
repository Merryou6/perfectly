import { useEffect, useState } from "react";
import Taro, { useDidShow, useRouter } from "@tarojs/taro";
import { Text, View } from "@tarojs/components";
import {
  Check,
  Clock3,
  Hash,
  House,
  LoaderCircle,
  PenLine,
  RotateCcw,
  Settings2,
  Users,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { CommunityCardRenderer } from "@/components/CommunityCardRenderer";
import { PostCard } from "@/components/PostCard";
import { request } from "@/services/request";
import { useAuthStore } from "@/store/auth";
import type {
  CommunityDetail,
  CommunityCardAction,
  CommunitySummary,
  CommunityViewerState,
  JoinCommunityResult,
  PageResult,
  Post,
  PublishedCommunityPage,
} from "@/types";
import "./index.css";

export default function FeedPage() {
  const router = useRouter();
  const initialCommunityId = Number(router.params.communityId || 0);
  const { user, token, restoreSession } = useAuthStore();
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [community, setCommunity] = useState<CommunityDetail | null>(null);
  const [viewerState, setViewerState] = useState<CommunityViewerState | null>(null);
  const [cardPage, setCardPage] = useState<PublishedCommunityPage | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  const loadCommunity = async (communityId: number, sectionId: number | null = null) => {
    setLoading(true);
    setError("");
    try {
      const [detail, postResult, membershipState, publishedPage] = await Promise.all([
        request<CommunityDetail>({ path: `/communities/${communityId}` }),
        request<PageResult<Post>>({
          path: `/posts?communityId=${communityId}${
            sectionId ? `&sectionId=${sectionId}` : ""
          }&page=1&pageSize=20`,
        }),
        token
          ? request<CommunityViewerState>({
              path: `/communities/${communityId}/me`,
              auth: true,
            }).catch(() => null)
          : Promise.resolve(null),
        request<PublishedCommunityPage | null>({
          path: `/communities/${communityId}/pages/home`,
        }),
      ]);
      setCommunity(detail);
      setViewerState(membershipState);
      setCardPage(publishedPage);
      setPosts(postResult.items);
      setActiveSectionId(sectionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "社区内容加载失败");
    } finally {
      setLoading(false);
    }
  };

  const bootstrap = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await request<PageResult<CommunitySummary>>({
        path: "/communities?page=1&pageSize=20",
      });
      setCommunities(result.items);
      const targetId =
        (initialCommunityId > 0
          ? result.items.find((item) => item.id === initialCommunityId)?.id
          : undefined) ??
        community?.id ??
        result.items[0]?.id;
      if (!targetId) {
        setLoading(false);
        return;
      }
      await loadCommunity(targetId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "社区列表加载失败");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      void restoreSession();
    }
  }, [token, restoreSession]);

  useDidShow(() => {
    void bootstrap();
  });

  const selectCommunity = (communityId: number) => {
    if (communityId === community?.id) return;
    void loadCommunity(communityId);
  };

  const selectSection = async (sectionId: number | null) => {
    if (!community || sectionId === activeSectionId) return;
    setActiveSectionId(sectionId);
    setError("");
    try {
      const result = await request<PageResult<Post>>({
        path: `/posts?communityId=${community.id}${
          sectionId ? `&sectionId=${sectionId}` : ""
        }&page=1&pageSize=20`,
      });
      setPosts(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "帖子加载失败");
    }
  };

  const joinCommunity = async () => {
    if (!community) return;
    if (!user || !token) {
      Taro.navigateTo({ url: "/pages/login/index" });
      return;
    }

    setJoining(true);
    try {
      const result = await request<JoinCommunityResult>({
        path: `/communities/${community.id}/join`,
        method: "POST",
        auth: true,
        data: {},
      });
      setViewerState(result);
      Taro.showToast({
        title:
          result.membership?.status === "APPROVED"
            ? "已加入社区"
            : "申请已提交，等待审核",
        icon: "none",
      });
      await loadCommunity(community.id, activeSectionId);
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : "加入失败",
        icon: "none",
      });
    } finally {
      setJoining(false);
    }
  };

  const isMember = viewerState?.membership?.status === "APPROVED";
  const isPending = viewerState?.joinRequest?.status === "PENDING";
  const canPost =
    Boolean(community) &&
    (user?.role === "ADMIN" || !community?.memberPostingOnly || isMember);
  const canManageCards =
    Boolean(community) &&
    Boolean(user) &&
    (user?.role === "ADMIN" ||
      community?.ownerId === user?.id ||
      (viewerState?.membership?.role === "ADMIN" &&
        viewerState.membership.status === "APPROVED"));

  const openPublish = () => {
    if (!community) return;
    if (!user || !token) {
      Taro.navigateTo({ url: "/pages/login/index" });
      return;
    }
    if (!canPost) {
      Taro.showToast({ title: "加入社区后即可发布帖子", icon: "none" });
      return;
    }
    const sectionId = activeSectionId ?? community.sections[0]?.id;
    Taro.navigateTo({
      url: `/pages/publish/index?communityId=${community.id}${
        sectionId ? `&sectionId=${sectionId}` : ""
      }`,
    });
  };

  const openPost = (post: Post) => {
    Taro.navigateTo({ url: `/pages/post-detail/index?id=${post.id}` });
  };

  const openCardEditor = () => {
    if (!community) return;
    Taro.navigateTo({
      url: `/pages/card-editor/index?communityId=${community.id}&pageKey=home`,
    });
  };

  const handleCardAction = (action: CommunityCardAction) => {
    if (action === "browse-posts") {
      void Taro.pageScrollTo({ selector: "#community-posts", duration: 300 });
      return;
    }
    if (action === "join-community") {
      if (!isMember) void joinCommunity();
      return;
    }
    openPublish();
  };

  return (
    <View className="page-frame">
      <AppHeader />
      <View className="feed-shell">
        <View className="feed-layout">
          <View className="feed-sidebar">
            <View className="feed-nav">
              <View className="feed-nav__item feed-nav__item--active">
                <House size={18} />
                <Text>社区广场</Text>
              </View>
              <View className="feed-nav__item" onClick={openPublish}>
                <PenLine size={18} />
                <Text>发布帖子</Text>
              </View>
            </View>

            <View className="feed-sidebar__section">
              <Text className="feed-sidebar__eyebrow">我的社区</Text>
              <View className="community-nav">
                {communities.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`community-nav__item ${
                      item.id === community?.id ? "community-nav__item--active" : ""
                    }`}
                    onClick={() => selectCommunity(item.id)}
                  >
                    <View className="community-nav__mark">
                      <Hash size={14} />
                    </View>
                    <View className="community-nav__copy">
                      <Text className="community-nav__name">{item.name}</Text>
                      <Text className="community-nav__meta">
                        {item.memberCount} 位成员
                      </Text>
                    </View>
                  </button>
                ))}
              </View>
            </View>

            <View className="feed-sidebar__note">
              <Text className="feed-sidebar__eyebrow">当前阶段</Text>
              <Text className="feed-sidebar__copy">
                先跑通社区、分区和帖子的主流程。评论、媒体与审核会沿这套接口继续扩展。
              </Text>
            </View>
          </View>

          <View className="feed-main">
            <View className="community-mobile-switch">
              {communities.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`community-chip ${
                    item.id === community?.id ? "community-chip--active" : ""
                  }`}
                  onClick={() => selectCommunity(item.id)}
                >
                  {item.name}
                </button>
              ))}
            </View>

            {error ? (
              <View className="feed-state">
                <Text className="feed-state__title">社区内容暂时没有加载出来</Text>
                <Text className="feed-state__copy">{error}</Text>
                <button type="button" className="secondary-button" onClick={bootstrap}>
                  <RotateCcw size={16} />
                  重试
                </button>
              </View>
            ) : loading && !community ? (
              <View className="feed-state feed-state--loading">
                <LoaderCircle className="spin" size={24} />
                <Text className="feed-state__copy">正在加载社区</Text>
              </View>
            ) : community ? (
              <>
                <View className="community-hero">
                  <View className="community-hero__copy">
                    <Text className="community-hero__eyebrow">COMMUNITY</Text>
                    <Text className="community-hero__title">{community.name}</Text>
                    <Text className="community-hero__description">
                      {community.description}
                    </Text>
                    <View className="community-hero__stats">
                      <View className="community-stat">
                        <Users size={15} />
                        <Text>{community.memberCount} 位成员</Text>
                      </View>
                      <View className="community-stat">
                        <Hash size={15} />
                        <Text>{community.postCount} 篇帖子</Text>
                      </View>
                    </View>
                  </View>

                  <View className="community-hero__actions">
                    {canManageCards ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={openCardEditor}
                      >
                        <Settings2 size={16} />
                        管理卡片
                      </button>
                    ) : null}
                    {isMember || user?.role === "ADMIN" ? (
                      <View className="community-membership">
                        <Check size={15} />
                        已加入
                      </View>
                    ) : isPending ? (
                      <button type="button" className="secondary-button" disabled>
                        <Clock3 size={16} />
                        审核中
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="primary-button"
                        onClick={joinCommunity}
                        disabled={joining}
                      >
                        {joining ? <LoaderCircle className="spin" size={16} /> : null}
                        {joining ? "处理中" : "加入社区"}
                      </button>
                    )}
                  </View>
                </View>

                {cardPage ? (
                  <CommunityCardRenderer
                    schema={cardPage.schema}
                    memberCount={community.memberCount}
                    postCount={community.postCount}
                    onAction={handleCardAction}
                  />
                ) : null}

                <View className="section-filter">
                  <button
                    type="button"
                    className={`section-filter__item ${
                      activeSectionId === null ? "section-filter__item--active" : ""
                    }`}
                    onClick={() => selectSection(null)}
                  >
                    全部
                  </button>
                  {community.sections.map((section) => (
                    <button
                      type="button"
                      key={section.id}
                      className={`section-filter__item ${
                        activeSectionId === section.id
                          ? "section-filter__item--active"
                          : ""
                      }`}
                      onClick={() => selectSection(section.id)}
                    >
                      {section.name}
                    </button>
                  ))}
                </View>

                <View className="compose-prompt" onClick={openPublish}>
                  <View className="compose-prompt__icon">
                    <PenLine size={18} />
                  </View>
                  <Text className="compose-prompt__text">
                    {!user
                      ? "登录后参与社区讨论"
                      : canPost
                        ? `${user.displayName}，在 ${community.name} 写点什么？`
                        : "加入社区后即可发布帖子"}
                  </Text>
                  <Text className="compose-prompt__action">
                    {canPost ? "发帖" : "了解权限"}
                  </Text>
                </View>

                <View id="community-posts" />
                {loading ? (
                  <View className="feed-state feed-state--loading">
                    <LoaderCircle className="spin" size={22} />
                    <Text className="feed-state__copy">正在加载帖子</Text>
                  </View>
                ) : posts.length ? (
                  <View className="post-list">
                    {posts.map((post) => (
                      <PostCard key={post.id} post={post} onOpen={openPost} />
                    ))}
                  </View>
                ) : (
                  <View className="feed-state">
                    <Text className="feed-state__title">这个分区还没有帖子</Text>
                    <Text className="feed-state__copy">
                      换一个分区看看，或者留下第一篇内容。
                    </Text>
                    <button type="button" className="primary-button" onClick={openPublish}>
                      <PenLine size={16} />
                      发布帖子
                    </button>
                  </View>
                )}
              </>
            ) : (
              <View className="feed-state">
                <Text className="feed-state__title">还没有可浏览的社区</Text>
                <Text className="feed-state__copy">
                  运行种子数据后，这里会出现用于联调的社区和帖子。
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
