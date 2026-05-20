import * as $ from 'svelte/internal/server';

export default function Nested($$renderer, $$props) {
	let value = $$props['value'];
	let field = $$props['field'];

	$$renderer.push(`<label>${$.escape(field)} <input${$.attr('value', value)}/></label>`);
	$.bind_props($$props, { value, field });
}