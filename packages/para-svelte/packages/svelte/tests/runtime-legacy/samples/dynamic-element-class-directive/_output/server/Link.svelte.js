import * as $ from 'svelte/internal/server';

export default function Link($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let item = $$props['item'];

		$.element(
			$$renderer,
			"div",
			() => {
				$$renderer.push(`${$.attr_class('svelte-70onls', void 0, { 'active': true })}`);
			},
			() => {
				$$renderer.push(`${$.escape(item.text)}`);
			}
		);

		$.bind_props($$props, { item });
	});
}