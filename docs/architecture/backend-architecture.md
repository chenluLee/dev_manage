# Backend Architecture

**说明：** 此应用为纯前端架构，无后端服务器。所有数据处理和业务逻辑都在客户端完成。

## Service Architecture
**架构类型：** 客户端应用，无服务器依赖

**服务边界：**
- **数据服务：** 本地文件系统 + IndexedDB
- **业务逻辑：** 浏览器JavaScript引擎
- **用户界面：** DOM + CSS渲染引擎

## Database Architecture
**数据库类型：** 混合存储方案

**主存储：** File System Access API
- 用户完全控制数据位置
- 支持网盘同步
- 便于备份和迁移

**备用存储：** IndexedDB
- 浏览器不支持File System Access时自动降级
- 提供基本的本地持久化能力

## Authentication and Authorization
**认证方案：** 无需认证，纯本地应用

**安全考虑：**
- 数据完全存储在用户设备
- 无网络传输，无隐私泄露风险
- 用户拥有数据的完整控制权
