import { Text, View } from "@tarojs/components";
import { Clock3, MoreHorizontal } from "lucide-react";
import type { Post } from "@/types";
import { relativeTime } from "@/utils/date";
import { Avatar } from "./Avatar";
import "./PostCard.css";

interface PostCardProps {
  post: Post;
  onOpen: (post: Post) => void;
}

export function PostCard({ post, onOpen }: PostCardProps) {
  return (
    <View className="post-card" onClick={() => onOpen(post)}>
      <View className="post-card__header">
        <Avatar name={post.author.displayName} />
        <View className="post-card__author">
          <Text className="post-card__name">{post.author.displayName}</Text>
          <Text className="post-card__time">{relativeTime(post.createdAt)}</Text>
        </View>
        <View className="post-card__more" aria-label="更多操作">
          <MoreHorizontal size={18} />
        </View>
      </View>

      {post.title ? <Text className="post-card__title">{post.title}</Text> : null}
      <Text className="post-card__content">{post.content}</Text>

      <View className="post-card__footer">
        <View className="post-card__action">
          <Clock3 size={16} />
          <Text>文字动态</Text>
        </View>
        <Text className="post-card__read">阅读全文</Text>
      </View>
    </View>
  );
}
