import { useEffect, useState } from "react";
import Taro, { useRouter } from "@tarojs/taro";
import { Input, Picker, Text, Textarea, View } from "@tarojs/components";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Eye,
  History,
  LoaderCircle,
  Plus,
  RotateCcw,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { CommunityCardRenderer } from "@/components/CommunityCardRenderer";
import { request } from "@/services/request";
import { useAuthStore } from "@/store/auth";
import type {
  CommunityCard,
  CommunityCardAction,
  CommunityCardType,
  CommunityDetail,
  CommunityPageAccent,
  CommunityPageDraftState,
  CommunityPageSchema,
} from "@/types";
import { fullDate } from "@/utils/date";
import "./index.css";

const CARD_TYPES: CommunityCardType[] = ["hero", "notice", "stats", "action"];
const CARD_TYPE_NAMES = ["主视觉", "公告", "数据统计", "动作"];
const ACTIONS: CommunityCardAction[] = [
  "publish-post",
  "join-community",
  "browse-posts",
];
const ACTION_NAMES = ["发布帖子", "加入社区", "浏览帖子"];
const ACCENTS: CommunityPageAccent[] = ["forest", "ocean", "amber"];
const ACCENT_NAMES = ["松林绿", "海岸蓝", "暖琥珀"];

export default function CardEditorPage() {
  const router = useRouter();
  const communityId = Number(router.params.communityId || 0);
  const pageKey = router.params.pageKey || "home";
  const { token, user } = useAuthStore();
  const [community, setCommunity] = useState<CommunityDetail | null>(null);
  const [pageState, setPageState] = useState<CommunityPageDraftState | null>(null);
  const [schema, setSchema] = useState<CommunityPageSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token || !user) {
      Taro.redirectTo({ url: "/pages/login/index" });
      return;
    }
    void loadEditor();
  }, [communityId, token, user]);

  const loadEditor = async () => {
    if (!communityId) {
      setError("社区参数缺失");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [communityDetail, draftState] = await Promise.all([
        request<CommunityDetail>({ path: `/communities/${communityId}` }),
        request<CommunityPageDraftState>({
          path: `/communities/${communityId}/pages/${pageKey}/draft`,
          auth: true,
        }),
      ]);
      setCommunity(communityDetail);
      setPageState(draftState);
      setSchema(draftState.draftSchema);
    } catch (err) {
      setError(err instanceof Error ? err.message : "卡片编辑器加载失败");
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!schema) return;
    setSaving(true);
    setError("");
    try {
      const result = await request<CommunityPageDraftState>({
        path: `/communities/${communityId}/pages/${pageKey}/draft`,
        method: "PUT",
        auth: true,
        data: { schema },
      });
      setPageState(result);
      setSchema(result.draftSchema);
      Taro.showToast({ title: "草稿已保存", icon: "none" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "草稿保存失败");
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!schema) return;
    setPublishing(true);
    setError("");
    try {
      const result = await request<CommunityPageDraftState>({
        path: `/communities/${communityId}/pages/${pageKey}/publish`,
        method: "POST",
        auth: true,
        data: { schema, changeSummary: "手动编辑并发布社区卡片" },
      });
      setPageState(result);
      setSchema(result.draftSchema);
      Taro.showToast({ title: "新版本已发布", icon: "none" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "发布失败");
    } finally {
      setPublishing(false);
    }
  };

  const rollback = async (versionId: number, versionNo: number) => {
    const confirmed = await Taro.showModal({
      title: `回滚到 v${versionNo}`,
      content: "系统会复制该版本并生成一个新的发布版本，历史记录不会删除。",
      confirmText: "回滚",
    });
    if (!confirmed.confirm) return;

    setPublishing(true);
    setError("");
    try {
      const result = await request<CommunityPageDraftState>({
        path: `/communities/${communityId}/pages/${pageKey}/rollback`,
        method: "POST",
        auth: true,
        data: { versionId, changeSummary: `回滚到版本 ${versionNo}` },
      });
      setPageState(result);
      setSchema(result.draftSchema);
      Taro.showToast({ title: "已生成新的回滚版本", icon: "none" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "回滚失败");
    } finally {
      setPublishing(false);
    }
  };

  const updateCard = (index: number, patch: Partial<CommunityCard>) => {
    setSchema((current) =>
      current
        ? {
            ...current,
            cards: current.cards.map((card, cardIndex) =>
              cardIndex === index ? { ...card, ...patch } : card,
            ),
          }
        : current,
    );
  };

  const changeCardType = (index: number, type: CommunityCardType) => {
    updateCard(index, {
      type,
      action:
        type === "action"
          ? schema?.cards[index].action ?? "publish-post"
          : null,
    });
  };

  const addCard = (type: CommunityCardType) => {
    setSchema((current) => {
      if (!current || current.cards.length >= 8) return current;
      return {
        ...current,
        cards: [...current.cards, createCard(type)],
      };
    });
  };

  const removeCard = (index: number) => {
    setSchema((current) =>
      current && current.cards.length > 1
        ? {
            ...current,
            cards: current.cards.filter((_, cardIndex) => cardIndex !== index),
          }
        : current,
    );
  };

  const moveCard = (index: number, direction: -1 | 1) => {
    setSchema((current) => {
      if (!current) return current;
      const target = index + direction;
      if (target < 0 || target >= current.cards.length) return current;
      const cards = [...current.cards];
      [cards[index], cards[target]] = [cards[target], cards[index]];
      return { ...current, cards };
    });
  };

  const goBack = () => {
    Taro.navigateBack({
      fail: () =>
        Taro.reLaunch({
          url: `/pages/feed/index?communityId=${communityId}`,
        }),
    });
  };

  const onPreviewAction = (action: CommunityCardAction) => {
    Taro.showToast({
      title: `预览动作：${ACTION_NAMES[ACTIONS.indexOf(action)]}`,
      icon: "none",
    });
  };

  const accentIndex = schema ? ACCENTS.indexOf(schema.theme.accent) : 0;

  return (
    <View className="page-frame card-editor-page">
      <View className="card-editor-topbar">
        <button type="button" className="icon-button" onClick={goBack} aria-label="返回">
          <ArrowLeft size={18} />
        </button>
        <View className="card-editor-topbar__copy">
          <Text className="card-editor-topbar__title">社区卡片编辑器</Text>
          <Text className="card-editor-topbar__meta">
            {community?.name || "加载中"}
            {pageState?.published ? ` · 线上 v${pageState.published.versionNo}` : " · 尚未发布"}
          </Text>
        </View>
        <View className="card-editor-topbar__actions">
          <button
            type="button"
            className="secondary-button"
            onClick={saveDraft}
            disabled={loading || saving || !schema}
          >
            {saving ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
            {saving ? "保存中" : "保存草稿"}
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={publish}
            disabled={loading || publishing || !schema}
          >
            {publishing ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />}
            {publishing ? "发布中" : "发布"}
          </button>
        </View>
      </View>

      {loading ? (
        <View className="card-editor-state">
          <LoaderCircle className="spin" size={24} />
          <Text>正在准备卡片编辑器</Text>
        </View>
      ) : error && !schema ? (
        <View className="card-editor-state">
          <Text className="card-editor-state__title">编辑器没有打开</Text>
          <Text className="card-editor-state__copy">{error}</Text>
          <button type="button" className="secondary-button" onClick={loadEditor}>
            <RotateCcw size={16} />
            重试
          </button>
        </View>
      ) : schema && community ? (
        <View className="card-editor-layout">
          <View className="card-editor-panel">
            <View className="card-editor-section">
              <View className="card-editor-section__heading">
                <View>
                  <Text className="card-editor-section__eyebrow">PAGE STYLE</Text>
                  <Text className="card-editor-section__title">页面风格</Text>
                </View>
              </View>
              <Text className="field-label">强调色</Text>
              <Picker
                mode="selector"
                range={ACCENT_NAMES}
                value={accentIndex}
                onChange={(event) =>
                  setSchema({
                    ...schema,
                    theme: {
                      accent: ACCENTS[Number(event.detail.value)] ?? "forest",
                    },
                  })
                }
              >
                <View className="editor-select">
                  <Text>{ACCENT_NAMES[accentIndex]}</Text>
                  <ArrowDown size={15} />
                </View>
              </Picker>
            </View>

            <View className="card-editor-section">
              <View className="card-editor-section__heading">
                <View>
                  <Text className="card-editor-section__eyebrow">CARDS</Text>
                  <Text className="card-editor-section__title">
                    页面卡片 · {schema.cards.length}/8
                  </Text>
                </View>
              </View>

              <View className="editor-card-list">
                {schema.cards.map((card, index) => (
                  <View className="editor-card" key={card.id}>
                    <View className="editor-card__header">
                      <View className="editor-card__number">{index + 1}</View>
                      <Picker
                        mode="selector"
                        range={CARD_TYPE_NAMES}
                        value={CARD_TYPES.indexOf(card.type)}
                        onChange={(event) =>
                          changeCardType(
                            index,
                            CARD_TYPES[Number(event.detail.value)] ?? "notice",
                          )
                        }
                      >
                        <View className="editor-type-picker">
                          {CARD_TYPE_NAMES[CARD_TYPES.indexOf(card.type)]}
                          <ArrowDown size={13} />
                        </View>
                      </Picker>
                      <View className="editor-card__tools">
                        <button
                          type="button"
                          className="editor-tool"
                          onClick={() => moveCard(index, -1)}
                          disabled={index === 0}
                          aria-label="上移卡片"
                        >
                          <ArrowUp size={15} />
                        </button>
                        <button
                          type="button"
                          className="editor-tool"
                          onClick={() => moveCard(index, 1)}
                          disabled={index === schema.cards.length - 1}
                          aria-label="下移卡片"
                        >
                          <ArrowDown size={15} />
                        </button>
                        <button
                          type="button"
                          className="editor-tool editor-tool--danger"
                          onClick={() => removeCard(index)}
                          disabled={schema.cards.length === 1}
                          aria-label="删除卡片"
                        >
                          <Trash2 size={15} />
                        </button>
                      </View>
                    </View>

                    <View className="editor-field">
                      <Text className="field-label">标题</Text>
                      <Input
                        className="text-input"
                        value={card.title}
                        maxlength={60}
                        onInput={(event) =>
                          updateCard(index, { title: event.detail.value })
                        }
                      />
                    </View>
                    <View className="editor-field">
                      <Text className="field-label">说明文字</Text>
                      <Textarea
                        className="text-area editor-card__body"
                        value={card.body}
                        maxlength={240}
                        onInput={(event) =>
                          updateCard(index, { body: event.detail.value })
                        }
                      />
                    </View>
                    {card.type === "action" ? (
                      <View className="editor-field">
                        <Text className="field-label">点击动作</Text>
                        <Picker
                          mode="selector"
                          range={ACTION_NAMES}
                          value={Math.max(0, ACTIONS.indexOf(card.action ?? "publish-post"))}
                          onChange={(event) =>
                            updateCard(index, {
                              action:
                                ACTIONS[Number(event.detail.value)] ?? "publish-post",
                            })
                          }
                        >
                          <View className="editor-select">
                            <Text>
                              {
                                ACTION_NAMES[
                                  Math.max(
                                    0,
                                    ACTIONS.indexOf(card.action ?? "publish-post"),
                                  )
                                ]
                              }
                            </Text>
                            <ArrowDown size={15} />
                          </View>
                        </Picker>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>

              {schema.cards.length < 8 ? (
                <View className="editor-add-row">
                  {CARD_TYPES.map((type, index) => (
                    <button
                      type="button"
                      key={type}
                      className="editor-add-button"
                      onClick={() => addCard(type)}
                    >
                      <Plus size={14} />
                      {CARD_TYPE_NAMES[index]}
                    </button>
                  ))}
                </View>
              ) : null}
            </View>

            {error ? <Text className="form-error">{error}</Text> : null}
          </View>

          <View className="card-editor-preview">
            <View className="card-editor-preview__heading">
              <View>
                <Text className="card-editor-section__eyebrow">PREVIEW</Text>
                <Text className="card-editor-section__title">发布效果预览</Text>
              </View>
              <View className="editor-preview-badge">
                <Eye size={14} />
                访客视图
              </View>
            </View>
            <View className="card-preview-frame">
              <CommunityCardRenderer
                schema={schema}
                memberCount={community.memberCount}
                postCount={community.postCount}
                onAction={onPreviewAction}
                preview
              />
            </View>

            <View className="editor-history">
              <View className="editor-history__heading">
                <History size={16} />
                <Text>版本历史</Text>
              </View>
              {pageState?.versions.length ? (
                <View className="editor-history__list">
                  {pageState.versions.map((version) => {
                    const isCurrent = version.versionNo === pageState.published?.versionNo;
                    return (
                      <View className="editor-version" key={version.id}>
                        <View>
                          <Text className="editor-version__name">
                            v{version.versionNo}
                            {isCurrent ? " · 当前" : ""}
                          </Text>
                          <Text className="editor-version__meta">
                            {version.createdBy.displayName} · {fullDate(version.createdAt)}
                          </Text>
                          <Text className="editor-version__summary">
                            {version.changeSummary || "未填写变更说明"}
                          </Text>
                        </View>
                        {!isCurrent ? (
                          <button
                            type="button"
                            className="text-button"
                            onClick={() => void rollback(version.id, version.versionNo)}
                            disabled={publishing}
                          >
                            回滚
                          </button>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text className="editor-history__empty">发布后会在这里生成第一个版本。</Text>
              )}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function createCard(type: CommunityCardType): CommunityCard {
  const id = `card-${Date.now().toString(36)}`;
  if (type === "hero") {
    return {
      id,
      type,
      title: "一句新的社区介绍",
      body: "补充一段简短说明，让访客快速理解这里。",
      action: null,
    };
  }
  if (type === "stats") {
    return {
      id,
      type,
      title: "社区概览",
      body: "成员与帖子数据会实时更新。",
      action: null,
    };
  }
  if (type === "action") {
    return {
      id,
      type,
      title: "参与社区",
      body: "从这里进入你最需要的社区操作。",
      action: "browse-posts",
    };
  }
  return {
    id,
    type,
    title: "社区公告",
    body: "写下需要成员注意的一条信息。",
    action: null,
  };
}
