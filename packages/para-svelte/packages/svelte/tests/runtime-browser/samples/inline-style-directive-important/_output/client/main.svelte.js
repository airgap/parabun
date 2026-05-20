import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1 class="svelte-szzkfu">hello</h1> <h1 class="svelte-szzkfu">hello</h1>`, 1);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	let color = $.prop($$props, 'color', 12, 'red');

	var $$exports = {
		get color() {
			return color();
		},

		set color($$value) {
			color($$value);
			$.flush();
		}
	};

	var fragment = root();
	var h1 = $.first_child(fragment);
	let styles;
	var h1_1 = $.sibling(h1, 2);
	let styles_1;

	$.template_effect(() => {
		styles = $.set_style(h1, '', styles, { 'background-color': color() });
		styles_1 = $.set_style(h1_1, '', styles_1, [{}, { 'background-color': color() }]);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}