import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let a = $.prop($$props, 'a', 12);
	let b = $.prop($$props, 'b', 12);

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
		}
	};

	var div = root();

	$.template_effect(() => {
		$.set_attribute(div, 'data-a', a());
		$.set_attribute(div, 'data-b', b());
	});

	$.append($$anchor, div);

	return $.pop($$exports);
}