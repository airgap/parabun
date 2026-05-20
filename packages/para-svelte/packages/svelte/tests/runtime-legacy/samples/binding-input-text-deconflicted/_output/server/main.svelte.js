import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let component = $$props['component'];

		$$renderer.push(`<h1>Hello ${$.escape(component.name)}!</h1> <input${$.attr('value', component.name)}/>`);
		$.bind_props($$props, { component });
	});
}