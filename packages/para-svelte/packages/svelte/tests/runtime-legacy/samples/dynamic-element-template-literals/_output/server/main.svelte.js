import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let size = $$props['size'];

	$.element($$renderer, `h${size}`, void 0, () => {
		$$renderer.push(`This is h${$.escape(size)} tag`);
	});

	$.bind_props($$props, { size });
}