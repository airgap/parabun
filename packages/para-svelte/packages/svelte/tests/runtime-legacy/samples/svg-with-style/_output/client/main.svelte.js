import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_svg(`<svg><circle cx="50" cy="50" r="50" class="svelte-70s021"></circle><circle class="foo svelte-70s021" cx="150" cy="50" r="50"></circle><circle cx="250" cy="50" r="50"></circle></svg>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12);

	var $$exports = {
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		}
	};

	var svg = root();
	var circle = $.sibling($.child(svg), 2);

	$.reset(svg);
	$.template_effect(() => $.set_class(circle, 0, x(), 'svelte-70s021'));
	$.append($$anchor, svg);

	return $.pop($$exports);
}