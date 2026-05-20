import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let user = $$props['user'];
		let prop = $$props['prop'];

		$$renderer.push(`<input${$.attr('value', user[prop])}/> <p>hello ${$.escape(user.name)}</p>`);
		$.bind_props($$props, { user, prop });
	});
}