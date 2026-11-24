import { useEffect, useState } from "react";
import Taro, { useDidShow } from "@tarojs/taro";
import { Text, View } from "@tarojs/components";
import {
  ArrowUpRight,
  House,
  LoaderCircle,
  PenLine,
  RotateCcw,
} from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { PostCard } from "@/components/PostCard";
import { request } from "@/services/request";
import { useAuthStore } from "@/store/auth";
import type { PageResult, Post } from "@/types";
import "./index.css";

export default function FeedPage() {
  const { user, token, restoreSession } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPosts = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await request<PageResult<Post>>({
        path: "/posts?page=1&pageSize=20",
      });
      setPosts(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "动态加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      void restoreSession();
    }
  }, [token, restoreSession]);

  useDidShow(() => {
    void loadPosts();
  });

  const openPost = (post: Post) => {
    Taro.navigateTo({ url: `/pages/post-detail/index?id=${post.id}` });
  };

  const openPublish = () => {
    if (!user) {
      Taro.navigateTo({ url: "/pages/login/index" });
      return;
    }
    Taro.navigateTo({ url: "/pages/publish/index" });
  };

  const today = new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

  return (
    <View className="page-frame">
      <AppHeader />
      <View className="feed-shell">
        <View className="feed-layout">
          <View className="feed-sidebar">
            <View className="feed-nav">
              <View className="feed-nav__item feed-nav__item--active">
                <House size={18} />
                <Text>发现</Text>
              </View>
              <View className="feed-nav__item" onClick={openPublish}>
                <PenLine size={18} />
                <Text>发布</Text>
              </View>
            </View>
            <View className="feed-sidebar__note">
              <Text className="feed-sidebar__eyebrow">片刻</Text>
              <Text className="feed-sidebar__copy">
                给日常留一块安静的地方，记录此刻，也看看别人的此刻。
              </Text>
            </View>
          </View>

          <View className="feed-main">
            <View className="feed-intro">
              <View>
                <Text className="feed-intro__date">{today}</Text>
                <Text className="feed-intro__title">此刻，大家正在记录</Text>
              </View>
              <View className="feed-intro__mark">
                <ArrowUpRight size={22} />
              </View>
            </View>

            <View className="compose-prompt" onClick={openPublish}>
              <View className="compose-prompt__icon">
                <PenLine size={18} />
              </View>
              <Text className="compose-prompt__text">
                {user ? `${user.displayName}，今天想记录什么？` : "登录后，记录你的此刻"}
              </Text>
              <Text className="compose-prompt__action">开始写</Text>
            </View>

            {error ? (
              <View className="feed-state">
                <Text className="feed-state__title">动态暂时没有加载出来</Text>
                <Text className="feed-state__copy">{error}</Text>
                <button type="button" className="secondary-button" onClick={loadPosts}>
                  <RotateCcw size={16} />
                  重试
                </button>
              </View>
            ) : loading ? (
              <View className="feed-state feed-state--loading">
                <LoaderCircle className="spin" size={24} />
                <Text className="feed-state__copy">正在加载动态</Text>
              </View>
            ) : posts.length ? (
              <View className="post-list">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} onOpen={openPost} />
                ))}
              </View>
            ) : (
              <View className="feed-state">
                <Text className="feed-state__title">这里还很安静</Text>
                <Text className="feed-state__copy">发布第一条动态，让今天留下一点痕迹。</Text>
                <button type="button" className="primary-button" onClick={openPublish}>
                  <PenLine size={16} />
                  发布动态
                </button>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}
