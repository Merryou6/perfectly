import { Text, View } from "@tarojs/components";
import {
  ArrowUpRight,
  Hash,
  Megaphone,
  Sparkles,
  Users,
} from "lucide-react";
import type {
  CommunityCard,
  CommunityCardAction,
  CommunityPageSchema,
} from "@/types";
import "./CommunityCardRenderer.css";

interface CommunityCardRendererProps {
  schema: CommunityPageSchema;
  memberCount: number;
  postCount: number;
  onAction: (action: CommunityCardAction) => void;
  preview?: boolean;
}

export function CommunityCardRenderer({
  schema,
  memberCount,
  postCount,
  onAction,
  preview = false,
}: CommunityCardRendererProps) {
  return (
    <View
      className={`card-page card-page--${schema.theme.accent} ${
        preview ? "card-page--preview" : ""
      }`}
    >
      {schema.cards.map((card) => (
        <View
          key={card.id}
          className={`page-card page-card--${card.type} ${
            card.type === "hero" ? "page-card--wide" : ""
          }`}
        >
          <View className="page-card__heading">
            <View className="page-card__icon">{renderIcon(card)}</View>
            <Text className="page-card__kicker">{cardKicker(card)}</Text>
          </View>
          <Text className="page-card__title">{card.title}</Text>
          {card.type === "stats" ? (
            <View className="page-card__stats">
              <View>
                <Text className="page-card__stat-value">{memberCount}</Text>
                <Text className="page-card__stat-label">成员</Text>
              </View>
              <View>
                <Text className="page-card__stat-value">{postCount}</Text>
                <Text className="page-card__stat-label">帖子</Text>
              </View>
            </View>
          ) : null}
          {card.body ? <Text className="page-card__body">{card.body}</Text> : null}
          {card.type === "action" && card.action ? (
            <button
              type="button"
              className="page-card__action"
              onClick={() => onAction(card.action as CommunityCardAction)}
            >
              查看
              <ArrowUpRight size={15} />
            </button>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function renderIcon(card: CommunityCard) {
  if (card.type === "notice") return <Megaphone size={17} />;
  if (card.type === "stats") return <Users size={17} />;
  if (card.type === "action") return <ArrowUpRight size={17} />;
  return <Sparkles size={17} />;
}

function cardKicker(card: CommunityCard) {
  if (card.type === "notice") return "NOTICE";
  if (card.type === "stats") return "LIVE";
  if (card.type === "action") return "ACTION";
  return "COMMUNITY";
}
