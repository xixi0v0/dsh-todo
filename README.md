# @xixi/dsh-todo

一个给自己用的 DSH（DeepSeek Harness）插件：在 Web 界面左侧栏加一行「待办清单」，点开后中间是一整页待办列表。

- **添加**：输入框写内容，回车或点「添加」
- **完成**：勾选复选框，或直接点文字
- **删除**：鼠标悬停在那一行，点右侧的 ✕
- **筛选**：全部 / 未完成 / 已完成，外加「清除已完成」
- **数据**：存在浏览器本地 `localStorage`（键名 `xixi.todo.items.v1`），关掉应用也还在

## 安装 / 卸载

```powershell
# 本地目录安装（开发时用，改完代码重启 DSH 生效）
& "$env:ProgramFiles\..."  # 或者直接用 dsh 命令
dsh plugin --profile desktop add D:\Project\dsh-todo
dsh plugin --profile desktop remove @xixi/dsh-todo

# 从 GitHub 安装（仓库根目录就是本包根目录，可以直接装）
dsh plugin --profile desktop add github:xixi0v0/dsh-todo
# 建议锁定 commit：
dsh plugin --profile desktop add github:xixi0v0/dsh-todo#<完整commit哈希>
```

装完 / 改完代码后，**必须重启一次桌面版 DSH** 才生效（DSH 是启动时读一次组合清单）。

## 目录结构

| 文件 | 作用 |
|---|---|
| `package.json` | 包身份 + `dsh.bundle`（贡献一个配置层）+ `dsh.client`（声明浏览器半侧） |
| `cordis.patch.yml` | 这一层往配置树里插入的那一行 |
| `lib/index.js` | 宿主半侧：什么都不做，只为让这一行能被解析到 |
| `lib/client.js` | 浏览器半侧：真正的页面（`window.__ModuleLoader__.load` 的 lazy-CJS 格式） |
| `locale/*.json` | 设置 → 插件列表里显示的标题与描述 |

## 命名约定（改名前必读）

这个插件里有 **4 个不同的名字**，规则完全不同：

| 名字 | 位置 | 规则 |
|---|---|---|
| ① 包名 | `package.json` 的 `name` | 守 npm 命名规则（全小写、URL 安全字符、≤214 字符）。**同时是浏览器模块身份** |
| ② 插件标识 | `cordis.patch.yml` 的 `id` + `lib/index.js` 的 `name` | 无格式要求，但**必须唯一**（patch 按 id 定位，撞了会覆盖别人的行） |
| ③ 界面配对名 | `lib/client.js` 的 `PANEL_ID` | 侧边栏那行 ↔ 中间那页的配对键，带前缀防撞 |
| ④ 显示名 | 侧边栏文字、`locale/*.json` 的 `meta.title` | 随喜好，中文/空格/符号都行 |

**两条硬绑定，改包名时千万别漏：**

1. `lib/client.js` 第一段 `window.__ModuleLoader__.load({ id: ... })` 必须**逐字等于** `package.json` 的 `name`。不一致浏览器就找不到这个插件。
2. `cordis.patch.yml` 里的 `name:` 必须等于包名；`id:` 要唯一。

## 实现要点

页面由两次槽位注册组成，两边的 id 必须一致：

- `sidebar.panellist`，`id: PANEL_ID` → 左侧栏那一行（组件收到 `{ size, active }`）
- `main`，`key: PANEL_ID` → 点开之后中间那一页

只依赖平台已经提供的 `react`；颜色全部走 `--dsw-alias-*` 主题变量，浅色/深色主题都自适应。

插件启动时会往 `localStorage` 写一条自检记录（键名 `xixi.todo.diag`），记录 `apply` 是否执行成功、两个槽位是否注册上——排障用，不影响功能。

## 改名历史

- `2026-09-30`：从临时目录 `dsh-chat/dsh-todo-page`（包名 `dsh-todo-page`）迁到本仓库，并把个人前缀统一为 `xixi`：包名 `@xixi/dsh-todo`、插件标识 `xixi-todo`、面板 id `xixi.todo`、数据键 `xixi.todo.items.v1`。
- 更早的数据键不再兼容（那批数据只是测试数据，直接以空清单重来）。
