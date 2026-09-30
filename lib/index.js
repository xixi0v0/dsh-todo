/**
 * 待办清单插件的“宿主半侧”（跑在后台 Node 进程里）。
 *
 * 这个插件真正干活的部分全在浏览器那一侧（lib/client.js），
 * 所以宿主这一半故意什么都不做：它只需要存在，让配置树里有这一行、
 * 让客户端模块系统能顺着这个包找到 dsh.client 声明。
 *
 * @module @xixi/dsh-todo
 */

/** 插件名，Cordis 用来在配置树里标识这一行（与 cordis.patch.yml 的 id 保持一致）。 */
export const name = 'xixi-todo'

/** 什么都不注册；页面的注册在浏览器半侧完成。 */
export function apply() {}
