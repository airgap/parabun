import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let checked = $$props['checked'];
	let indeterminate = $$props['indeterminate'];

	$$renderer.push(`<input type="checkbox"${$.attr('checked', checked, true)}/> <p>checked? ${$.escape(checked)}</p> <p>indeterminate? ${$.escape(indeterminate)}</p>`);
	$.bind_props($$props, { checked, indeterminate });
}