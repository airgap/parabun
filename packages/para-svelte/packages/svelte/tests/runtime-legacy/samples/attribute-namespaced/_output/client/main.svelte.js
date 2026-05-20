import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_svg(`<svg><use></use></svg>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12);

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		}
	};

	var svg = root();
	var use = $.child(svg);

	$.reset(svg);
	$.template_effect(() => $.set_xlink_attribute(use, 'xlink:href', `#${foo() ?? ''}`));
	$.append($$anchor, svg);

	return $.pop($$exports);
}