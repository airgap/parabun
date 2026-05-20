import * as $ from 'svelte/internal/server';

export default function Component($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let box = $$props['box'];

		$$renderer.push(`<!--[-->`);
		$.slot($$renderer, $$props, 'box1', { box }, null);
		$$renderer.push(`<!--]--> <!--[-->`);
		$.slot($$renderer, $$props, 'box2', { width: box.width, height: box.height }, null);
		$$renderer.push(`<!--]--> <!--[-->`);
		$.slot($$renderer, $$props, 'default', { box }, null);
		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { box });
	});
}