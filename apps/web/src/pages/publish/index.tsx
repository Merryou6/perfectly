import { useEffect, useState } from "react";
import Taro, { useRouter } from "@tarojs/taro";
import { Input, Picker, Text, Textarea, View } from "@tarojs/components";
import {
  ArrowLeft,
  ChevronDown,
  LoaderCircle,
  Send,
  ShieldAlert,
} from "lucide-react";
import { request } from "@/services/request";
import { useAuthStore } from "@/store/auth";
import type {
  CommunityDetail,
  CommunitySummary,
  CommunityViewerState,
  PageResult,
  Post,
} from "@/types";
import "./index.css";

export default function PublishPage() {
  const router = useRouter();
  const editingId = Number(router.params.id || 0);
  const isEditing = Number.isFinite(editingId) && editingId > 0;
  const { token, user } = useAuthStore();
  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [community, setCommunity] = useState<CommunityDetail | null>(null);
  const [communityId, setCommunityId] = useState(Number(router.params.communityId || 0));
  const [sectionId, setSectionId] = useState(Number(router.params.sectionId || 0));
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [canPost, setCanPost] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !user) {
      Taro.redirectTo({ url: "/pages/login/index" });
    }
  }, [token, user]);

  useEffect(() => {
    void initialize();
  }, []);

  const initialize = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await request<PageResult<CommunitySummary>>({
        path: "/communities?page=1&pageSize=20",
      });
      setCommunities(result.items);

      if (isEditing) {
        const post = await request<Post>({ path: `/posts/${editingId}` });
        setTitle(post.title || "");
        setBody(post.body);
        setCommunityId(post.community.id);
        setSectionId(post.section.id);
        await loadCommunity(post.community.id, post.section.id, true);
      } else {
        const targetId =
          result.items.find((item) => item.id === communityId)?.id ??
          result.items[0]?.id;
        if (targetId) {
          await loadCommunity(targetId, sectionId, false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "发帖页面加载失败");
    } finally {
      setLoading(false);
    }
  };

  const loadCommunity = async (
    nextCommunityId: number,
    preferredSectionId: number,
    editing: boolean,
  ) => {
    const detail = await request<CommunityDetail>({
      path: `/communities/${nextCommunityId}`,
    });
    const membershipState = token
      ? await request<CommunityViewerState>({
          path: `/communities/${nextCommunityId}/me`,
          auth: true,
        }).catch(() => null)
      : null;
    const nextSectionId =
      detail.sections.find((section) => section.id === preferredSectionId)?.id ??
      detail.sections[0]?.id ??
      0;

    setCommunity(detail);
    setCommunityId(detail.id);
    setSectionId(nextSectionId);
    setCanPost(
      editing ||
        user?.role === "ADMIN" ||
        !detail.memberPostingOnly ||
        membershipState?.membership?.status === "APPROVED",
    );
  };

  const changeCommunity = async (index: number) => {
    if (isEditing) return;
    const next = communities[index];
    if (!next) return;
    setLoading(true);
    setError("");
    try {
      await loadCommunity(next.id, 0, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "社区切换失败");
    } finally {
      setLoading(false);
    }
  };

  const publish = async () => {
    if (!body.trim()) {
      setError("写点正文再发布吧");
      return;
    }
    if (!communityId || !sectionId) {
      setError("请选择社区和分区");
      return;
    }
    if (!canPost) {
      setError("加入社区后才能发布帖子");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const post = await request<Post>({
        path: isEditing ? `/posts/${editingId}` : "/posts",
        method: isEditing ? "PATCH" : "POST",
        auth: true,
        data: isEditing
          ? {
              title: title.trim() || undefined,
              body: body.trim(),
            }
          : {
              communityId,
              sectionId,
              title: title.trim() || undefined,
              body: body.trim(),
            },
      });
      Taro.showToast({ title: isEditing ? "帖子已更新" : "帖子已发布", icon: "none" });
      Taro.redirectTo({ url: `/pages/post-detail/index?id=${post.id}` });
    } catch (err) {
      setError(err instanceof Error ? err.message : "发布失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    Taro.navigateBack({
      fail: () => Taro.reLaunch({ url: "/pages/feed/index" }),
    });
  };

  const communityIndex = Math.max(
    0,
    communities.findIndex((item) => item.id === communityId),
  );
  const sectionIndex = Math.max(
    0,
    community?.sections.findIndex((item) => item.id === sectionId) ?? 0,
  );
  const activeSection = community?.sections[sectionIndex];

  return (
    <View className="page-frame publish-page">
      <View className="publish-topbar">
        <button type="button" className="icon-button" onClick={goBack} aria-label="返回">
          <ArrowLeft size={18} />
        </button>
        <Text className="publish-topbar__title">
          {isEditing ? "编辑帖子" : "发布帖子"}
        </Text>
        <button
          type="button"
          className="primary-button"
          onClick={publish}
          disabled={submitting || loading || !canPost}
        >
          {submitting ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}
          {submitting ? "保存中" : isEditing ? "保存" : "发布"}
        </button>
      </View>

      <View className="publish-layout">
        <View className="publish-editor">
          <View className="publish-editor__meta">
            <Text className="publish-editor__eyebrow">
              {isEditing ? "EDIT POST" : "NEW POST"}
            </Text>
            <Text className="publish-editor__author">{user?.displayName || "你"}</Text>
          </View>

          {loading ? (
            <View className="publish-loading">
              <LoaderCircle className="spin" size={22} />
              <Text>正在准备发帖信息</Text>
            </View>
          ) : (
            <>
              <View className="publish-selects">
                <View className="publish-field">
                  <Text className="field-label">社区</Text>
                  <Picker
                    mode="selector"
                    range={communities.map((item) => item.name)}
                    value={communityIndex}
                    disabled={isEditing}
                    onChange={(event) => void changeCommunity(Number(event.detail.value))}
                  >
                    <View className="select-control">
                      <Text>{community?.name || "选择社区"}</Text>
                      <ChevronDown size={16} />
                    </View>
                  </Picker>
                </View>

                <View className="publish-field">
                  <Text className="field-label">分区</Text>
                  <Picker
                    mode="selector"
                    range={community?.sections.map((item) => item.name) ?? []}
                    value={sectionIndex}
                    disabled={isEditing || !community?.sections.length}
                    onChange={(event) =>
                      setSectionId(
                        community?.sections[Number(event.detail.value)]?.id ?? 0,
                      )
                    }
                  >
                    <View className="select-control">
                      <Text>{activeSection?.name || "选择分区"}</Text>
                      <ChevronDown size={16} />
                    </View>
                  </Picker>
                </View>
              </View>

              {!canPost ? (
                <View className="publish-permission">
                  <ShieldAlert size={17} />
                  <Text>这个社区只允许成员发帖，请先回到社区首页加入。</Text>
                </View>
              ) : null}

              <View className="publish-field">
                <Text className="field-label">标题（可选）</Text>
                <Input
                  className="text-input publish-title"
                  value={title}
                  maxlength={100}
                  placeholder="给帖子一个清楚的标题"
                  onInput={(event) => setTitle(event.detail.value)}
                />
              </View>

              <View className="publish-field publish-field--content">
                <View className="publish-label-row">
                  <Text className="field-label">正文</Text>
                  <Text className="publish-count">{body.length} / 20000</Text>
                </View>
                <Textarea
                  className="text-area publish-textarea"
                  value={body}
                  maxlength={20000}
                  placeholder="写下你想分享的内容、问题或见闻。"
                  onInput={(event) => setBody(event.detail.value)}
                />
              </View>

              {error ? <Text className="form-error">{error}</Text> : null}

              <View className="publish-footer">
                <Text className="publish-footer__hint">
                  {isEditing
                    ? "修改后会立即更新"
                    : `发布到 ${community?.name || "社区"} · ${activeSection?.name || "分区"}`}
                </Text>
                <button
                  type="button"
                  className="primary-button"
                  onClick={publish}
                  disabled={submitting || loading || !canPost}
                >
                  {submitting ? "保存中" : isEditing ? "保存修改" : "发布帖子"}
                </button>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}
