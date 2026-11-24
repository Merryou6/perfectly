import { useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import { Input, Text, View } from "@tarojs/components";
import { Aperture, ArrowLeft, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { request } from "@/services/request";
import { useAuthStore } from "@/store/auth";
import type { User } from "@/types";
import "./index.css";

interface AuthResult {
  token: string;
  expiresIn: number;
  user: User;
}

export default function LoginPage() {
  const { token, setSession } = useAuthStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (token) {
      Taro.redirectTo({ url: "/pages/feed/index" });
    }
  }, [token]);

  const fillDemo = () => {
    setMode("login");
    setUsername("demo");
    setPassword("demo12345");
    setError("");
  };

  const submit = async () => {
    if (!username.trim() || !password) {
      setError("请填写用户名和密码");
      return;
    }
    if (mode === "register" && password.length < 8) {
      setError("密码至少需要 8 个字符");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const result = await request<AuthResult>({
        path: `/auth/${mode}`,
        method: "POST",
        data:
          mode === "register"
            ? {
                username: username.trim(),
                password,
                displayName: displayName.trim() || username.trim(),
              }
            : { username: username.trim(), password },
      });
      setSession(result.token, result.user);
      Taro.showToast({ title: mode === "login" ? "欢迎回来" : "账号已创建", icon: "none" });
      Taro.redirectTo({ url: "/pages/feed/index" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="auth-page">
      <View className="auth-topbar">
        <button
          type="button"
          className="icon-button auth-back"
          onClick={() => Taro.navigateBack({ fail: () => Taro.reLaunch({ url: "/pages/feed/index" }) })}
          aria-label="返回"
        >
          <ArrowLeft size={18} />
        </button>
        <View className="auth-brand">
          <Aperture size={18} />
          <Text>片刻</Text>
        </View>
      </View>

      <View className="auth-layout">
        <View className="auth-statement">
          <Text className="auth-statement__eyebrow">A QUIET PLACE FOR MOMENTS</Text>
          <Text className="auth-statement__title">
            把日常放回日常，
            <br />
            让值得记住的事慢一点。
          </Text>
          <View className="auth-statement__line" />
          <Text className="auth-statement__copy">
            文字、照片和视频，都可以成为生活的注脚。这里没有催促，只有你愿意留下的片刻。
          </Text>
        </View>

        <View className="auth-form-wrap">
          <View className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${mode === "login" ? "auth-tab--active" : ""}`}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              登录
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === "register" ? "auth-tab--active" : ""}`}
              onClick={() => {
                setMode("register");
                setError("");
              }}
            >
              注册
            </button>
          </View>

          <View className="auth-heading">
            <Text className="auth-heading__title">
              {mode === "login" ? "欢迎回来" : "创建一个账号"}
            </Text>
            <Text className="auth-heading__copy">
              {mode === "login"
                ? "继续记录你没有说完的故事。"
                : "从一条简短的动态开始，留下你的片刻。"}
            </Text>
          </View>

          <View className="auth-form">
            {mode === "register" ? (
              <View className="auth-field">
                <Text className="field-label">昵称</Text>
                <View className="auth-input-wrap">
                  <UserRound size={17} />
                  <Input
                    className="auth-input"
                    value={displayName}
                    maxlength={32}
                    placeholder="别人如何称呼你"
                    onInput={(event) => setDisplayName(event.detail.value)}
                  />
                </View>
              </View>
            ) : null}

            <View className="auth-field">
              <Text className="field-label">用户名</Text>
              <View className="auth-input-wrap">
                <UserRound size={17} />
                <Input
                  className="auth-input"
                  value={username}
                  maxlength={32}
                  placeholder="输入用户名"
                  onInput={(event) => setUsername(event.detail.value)}
                />
              </View>
            </View>

            <View className="auth-field">
              <Text className="field-label">密码</Text>
              <View className="auth-input-wrap">
                <LockKeyhole size={17} />
                <Input
                  className="auth-input"
                  value={password}
                  password
                  maxlength={72}
                  placeholder={mode === "register" ? "至少 8 个字符" : "输入登录密码"}
                  onInput={(event) => setPassword(event.detail.value)}
                />
              </View>
            </View>

            {error ? <Text className="form-error">{error}</Text> : null}

            <button
              type="button"
              className="primary-button auth-submit"
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? <LoaderCircle className="spin" size={17} /> : null}
              {submitting ? "请稍候" : mode === "login" ? "进入片刻" : "创建账号"}
            </button>

            <button type="button" className="text-button auth-demo" onClick={fillDemo}>
              使用演示账号
            </button>
          </View>
        </View>
      </View>
    </View>
  );
}
