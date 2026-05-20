import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p></p>`);
var root = $.from_html(`<p></p> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let color = $.prop($$props, 'color', 12, "red");

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
	var p = $.first_child(fragment);
	let styles;
	var node = $.sibling(p, 2);

	$.each(node, 0, () => [1], $.index, ($$anchor, _) => {
		var p_1 = root_1();
		let styles_1;

		$.template_effect(() => styles_1 = $.set_style(p_1, '', styles_1, { color: color() }));
		$.append($$anchor, p_1);
	});

	$.template_effect(() => styles = $.set_style(p, '', styles, { color: color() }));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}