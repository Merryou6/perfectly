import { useEffect, useState } from "react";
import Taro, { useRouter } from "@tarojs/taro";
import { Input, Text, Textarea, View } from "@tarojs/components";
import { ArrowLeft, LoaderCircle, Send } from "lucide-react";
import { request } from "@/services/request";
import { useAuthStore } from "@/store/auth";
import type { Post } from "@/types";
import "./index.css";

export default function PublishPage() {
  const router = useRouter();
  const editingId = Number(router.params.id || 0);
  const isEditing = Number.isFinite(editingId) && editingId > 0;
  const { token, user } = useAuthStore();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !user) {
      Taro.redirectTo({ url: "/pages/login/index" });
    }
  }, [token, user]);

  useEffect(() => {
    if (!isEditing) return;
    void request<Post>({ path: `/posts/${editingId}` })
      .then((post) => {
        setTitle(post.title || "");
        setContent(post.content);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "动态加载失败");
      });
  }, [editingId, isEditing]);

  const publish = async () => {
    if (!content.trim()) {
      setError("写点什么再发布吧");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const post = await request<Post>({
        path: isEditing ? `/posts/${editingId}` : "/posts",
        method: isEditing ? "PATCH" : "POST",
        auth: true,
        data: {
          title: title.trim() || undefined,
          content: content.trim(),
        },
      });
      Taro.showToast({ title: isEditing ? "动态已更新" : "动态已发布", icon: "none" });
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

  return (
    <View className="page-frame publish-page">
      <View className="publish-topbar">
        <button type="button" className="icon-button" onClick={goBack} aria-label="返回">
          <ArrowLeft size={18} />
        </button>
        <Text className="publish-topbar__title">{isEditing ? "编辑动态" : "发布动态"}</Text>
        <button
          type="button"
          className="primary-button"
          onClick={publish}
          disabled={submitting}
        >
          {submitting ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}
          {submitting ? "保存中" : isEditing ? "保存" : "发布"}
        </button>
      </View>

      <View className="publish-layout">
        <View className="publish-editor">
          <View className="publish-editor__meta">
            <Text className="publish-editor__eyebrow">NEW MOMENT</Text>
            <Text className="publish-editor__author">{user?.displayName || "你"}</Text>
          </View>

          <View className="publish-field">
            <Text className="field-label">标题（可选）</Text>
            <Input
              className="text-input publish-title"
              value={title}
              maxlength={100}
              placeholder="给这一刻起个名字"
              onInput={(event) => setTitle(event.detail.value)}
            />
          </View>

          <View className="publish-field publish-field--content">
            <View className="publish-label-row">
              <Text className="field-label">正文</Text>
              <Text className="publish-count">{content.length} / 2000</Text>
            </View>
            <Textarea
              className="text-area publish-textarea"
              value={content}
              maxlength={2000}
              placeholder="写下此刻发生的事、想到的人，或一句没有来由的话。"
              onInput={(event) => setContent(event.detail.value)}
            />
          </View>

          {error ? <Text className="form-error">{error}</Text> : null}

          <View className="publish-footer">
            <Text className="publish-footer__hint">
              {isEditing ? "修改后会立即更新" : "发布后所有人可见"}
            </Text>
            <button type="button" className="primary-button" onClick={publish} disabled={submitting}>
              {submitting ? "保存中" : isEditing ? "保存修改" : "发布动态"}
            </button>
          </View>
        </View>
      </View>
    </View>
  );
}
