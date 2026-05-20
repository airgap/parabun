import * as $ from 'svelte/internal/server';

export default function Nested($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let props = $$props['props'];

		$$renderer.push(`<!--[-->`);

		$.slot(
			$$renderer,
			$$props,
			'main',
			{
				value: props,
				data: Array.isArray(props) ? props[0] : props.a
			},
			null
		);

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { props });
	});
}