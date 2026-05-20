import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button> <button> </button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	class Counter {
		#_count = $.state(0);

		get count() {
			return $.get(this.#_count);
		}

		set count(value) {
			$.set(this.#_count, value, true);
		}

		#count = $.state(0);
		increment = () => $.set(this.#count, $.get(this.#count) + 1);

		get secretCount() {
			return $.get(this.#count);
		}
	}

	const counter = new Counter();
	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button, true);

	$.reset(button);

	var button_1 = $.sibling(button, 2);
	var text_1 = $.child(button_1, true);

	$.reset(button_1);

	$.template_effect(() => {
		$.set_text(text, counter.count);
		$.set_text(text_1, counter.secretCount);
	});

	$.event('click', button, () => counter.count++);

	$.event('click', button_1, function (...$$args) {
		counter.increment?.apply(this, $$args);
	});

	$.append($$anchor, fragment);
	$.pop();
}