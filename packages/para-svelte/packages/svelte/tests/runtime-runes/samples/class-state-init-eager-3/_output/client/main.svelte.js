import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	class Counter {
		#_count = $.state();

		get count() {
			return $.get(this.#_count);
		}

		set count(value) {
			$.set(this.#_count, value, true);
		}

		#count;

		constructor(initial_count) {
			console.log(this.count);
			this.count = initial_count;
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