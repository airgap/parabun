import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let visible = $$props['visible'];

	$$renderer.push(`<div>`);

	if (visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<div>i am visible</div>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]--> <div>before me</div></div>`);
	$.bind_props($$props, { visible });
}