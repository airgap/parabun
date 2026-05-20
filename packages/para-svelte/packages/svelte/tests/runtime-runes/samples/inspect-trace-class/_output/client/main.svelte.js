import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/tracing';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button> </button>`), Main[$.FILENAME], [[26, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	class Counter {
		#count;

		constructor() {
			this.#count = $.tag($.state(0), 'Counter.#count');
		}

		get count() {
			return $.get(this.#count);
		}

		increment = () => {
			$.set(this.#count, $.get(this.#count) + 1);
		};
	}

	const counter = new Counter();

	$.user_effect(() => {
		return $.trace(() => 'effect', () => {
			counter.count;
		});
	});

	var $$exports = { ...$.legacy_api() };
	var button = root();
	var text = $.child(button);

	$.reset(button);
	$.template_effect(() => $.set_text(text, `clicks: ${counter.count ?? ''}`));

	$.delegated('click', button, function (...$$args) {
		$.apply(() => counter.increment, this, $$args, Main, [26, 17]);
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}

$.delegate(['click']);