import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root_2 = $.from_html(`<p> </p>`);
var root_3 = $.from_html(`<p> </p>`);
var root = $.from_html(`<button>inc</button> <!> <!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	class Counter {
		#a = $.state();
		#b = $.state($.proxy({ val: -1 }));
		#c = $.state();

		constructor() {
			$.set(this.#a, this.#a.v || { val: 0 }, true);
			$.set(this.#b, this.#b.v && { val: 0 }, true);
			$.set(this.#c, this.#c.v ?? { val: 0 }, true);
		}

		inc() {
			$.get(this.#a).val += 1;
			$.get(this.#b).val += 2;
			$.get(this.#c).val += 3;
		}

		get a() {
			return $.get(this.#a)?.val;
		}

		get b() {
			return $.get(this.#b)?.val;
		}

		get c() {
			return $.get(this.#c)?.val;
		}
	}

	let counter = new Counter();
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	$.key(node, () => 1, ($$anchor) => {
		var p = root_1();
		var text = $.child(p);

		$.reset(p);
		$.template_effect(() => $.set_text(text, `a:${counter.a ?? ''}`));
		$.append($$anchor, p);
	});

	var node_1 = $.sibling(node, 2);

	$.key(node_1, () => 2, ($$anchor) => {
		var p_1 = root_2();
		var text_1 = $.child(p_1);

		$.reset(p_1);
		$.template_effect(() => $.set_text(text_1, `b:${counter.b ?? ''}`));
		$.append($$anchor, p_1);
	});

	var node_2 = $.sibling(node_1, 2);

	$.key(node_2, () => 3, ($$anchor) => {
		var p_2 = root_3();
		var text_2 = $.child(p_2);

		$.reset(p_2);
		$.template_effect(() => $.set_text(text_2, `c:${counter.c ?? ''}`));
		$.append($$anchor, p_2);
	});

	$.delegated('click', button, () => counter.inc());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);