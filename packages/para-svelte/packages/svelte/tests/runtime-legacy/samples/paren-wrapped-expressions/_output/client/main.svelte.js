import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<span>true</span>`);
var root_2 = $.from_html(`<span> </span>`);
var root = $.from_html(`<span> </span> <span></span> <!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let a = $.prop($$props, 'a', 12);
	let b = $.prop($$props, 'b', 12);
	let c = $.prop($$props, 'c', 12);

	var $$exports = {
		get a() {
			return a();
		},

		set a($$value) {
			a($$value);
			$.flush();
		},

		get b() {
			return b();
		},

		set b($$value) {
			b($$value);
			$.flush();
		},

		get c() {
			return c();
		},

		set c($$value) {
			c($$value);
			$.flush();
		}
	};

	var fragment = root();
	var span = $.first_child(fragment);
	var text = $.child(span, true);

	$.reset(span);

	var span_1 = $.sibling(span, 2);
	var node = $.sibling(span_1, 2);

	{
		var consequent = ($$anchor) => {
			var span_2 = root_1();

			$.append($$anchor, span_2);
		};

		$.if(node, ($$render) => {
			if (b()) $$render(consequent);
		});
	}

	var node_1 = $.sibling(node, 2);

	$.each(node_1, 1, c, $.index, ($$anchor, x) => {
		var span_3 = root_2();
		var text_1 = $.child(span_3, true);

		$.reset(span_3);
		$.template_effect(() => $.set_text(text_1, $.get(x)));
		$.append($$anchor, span_3);
	});

	$.template_effect(() => {
		$.set_text(text, a());
		$.set_class(span_1, 1, a());
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}