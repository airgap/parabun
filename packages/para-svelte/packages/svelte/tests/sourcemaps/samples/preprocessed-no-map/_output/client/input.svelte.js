import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<main class="svelte-uvohi4"><div> </div></main>`);

export default function Input($$anchor, $$props) {
	let name = $.prop($$props, 'name', 8);

	console.log(name());

	var main = root();
	var div = $.child(main);
	var text = $.child(div, true);

	$.reset(div);
	$.reset(main);
	$.template_effect(() => $.set_text(text, name()));
	$.append($$anchor, main);
}