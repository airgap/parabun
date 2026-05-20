import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p id="count"> </p> <p id="fallback-count"> </p> <button id="increment">Click to change referenced state value</button> <button id="change-ref">Click to change state reference</button>`, 1);

export default function Main($$anchor) {
	const counter = ($$anchor, $$arg0) => {
		let c = $.derived_safe_equal(() => $.fallback($$arg0?.(), count));
		var fragment = root_1();
		var p = $.first_child(fragment);
		var text = $.child(p);

		$.reset(p);

		var p_1 = $.sibling(p, 2);
		var text_1 = $.child(p_1);

		$.reset(p_1);

		var button = $.sibling(p_1, 2);
		var button_1 = $.sibling(button, 2);

		$.template_effect(() => {
			$.set_text(text, `Count: ${count.value ?? ''}`);
			$.set_text(text_1, `Fallback count: ${fallback_count.value ?? ''}`);
		});

		$.event('click', button, () => $.get(c).value += 1);
		$.event('click', button_1, () => $.set(toggle_state, !$.get(toggle_state)));
		$.append($$anchor, fragment);
	};

	function box(value) {
		let state = $.state($.proxy(value));

		return {
			get value() {
				return $.get(state);
			},

			set value(v) {
				$.set(state, v, true);
			}
		};
	}

	let count = box(0);
	let fallback_count = box(0);
	let toggle_state = $.state(false);

	counter($$anchor, () => $.get(toggle_state) ? fallback_count : undefined);
}