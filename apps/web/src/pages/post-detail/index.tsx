import { useEffect, useState } from "react";
import Taro, { useRouter } from "@tarojs/taro";
import { Text, View } from "@tarojs/components";
import { ArrowLeft, LoaderCircle, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { request } from "@/services/request";
import { useAuthStore } from "@/store/auth";
import type { Post } from "@/types";
import { fullDate } from "@/utils/date";
import "./index.css";

export default function PostDetailPage() {
  const router = useRouter();
  const id = Number(router.params.id);
  const { user } = useAuthStore();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadPost = async () => {
    if (!Number.isFinite(id)) {
      setError("动态不存在");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await request<Post>({ path: `/posts/${id}` });
      setPost(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "动态加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPost();
  }, [id]);

  const goBack = () => {
    Taro.navigateBack({
      fail: () => Taro.reLaunch({ url: "/pages/feed/index" }),
    });
  };

  const removePost = async () => {
    if (!post) return;
    const result = await Taro.showModal({
      title: "删除动态",
      content: "删除后无法恢复，确定继续吗？",
      confirmText: "删除",
      confirmColor: "#B94D31",
    });
    if (!result.confirm) return;

    setDeleting(true);
    try {
      await request<null>({
        path: `/posts/${post.id}`,
        method: "DELETE",
        auth: true,
      });
      Taro.showToast({ title: "动态已删除", icon: "none" });
      Taro.redirectTo({ url: "/pages/feed/index" });
    } catch (err) {
      Taro.showToast({
        title: err instanceof Error ? err.message : "删除失败",
        icon: "none",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View className="page-frame detail-page">
      <View className="detail-topbar">
        <button type="button" className="icon-button" onClick={goBack} aria-label="返回">
          <ArrowLeft size={18} />
        </button>
        <Text className="detail-topbar__title">动态详情</Text>
        {post && user?.id === post.author.id ? (
          <View className="detail-actions">
            <button
              type="button"
              className="icon-button"
              onClick={() => Taro.navigateTo({ url: `/pages/publish/index?id=${post.id}` })}
              aria-label="编辑动态"
            >
              <Pencil size={17} />
            </button>
            <button
              type="button"
              className="icon-button detail-delete"
              onClick={removePost}
              disabled={deleting}
              aria-label="删除动态"
            >
              <Trash2 size={17} />
            </button>
          </View>
        ) : (
          <View className="detail-topbar__spacer" />
        )}
      </View>

      <View className="detail-layout">
        {loading ? (
          <View className="detail-state">
            <LoaderCircle className="spin" size={24} />
            <Text>正在打开这条动态</Text>
          </View>
        ) : error || !post ? (
          <View className="detail-state">
            <Text className="detail-state__title">没有找到这条动态</Text>
            <Text className="detail-state__copy">{error || "它可能已经被删除"}</Text>
            <button type="button" className="secondary-button" onClick={loadPost}>
              <RotateCcw size={16} />
              重试
            </button>
          </View>
        ) : (
          <View className="detail-article">
            <View className="detail-author">
              <Avatar name={post.author.displayName} size="large" />
              <View className="detail-author__copy">
                <Text className="detail-author__name">{post.author.displayName}</Text>
                <Text className="detail-author__meta">@{post.author.username}</Text>
              </View>
            </View>

            <Text className="detail-date">{fullDate(post.createdAt)}</Text>
            {post.title ? <Text className="detail-title">{post.title}</Text> : null}
            <Text className="detail-content">{post.content}</Text>

            <View className="detail-end">
              <View className="detail-end__line" />
              <Text>END OF MOMENT</Text>
              <View className="detail-end__line" />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
