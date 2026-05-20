import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { afterUpdate } from 'svelte';

var root = $.from_html(`<p> </p> <p></p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let a = $.prop($$props, 'a', 12);
	let b = $.prop($$props, 'b', 12);
	let value = $.prop($$props, 'value', 12);

	afterUpdate(() => {
		b(b().textContent = a().textContent, true);
	});

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

		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p, true);

	$.reset(p);
	$.bind_this(p, ($$value) => a($$value), () => a());

	var p_1 = $.sibling(p, 2);

	$.bind_this(p_1, ($$value) => b($$value), () => b());
	$.template_effect(() => $.set_text(text, value()));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}