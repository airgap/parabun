import * as $ from 'svelte/internal/server';

export default function Nested($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let user = $$props['user'];

		$$renderer.push(`<h1>Hello ${$.escape(user.name)}!</h1>`);
		$.bind_props($$props, { user });
	});
}