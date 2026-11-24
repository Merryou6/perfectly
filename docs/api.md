# API V1

基础地址：`http://localhost:3000/api/v1`

除注册和登录外，受保护接口需要请求头：

```http
Authorization: Bearer <token>
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

### `POST /auth/login`

```json
{
  "username": "demo",
  "password": "demo12345"
}
```

### `GET /auth/me`

获取当前登录用户。

## 动态

### `GET /posts?page=1&pageSize=20`

公开分页列表，仅返回 `PUBLISHED` 状态。

### `GET /posts/:id`

公开详情。

### `POST /posts`

需要登录。

```json
{
  "title": "可选标题",
  "content": "动态正文"
}
```

### `PATCH /posts/:id`

需要登录，仅作者或管理员可修改。

### `DELETE /posts/:id`

需要登录，仅作者或管理员可删除。当前实现为软删除。
