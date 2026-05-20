import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Component2($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { object = {}, primitive = '' } = $$props;

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