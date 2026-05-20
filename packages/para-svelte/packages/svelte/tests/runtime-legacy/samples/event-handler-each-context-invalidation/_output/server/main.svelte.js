import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let switches = $.fallback($$props['switches'], () => [{ on: false }, { on: true }, { on: false }], true);

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(switches);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let s = each_array[$$index];

			$$renderer.push(`<button>${$.escape(s.on ? 'on' : 'off')}</button>`);
		}

		$$renderer.push(`<!--]--> <p>on: ${$.escape(switches.filter((s) => !!s.on).length)}</p>`);
		$.bind_props($$props, { switches });
	});
}