# API V1

基础地址：`http://127.0.0.1:3000/api/v1`

除公开查询、注册和登录外，受保护接口需要请求头：

```http
Authorization: Bearer <token>
```

## 统一响应

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "requestId": "b7f1c9d2"
}
```

分页接口使用 `page` 和 `pageSize`，返回：

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "pageSize": 20
}
```

## 认证

### `POST /auth/register`

```json
{
  "username": "demo",
  "password": "demo12345",
  "displayName": "林晚"
}
```

返回 `token`、`expiresIn` 和当前用户。

### `POST /auth/login`

```json
{
  "username": "demo",
  "password": "demo12345"
}
```

### `GET /auth/me`

获取当前登录用户。

### `POST /auth/logout`

需要登录。撤销当前 `auth_session`，该令牌不能再次使用。

## 用户资料

### `PATCH /users/me`

需要登录。修改昵称或头像地址，至少提交一个字段。

```json
{
  "displayName": "新昵称",
  "avatarUrl": null
}
```

### `PATCH /users/me/password`

需要登录。修改成功后，该用户所有旧令牌立即失效，并返回新的登录会话。

```json
{
  "oldPassword": "demo12345",
  "newPassword": "demo12345Z"
}
```

密码长度为 8–72 个字符，并且至少包含小写字母、大写字母、数字、特殊符号中的两类。

## 社区

### `GET /communities?page=1&pageSize=20`

公开社区列表。返回成员数、帖子数、是否限制成员发帖和是否要求加入审核。

### `GET /communities/:id`

公开社区详情，同时返回按 `sortOrder` 排序的分区列表。

### `GET /communities/:id/me`

需要登录。返回当前用户在该社区的成员关系和待处理加入申请。

### `POST /communities/:id/join`

需要登录。

```json
{
  "reason": "可选，申请理由"
}
```

- `joinApprovalRequired=false`：立即成为 `APPROVED` 成员。
- `joinApprovalRequired=true`：创建 `PENDING` 加入申请。
- 社区所有者与平台管理员直接通过。

审核通过接口不在本次最小切片中，留给社区管理模块实现。

## 帖子

### `GET /posts?page=1&pageSize=20&communityId=1&sectionId=2`

公开帖子列表。`communityId`、`sectionId` 可选。

### `GET /posts/:id`

公开帖子详情。

### `POST /posts`

需要登录，并满足社区发帖规则。

```json
{
  "communityId": 1,
  "sectionId": 1,
  "title": "可选标题",
  "body": "帖子正文"
}
```

### `PATCH /posts/:id`

需要登录，仅作者或平台/社区管理员可修改。

```json
{
  "title": "新标题",
  "body": "新正文"
}
```

### `DELETE /posts/:id`

需要登录，仅作者或平台/社区管理员可删除。当前实现为软删除。

## 社区卡片页面

页面 Schema 只允许平台白名单组件、固定属性和声明式动作，不接收任意 HTML、CSS 或 JavaScript。

### `GET /communities/:id/pages/:pageKey`

公开读取当前已发布版本。尚未发布时返回 `data: null`。

### `GET /communities/:id/pages/:pageKey/draft`

需要社区管理员或平台管理员。返回草稿 Schema、当前发布版本和最近版本历史。

### `PUT /communities/:id/pages/:pageKey/draft`

保存草稿，不改变线上页面。

```json
{
  "schema": {
    "version": 1,
    "theme": { "accent": "forest" },
    "cards": [
      {
        "id": "welcome",
        "type": "hero",
        "title": "社区标题",
        "body": "一段社区说明",
        "action": null
      }
    ]
  }
}
```

### `POST /communities/:id/pages/:pageKey/publish`

校验并发布新版本。

```json
{
  "schema": {},
  "changeSummary": "调整首页介绍"
}
```

### `POST /communities/:id/pages/:pageKey/rollback`

复制历史版本并生成一个新的发布版本，不覆盖旧记录。

```json
{
  "versionId": 1,
  "changeSummary": "回滚到版本 1"
}
```

当前支持的卡片类型：`hero`、`notice`、`stats`、`action`。

当前支持的动作：`publish-post`、`join-community`、`browse-posts`。

## 错误

业务错误沿用统一响应结构，`data` 为 `null`，`code` 使用对应 HTTP 状态码。常见状态：

- `400`：参数或关联关系不合法
- `401`：未登录或登录失效
- `403`：不满足社区权限
- `404`：资源不存在或已停用
- `409`：用户名冲突
