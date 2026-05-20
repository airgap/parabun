import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { slide } from "svelte/transition";

var root_1 = $.from_html(`<p>bar</p>`);
var root = $.from_html(`<p>foo</p> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let open = $.prop($$props, 'open', 12, false);
	let color = $.prop($$props, 'color', 12, "red");
	let border = $.prop($$props, 'border', 12, false);

	var $$exports = {
		get open() {
			return open();
		},

		set open($$value) {
			open($$value);
			$.flush();
		},

		get color() {
			return color();
		},

		set color($$value) {
			color($$value);
			$.flush();
		},

		get border() {
			return border();
		},

		set border($$value) {
			border($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.sibling($.first_child(fragment), 2);

	{
		var consequent = ($$anchor) => {
			var p = root_1();
			let classes;

			$.template_effect(() => classes = $.set_class(p, 1, $.clsx(color()), 'svelte-70s021', classes, { border: border() }));
			$.transition(3, p, () => slide, () => ({ duration: 100 }));
			$.append($$anchor, p);
		};

		$.if(node, ($$render) => {
			if (open()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}