import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let pushLogs = $$props['pushLogs'];
		let tag = $.fallback($$props['tag'], "h1");
		let opt = $.fallback($$props['opt'], "opt1");

		function foo(node, { tag, opt }) {
			pushLogs(`create: ${tag},${opt}`);

			return {
				update: ({ tag, opt }) => pushLogs(`update: ${tag},${opt}`),
				destroy: () => pushLogs('destroy')
			};
		}

		$.element($$renderer, tag, void 0, () => {
			$$renderer.push(`tag is ${$.escape(tag)}.`);
		});

		$.bind_props($$props, { pushLogs, tag, opt });
	});
}