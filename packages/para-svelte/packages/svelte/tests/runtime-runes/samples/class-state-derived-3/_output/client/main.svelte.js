import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p> <p> </p> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	class Foo {
		#a = $.state(0);

		get a() {
			return $.get(this.#a);
		}

		set a(value) {
			$.set(this.#a, value, true);
		}

		#c = $.derived(() => this.b * 2);

		get c() {
			return $.get(this.#c);
		}

		set c(value) {
			$.set(this.#c, value);
		}

		#b = $.derived(() => this.a * 2);

		get b() {
			return $.get(this.#b);
		}

		set b(value) {
			$.set(this.#b, value);
		}

		constructor(a) {
			this.a = a;
		}
	}

	const foo = new Foo(1);
	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p);

	$.reset(p);

	var p_1 = $.sibling(p, 2);
	var text_1 = $.child(p_1);

	$.reset(p_1);

	var p_2 = $.sibling(p_1, 2);
	var text_2 = $.child(p_2);

	$.reset(p_2);

	$.template_effect(() => {
		$.set_text(text, `a ${foo.a ?? ''}`);
		$.set_text(text_1, `b ${foo.b ?? ''}`);
		$.set_text(text_2, `c ${foo.c ?? ''}`);
	});

	$.append($$anchor, fragment);
	$.pop();
}