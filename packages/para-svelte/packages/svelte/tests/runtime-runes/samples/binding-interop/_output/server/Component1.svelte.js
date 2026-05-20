import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Component1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { object = void 0, primitive = void 0 } = $$props;

		if (primitive) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<button>${$.escape(primitive)}</button>`);
		} else {
			$$renderer.push('<!--[-1-->');
			$$renderer.push(`<button>${$.escape(object.value)}</button>`);
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { object, primitive });
	});
}