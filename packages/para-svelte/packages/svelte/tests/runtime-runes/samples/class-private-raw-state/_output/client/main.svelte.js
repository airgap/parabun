import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	class Counter {
		#count = $.state(0);

		constructor(initial_count) {
			$.set(this.#count, initial_count);
		}

		get count() {
			return $.get(this.#count);
		}

		set count(val) {
			$.set(this.#count, val);
		}
	}

	const counter = new Counter(0);
	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, counter.count));
	$.event('click', button, () => counter.count++);
	$.append($$anchor, button);
	$.pop();
}