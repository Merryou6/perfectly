import { BadRequestException } from "@nestjs/common";
import type {
  CommunityCard,
  CommunityCardAction,
  CommunityCardType,
  CommunityPageSchema,
} from "@perfectly/contracts";

const CARD_TYPES: CommunityCardType[] = ["hero", "notice", "stats", "action"];
const CARD_ACTIONS: CommunityCardAction[] = [
  "publish-post",
  "join-community",
  "browse-posts",
];
const ACCENTS = ["forest", "ocean", "amber"] as const;
const CARD_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(
  value: unknown,
  field: string,
  maxLength: number,
  required = false,
) {
  if (typeof value !== "string") {
    throw new BadRequestException(`${field} 必须是字符串`);
  }
  const result = value.trim();
  if (required && !result) {
    throw new BadRequestException(`${field} 不能为空`);
  }
  if (result.length > maxLength) {
    throw new BadRequestException(`${field} 不能超过 ${maxLength} 个字符`);
  }
  return result;
}

export function validateCommunityPageSchema(
  input: unknown,
): CommunityPageSchema {
  if (!isRecord(input) || input.version !== 1) {
    throw new BadRequestException("卡片页面 Schema 版本必须为 1");
  }
  if (!isRecord(input.theme) || !ACCENTS.includes(input.theme.accent as never)) {
    throw new BadRequestException("卡片主题配色不合法");
  }
  if (!Array.isArray(input.cards) || input.cards.length < 1 || input.cards.length > 8) {
    throw new BadRequestException("卡片数量需要在 1 到 8 张之间");
  }

  const ids = new Set<string>();
  const cards: CommunityCard[] = input.cards.map((raw, index) => {
    if (!isRecord(raw)) {
      throw new BadRequestException(`第 ${index + 1} 张卡片格式不合法`);
    }
    const id = text(raw.id, `第 ${index + 1} 张卡片 ID`, 32, true);
    if (!CARD_ID_PATTERN.test(id) || ids.has(id)) {
      throw new BadRequestException(`第 ${index + 1} 张卡片 ID 不合法或重复`);
    }
    ids.add(id);

    if (!CARD_TYPES.includes(raw.type as CommunityCardType)) {
      throw new BadRequestException(`第 ${index + 1} 张卡片组件不在白名单内`);
    }
    const type = raw.type as CommunityCardType;
    const action =
      raw.action === null || raw.action === undefined
        ? null
        : (raw.action as CommunityCardAction);
    if (action !== null && !CARD_ACTIONS.includes(action)) {
      throw new BadRequestException(`第 ${index + 1} 张卡片动作不在白名单内`);
    }
    if (type === "action" && action === null) {
      throw new BadRequestException(`第 ${index + 1} 张动作卡片需要选择动作`);
    }

    return {
      id,
      type,
      title: text(raw.title, `第 ${index + 1} 张卡片标题`, 60, true),
      body: text(raw.body, `第 ${index + 1} 张卡片正文`, 240),
      action: type === "action" ? action : null,
    };
  });

  return {
    version: 1,
    theme: { accent: input.theme.accent as CommunityPageSchema["theme"]["accent"] },
    cards,
  };
}

export function defaultCommunityPageSchema(input: {
  name: string;
  description: string;
}): CommunityPageSchema {
  return {
    version: 1,
    theme: { accent: "forest" },
    cards: [
      {
        id: "welcome",
        type: "hero",
        title: input.name,
        body: input.description || "欢迎来到这个社区。",
        action: null,
      },
      {
        id: "overview",
        type: "stats",
        title: "社区概览",
        body: "成员与帖子数据会实时更新。",
        action: null,
      },
      {
        id: "participate",
        type: "action",
        title: "加入讨论",
        body: "分享你的近况，或看看大家正在聊什么。",
        action: "publish-post",
      },
    ],
  };
}

export function safeCommunityPageSchema(
  input: unknown,
  fallback: CommunityPageSchema,
) {
  try {
    return validateCommunityPageSchema(input);
  } catch {
    return fallback;
  }
}
