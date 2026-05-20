import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div>Big red Comic Sans</div>`);

export default function Input($$anchor, $$props) {
	let props = $.prop($$props, 'props', 8);
	var div = root();

	$.attribute_effect(div, () => ({ ...props() }), void 0, void 0, void 0, 'svelte-xyz');
	$.append($$anchor, div);
}