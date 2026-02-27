# FormFast 🚀

一行代码搞定表单后端。无需服务器，无需配置，即时可用。

## 快速开始

### 1. 创建表单

```bash
curl -X POST https://formfast.io/api/forms \
  -H "Content-Type: application/json" \
  -d '{"name": "联系表单"}'
```

返回:
```json
{
  "id": "abc123",
  "apiKey": "your-secret-key",
  "endpoint": "/f/abc123"
}
```

### 2. 在 HTML 中使用

```html
<form action="https://formfast.io/f/abc123" method="POST">
  <input type="email" name="email" placeholder="your@email.com" required>
  <textarea name="message" placeholder="Your message..."></textarea>
  <button type="submit">提交</button>
</form>
```

### 3. 查看提交数据

```bash
curl https://formfast.io/api/forms/abc123/submissions \
  -H "X-API-Key: your-secret-key"
```

## 本地开发

```bash
# 安装依赖
npm install

# 启动数据库
docker-compose up -d db

# 运行迁移
npm run db:migrate

# 启动开发服务器
npm run dev
```

## 部署

### Docker Compose (推荐)

```bash
docker-compose up -d
```

### Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template)

### Render

1. Fork 此仓库
2. 在 Render 创建新的 Web Service
3. 添加 PostgreSQL 数据库
4. 设置环境变量 `DATABASE_URL`

## 功能特性

- ✅ 即时创建表单端点
- ✅ 跨域支持 (CORS)
- ✅ 提交数据导出
- ✅ Webhook 通知 (开发中)
- ✅ 垃圾邮件防护 (开发中)
- ✅ 数据分析仪表板 (开发中)

## 定价

| 功能 | 免费版 | 专业版 (¥49/月) |
|------|--------|----------------|
| 月提交量 | 100 条 | 无限 |
| 表单数量 | 5 个 | 无限 |
| 数据保留 | 30 天 | 永久 |
| Webhook | ❌ | ✅ |
| 优先支持 | ❌ | ✅ |

## 技术栈

- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Frontend**: HTML + Tailwind CSS (Vanilla JS)

## License

MIT
