import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let obj = $$props['obj'];
		let prop = $$props['prop'];

		$$renderer.push(`<input${$.attr('value', obj[prop])}/> <pre>${$.escape(JSON.stringify(obj))}</pre>`);
		$.bind_props($$props, { obj, prop });
	});
}