import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	class Counter {
		#count = $.tag($.state(), 'Counter.#count');

		constructor() {
			const instance = this;

			$.set(instance.#count, 1);
		}

		get count() {
			return $.get(this.#count);
		}

		get count2() {
			const instance = this;

			return $.get(instance.#count);
		}
	}

	const counter = new Counter();

	$.inspect(() => [counter.count], (...$$args) => console.log(...$$args), true);
	$.inspect(() => [counter.count2], (...$$args) => console.log(...$$args), true);

	var $$exports = { ...$.legacy_api() };

	return $.pop($$exports);
}