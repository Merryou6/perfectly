import Taro from "@tarojs/taro";
import { Text, View } from "@tarojs/components";
import { LogIn, LogOut, MessageSquare, PenLine } from "lucide-react";
import { request } from "@/services/request";
import { useAuthStore } from "@/store/auth";
import { Avatar } from "./Avatar";
import "./AppHeader.css";

export function AppHeader() {
  const { user, token, clearSession } = useAuthStore();

  const openHome = () => {
    Taro.reLaunch({ url: "/pages/feed/index" });
  };

  const openPublish = () => {
    Taro.navigateTo({ url: "/pages/publish/index" });
  };

  const openLogin = () => {
    Taro.navigateTo({ url: "/pages/login/index" });
  };

  const logout = async () => {
    try {
      if (token) {
        await request<null>({
          path: "/auth/logout",
          method: "POST",
          auth: true,
        });
      }
    } catch {
      // Local session still needs to be cleared if the server is unavailable.
    } finally {
      clearSession();
      Taro.showToast({ title: "已退出登录", icon: "none" });
    }
  };

  return (
    <View className="app-header">
      <View className="app-header__inner">
        <View className="brand" onClick={openHome}>
          <View className="brand__mark">
            <MessageSquare size={19} strokeWidth={2.2} />
          </View>
          <View className="brand__copy">
            <Text className="brand__name">Perfectly</Text>
            <Text className="brand__label">COMMUNITY</Text>
          </View>
        </View>

        <View className="app-header__actions">
          <button
            type="button"
            className="primary-button app-header__publish"
            onClick={openPublish}
          >
            <PenLine size={16} />
            发布帖子
          </button>
          {user ? (
            <View className="app-header__user">
              <Avatar name={user.displayName} size="small" />
              <Text className="app-header__username">{user.displayName}</Text>
              <button
                type="button"
                className="icon-button"
                onClick={() => void logout()}
                aria-label="退出登录"
              >
                <LogOut size={17} />
              </button>
            </View>
          ) : (
            <button type="button" className="secondary-button" onClick={openLogin}>
              <LogIn size={16} />
              登录
            </button>
          )}
        </View>
      </View>
    </View>
  );
}
