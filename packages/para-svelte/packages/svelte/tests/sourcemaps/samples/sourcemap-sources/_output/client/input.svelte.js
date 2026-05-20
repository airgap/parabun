import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1> </h1>`);

export default function Input($$anchor, $$props) {
	let name = $.prop($$props, 'name', 8);
	var answer = 42; // foo.js

	console.log(answer); // bar.js

	var answer2 = 84; // foo2.js

	console.log(answer2); // bar2.js

	var h1 = root();
	var text = $.child(h1);

	$.reset(h1);
	$.template_effect(() => $.set_text(text, `sourcemap-sources ${name() ?? ''}`));
	$.append($$anchor, h1);
}