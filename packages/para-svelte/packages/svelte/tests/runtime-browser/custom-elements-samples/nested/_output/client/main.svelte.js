import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { setContext } from "svelte";
import Counter from "./Counter.svelte";

var root_1 = $.from_html(`<span> </span>`);
var root = $.from_html(`<!> <p> </p>`, 1);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	let count = $.prop($$props, 'count', 12);
	let counter = $.prop($$props, 'counter', 12);

	setContext("context", "works");

	var $$exports = {
		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
			$.flush();
		},

		get counter() {
			return counter();
		},

		set counter($$value) {
			counter($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var node = $.first_child(fragment);

	$.bind_this(
		Counter(node, {
			get count() {
				return count();
			},

			set count($$value) {
				count($$value);
			},

			children: ($$anchor, $$slotProps) => {
				var span = root_1();
				var text = $.child(span);

				$.reset(span);
				$.template_effect(() => $.set_text(text, `slot ${count() ?? ''}`));
				$.append($$anchor, span);
			},
			$$slots: { default: true },
			$$legacy: true
		}),
		($$value) => counter($$value),
		() => counter()
	);

	var p = $.sibling(node, 2);
	var text_1 = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text_1, `clicked ${count() ?? ''} times`));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}

customElements.define('my-app', $.create_custom_element(_unknown_, { count: {}, counter: {} }, [], [], { mode: 'open' }));