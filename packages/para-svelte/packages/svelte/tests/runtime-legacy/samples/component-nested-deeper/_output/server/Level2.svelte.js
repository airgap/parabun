import * as $ from 'svelte/internal/server';

export default function Level2($$renderer, $$props) {
	let condition = $$props['condition'];

	$$renderer.push(`<div class="level2"><h4>level 2</h4> `);

	if (condition) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<span>TRUE! <!--[-->`);
		$.slot($$renderer, $$props, 'default', {}, null);
		$$renderer.push(`<!--]--></span>`);
	} else {
		$$renderer.push('<!--[-1-->');
		$$renderer.push(`<span>FALSE! <!--[-->`);
		$.slot($$renderer, $$props, 'default', {}, null);
		$$renderer.push(`<!--]--></span>`);
	}

	$$renderer.push(`<!--]--></div>`);
	$.bind_props($$props, { condition });
}