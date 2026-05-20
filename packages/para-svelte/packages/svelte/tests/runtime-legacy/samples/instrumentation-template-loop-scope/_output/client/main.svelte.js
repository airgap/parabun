import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>foo</button> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.mutable_source(0);

	$.init();

	var fragment = root();
	var button = $.first_child(fragment);
	var p = $.sibling(button, 2);
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `x: ${$.get(x) ?? ''}`));

	$.event('click', button, () => {
		(() => {
			for (let x = 0; x < 10; x++) {}

			$.set(x, 42);
		})();
	});

	$.append($$anchor, fragment);
	$.pop();
}