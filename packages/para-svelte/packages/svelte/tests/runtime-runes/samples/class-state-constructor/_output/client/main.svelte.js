import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	class Counter {
		#doubled;

		get doubled() {
			return $.get(this.#doubled);
		}

		set doubled(value) {
			$.set(this.#doubled, value);
		}

		#count;

		constructor(initial) {
			this.#count = $.state($.proxy(initial));
			this.#doubled = $.derived(() => $.get(this.#count) * 2);
		}

		increment = () => {
			$.update(this.#count);
		};
	}

	const counter = new Counter(10);
	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, counter.doubled));

	$.delegated('click', button, function (...$$args) {
		counter.increment?.apply(this, $$args);
	});

	$.append($$anchor, button);
	$.pop();
}

$.delegate(['click']);