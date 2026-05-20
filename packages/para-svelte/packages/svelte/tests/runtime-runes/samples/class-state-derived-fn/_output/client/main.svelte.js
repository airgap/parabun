import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	class Counter {
		#count = $.state(0);

		get count() {
			return $.get(this.#count);
		}

		set count(value) {
			$.set(this.#count, value, true);
		}

		#doubled = $.derived(() => this.count * 2);

		get doubled() {
			return $.get(this.#doubled);
		}

		set doubled(value) {
			$.set(this.#doubled, value);
		}
	}

	const counter = new Counter();
	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button, true);

	$.reset(button);

	var p = $.sibling(button, 2);
	var text_1 = $.child(p);

	$.reset(p);

	$.template_effect(() => {
		$.set_text(text, counter.count);
		$.set_text(text_1, `doubled: ${counter.doubled ?? ''}`);
	});

	$.event('click', button, () => counter.count++);
	$.append($$anchor, fragment);
	$.pop();
}