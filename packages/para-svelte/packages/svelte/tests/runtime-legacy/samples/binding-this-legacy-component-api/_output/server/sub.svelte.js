import { render as $$_render } from 'svelte/server';
import * as $ from 'svelte/internal/server';
import { createEventDispatcher } from 'svelte';

function Sub($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let count = $.fallback($$props['count'], 0);
		const dispatch = createEventDispatcher();

		$$renderer.push(`<button>${$.escape(count)}</button>`);
		$.bind_props($$props, { count });
	});
}

Sub.render = function ($$props, $$opts) {
	return $$_render(Sub, { props: $$props, context: $$opts?.context });
};

export default Sub;