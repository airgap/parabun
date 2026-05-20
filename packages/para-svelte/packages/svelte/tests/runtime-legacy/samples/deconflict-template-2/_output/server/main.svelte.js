import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let value = $.fallback($$props['value'], template, true);

	function template() {
		return 'template';
	}

	$$renderer.push(`<!---->${$.escape(value)}`);
	$.bind_props($$props, { value });
}