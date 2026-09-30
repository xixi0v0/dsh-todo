/**
 * 待办清单插件的“浏览器半侧”——真正画页面的部分。
 *
 * 这个文件不是普通的 ES 模块，而是 DSH 客户端模块系统约定的“lazy-CJS”格式：
 *   window.__ModuleLoader__.load({ id, factory })
 * 浏览器加载这个文件时只会“登记”factory；等真正需要这个插件时，
 * 才会执行 factory(require) 并拿到插件导出（apply / inject）。
 * 所以 require 只能要平台已经准备好的模块（这里是 react）。
 */
window.__ModuleLoader__.load({
	id: "@zxy/dsh-todo",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const React = require("react");
		const h = React.createElement;

		/** 面板 id：侧边栏那一行和中间那一页靠这个同名 id 配对。带前缀，避免和别人的面板撞车。 */
		const PANEL_ID = "zxy.todo";
		/** 待办数据存在浏览器本地（localStorage），关掉 app 也还在。 */
		const STORAGE_KEY = "zxy.todo.items.v1";
		/** 改名前的旧键：只在读不到新键时用一次，用于把老数据搬过来。 */
		const LEGACY_STORAGE_KEY = "dsh.todo.items.v1";

		// ---------------------------------------------------------------- 样式
		// 颜色全部用 DSH 的主题变量，这样浅色/深色主题都能自动适配。
		const CSS = [
			".zxy-todo_root{box-sizing:border-box;height:100%;overflow:auto;padding:max(28px,var(--dsh-frame-top-clearance,0px)) 40px 56px;color:var(--dsw-alias-label-primary);font-size:var(--dsh-content-font-size,14px)}",
			".zxy-todo_wrap{max-width:680px;margin:0 auto;display:flex;flex-direction:column;gap:14px}",
			".zxy-todo_title{margin:0;font-size:20px;font-weight:600;line-height:28px}",
			".zxy-todo_sub{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}",
			".zxy-todo_addRow{display:flex;gap:8px;align-items:center}",
			".zxy-todo_input{box-sizing:border-box;flex:1;min-width:0;height:36px;padding:0 12px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1,transparent);border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md,8px);font:inherit;outline:none}",
			".zxy-todo_input:focus{border-color:var(--dsw-alias-state-business-primary)}",
			".zxy-todo_add{box-sizing:border-box;height:36px;padding:0 16px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-button-elevated-fill,rgba(127,127,127,.14));border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md,8px);font:inherit;cursor:pointer;flex:none}",
			".zxy-todo_add:hover{background:var(--dsw-alias-button-floating-hover,rgba(127,127,127,.22))}",
			".zxy-todo_filters{display:flex;gap:6px;align-items:center;flex-wrap:wrap}",
			".zxy-todo_chip{box-sizing:border-box;height:26px;padding:0 10px;color:var(--dsw-alias-label-tertiary);background:transparent;border:.5px solid transparent;border-radius:999px;font:inherit;font-size:12px;cursor:pointer}",
			".zxy-todo_chip:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12))}",
			".zxy-todo_chipOn{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14));border-color:var(--dsw-alias-border-l3)}",
			".zxy-todo_spacer{flex:1}",
			".zxy-todo_clear{box-sizing:border-box;height:26px;padding:0 10px;color:var(--dsw-alias-label-tertiary);background:transparent;border:0;border-radius:var(--dsw-radius-sm,6px);font:inherit;font-size:12px;cursor:pointer}",
			".zxy-todo_clear:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12))}",
			".zxy-todo_list{display:flex;flex-direction:column;gap:2px;margin:0;padding:0;list-style:none}",
			".zxy-todo_row{box-sizing:border-box;display:flex;align-items:flex-start;gap:10px;padding:9px 8px;border-radius:var(--dsw-radius-md,8px)}",
			".zxy-todo_row:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.08))}",
			".zxy-todo_check{margin:3px 0 0;flex:none;width:15px;height:15px;cursor:pointer;accent-color:var(--dsw-alias-state-business-primary,#3b7ddd)}",
			".zxy-todo_text{flex:1;min-width:0;line-height:20px;word-break:break-word;white-space:pre-wrap;cursor:pointer}",
			".zxy-todo_done{color:var(--dsw-alias-label-tertiary);text-decoration:line-through}",
			".zxy-todo_del{box-sizing:border-box;flex:none;width:22px;height:22px;color:var(--dsw-alias-label-tertiary);background:transparent;border:0;border-radius:var(--dsw-radius-sm,6px);font-size:13px;line-height:1;cursor:pointer;opacity:0}",
			".zxy-todo_row:hover .zxy-todo_del,.zxy-todo_del:focus-visible{opacity:1}",
			".zxy-todo_del:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.16))}",
			".zxy-todo_empty{margin:0;padding:28px 8px;text-align:center;color:var(--dsw-alias-label-tertiary);font-size:13px}",
			".zxy-todo_foot{display:flex;align-items:center;gap:8px;color:var(--dsw-alias-label-tertiary);font-size:12px;border-top:.5px solid var(--dsw-alias-border-l2);padding-top:10px}"
		].join("");

		const tagId = "@zxy/dsh-todo/todo.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@zxy/dsh-todo";
			tag.dataset.pluginCss = tagId;
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}

		// ---------------------------------------------------------------- 数据
		/** 生成一个足够用的唯一 id。 */
		function newId() {
			return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
		}

		/** 读本地存储；任何异常都退化成“空清单”，绝不让页面崩掉。 */
		function loadItems() {
			try {
				let raw = window.localStorage.getItem(STORAGE_KEY);
				if (raw === null || raw === "") raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
				if (raw === null || raw === "") return [];
				const parsed = JSON.parse(raw);
				if (!Array.isArray(parsed)) return [];
				return parsed.filter((item) => item !== null && typeof item === "object" && typeof item.text === "string").map((item) => ({
					id: typeof item.id === "string" && item.id !== "" ? item.id : newId(),
					text: item.text,
					done: item.done === true,
					createdAt: typeof item.createdAt === "number" ? item.createdAt : 0
				}));
			} catch (error) {
				return [];
			}
		}

		/** 写本地存储；配额满或被禁用时静默忽略。 */
		function saveItems(items) {
			try {
				window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
			} catch (error) {
				/* 忽略：存不下也不影响这次使用 */
			}
		}

		// ------------------------------------------------------------ 页面组件
		const FILTERS = [
			{ id: "all", label: "全部" },
			{ id: "active", label: "未完成" },
			{ id: "done", label: "已完成" }
		];

		/** 侧边栏那一行的小图标。外壳会把 size（展开 16 / 收起 18）传进来。 */
		function TodoPanelIcon(props) {
			const size = props !== null && typeof props === "object" && typeof props.size === "number" ? props.size : 16;
			return h("svg", {
				width: size,
				height: size,
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true"
			}, h("rect", {
				x: 2.25,
				y: 2.25,
				width: 11.5,
				height: 11.5,
				rx: 2.5,
				stroke: "currentColor",
				strokeWidth: 1.2
			}), h("path", {
				d: "M5.1 8.2l2 2 3.8-4",
				stroke: "currentColor",
				strokeWidth: 1.4,
				strokeLinecap: "round",
				strokeLinejoin: "round"
			}));
		}

		/** 整页的待办清单。 */
		function TodoPage() {
			const [items, setItems] = React.useState(loadItems);
			const [draft, setDraft] = React.useState("");
			const [filter, setFilter] = React.useState("all");

			// 每次清单变化就落盘。
			React.useEffect(() => {
				saveItems(items);
			}, [items]);

			const add = () => {
				const text = draft.trim();
				if (text === "") return;
				setItems((previous) => previous.concat([{ id: newId(), text: text, done: false, createdAt: Date.now() }]));
				setDraft("");
			};
			const toggle = (id) => {
				setItems((previous) => previous.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
			};
			const remove = (id) => {
				setItems((previous) => previous.filter((item) => item.id !== id));
			};
			const clearDone = () => {
				setItems((previous) => previous.filter((item) => !item.done));
			};

			const doneCount = items.filter((item) => item.done).length;
			const activeCount = items.length - doneCount;
			const visible = items.filter((item) => (filter === "active" ? !item.done : filter === "done" ? item.done : true));

			const chip = (entry, count) => h("button", {
				key: entry.id,
				type: "button",
				className: filter === entry.id ? "zxy-todo_chip zxy-todo_chipOn" : "zxy-todo_chip",
				onClick: () => {
					setFilter(entry.id);
				}
			}, entry.label + " " + count);

			return h("div", { className: "zxy-todo_root" }, h("div", { className: "zxy-todo_wrap" }, [
				h("h1", { className: "zxy-todo_title", key: "title" }, "待办清单"),
				h("p", { className: "zxy-todo_sub", key: "sub" }, "写下来，做掉，划掉。数据保存在本机浏览器里。"),
				h("div", { className: "zxy-todo_addRow", key: "add" }, [
					h("input", {
						key: "input",
						className: "zxy-todo_input",
						type: "text",
						value: draft,
						placeholder: "要做点什么？回车即可添加",
						"aria-label": "新待办",
						onChange: (event) => {
							setDraft(event.target.value);
						},
						onKeyDown: (event) => {
							if (event.key === "Enter" && !event.nativeEvent.isComposing) {
								event.preventDefault();
								add();
							}
						}
					}),
					h("button", {
						key: "button",
						type: "button",
						className: "zxy-todo_add",
						onClick: add
					}, "添加")
				]),
				h("div", { className: "zxy-todo_filters", key: "filters" }, [
					chip(FILTERS[0], items.length),
					chip(FILTERS[1], activeCount),
					chip(FILTERS[2], doneCount),
					h("span", { className: "zxy-todo_spacer", key: "spacer" }),
					doneCount > 0 ? h("button", {
						key: "clear",
						type: "button",
						className: "zxy-todo_clear",
						onClick: clearDone
					}, "清除已完成") : null
				]),
				visible.length === 0
					? h("p", { className: "zxy-todo_empty", key: "empty" }, items.length === 0 ? "还没有待办。在上面输入框写第一条吧。" : "这个筛选下没有内容。")
					: h("ul", { className: "zxy-todo_list", key: "list" }, visible.map((item) => h("li", { className: "zxy-todo_row", key: item.id }, [
						h("input", {
							key: "check",
							className: "zxy-todo_check",
							type: "checkbox",
							checked: item.done,
							"aria-label": item.text,
							onChange: () => {
								toggle(item.id);
							}
						}),
						h("span", {
							key: "text",
							className: item.done ? "zxy-todo_text zxy-todo_done" : "zxy-todo_text",
							onClick: () => {
								toggle(item.id);
							}
						}, item.text),
						h("button", {
							key: "del",
							type: "button",
							className: "zxy-todo_del",
							"aria-label": "删除：" + item.text,
							title: "删除",
							onClick: () => {
								remove(item.id);
							}
						}, "✕")
					]))),
				h("div", { className: "zxy-todo_foot", key: "foot" }, "已完成 " + doneCount + " / 共 " + items.length + " 条")
			]));
		}

		// ------------------------------------------------------------- 插件本体
		/** 需要客户端已经提供的能力：槽位（slot）服务。 */
		const inject = ["slots"];

		/**
		 * 把两样东西挂到界面上：
		 *  1) sidebar.panellist —— 左侧栏里的一行（图标 + 文字）
		 *  2) main（key = "zxy.todo"）—— 点那一行之后，中间显示的那一整页
		 * 两边的 id/key 必须一模一样，外壳靠它配对。
		 */
		/** apply 期间探测到的运行环境，供自检记录使用。 */
		const ctxProbe = { hasSlots: false, hasEffect: false };

		/**
		 * 自检记录：把“我执行到哪一步了”写进浏览器本地存储。
		 * 万一界面没出现，维护者可以直接从磁盘读出，是插件根本没跑起来，
		 * 还是跑起来了但槽位没挂上，从而不用瞎猜。
		 */
		function reportDiag(stage, detail) {
			try {
				window.localStorage.setItem("zxy.todo.diag", JSON.stringify({
					stage: stage,
					detail: detail === undefined || detail === null ? null : String(detail),
					at: new Date().toISOString(),
					hasSlots: ctxProbe.hasSlots,
					hasEffect: ctxProbe.hasEffect
				}));
			} catch (error) {
				/* 记录失败不影响插件本身 */
			}
		}

		function apply(ctx) {
			ctxProbe.hasSlots = typeof (ctx && ctx.slots) === "object" && ctx.slots !== null && typeof ctx.slots.inject === "function" && typeof ctx.slots.register === "function";
			ctxProbe.hasEffect = typeof (ctx && ctx.effect) === "function";
			try {
				ctx.effect(() => ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
					name: "sidebar.panellist",
					id: PANEL_ID,
					order: 10,
					label: "待办清单"
				}, TodoPanelIcon)), "@zxy/dsh-todo: 侧边栏入口");

				ctx.effect(() => ctx.slots.inject("main", () => ctx.slots.register({
					name: "main",
					key: PANEL_ID
				}, TodoPage)), "@zxy/dsh-todo: 待办页面");

				reportDiag("registered");
			} catch (error) {
				reportDiag("failed", error && error.message ? error.message : error);
				throw error;
			}
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
