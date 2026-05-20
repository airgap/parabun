import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	class A {
		constructor() {
			this.a = this;
		}
	}

	const state = $.tag_proxy($.proxy(new A()), 'state');

	$.inspect(() => [state], (...$$args) => console.log(...$$args), true);

	class B {
		constructor() {
			this.a = { b: this };
		}
	}

	const state2 = $.tag_proxy($.proxy(new B()), 'state2');

	$.inspect(() => [state2], (...$$args) => console.log(...$$args), true);

	var $$exports = { ...$.legacy_api() };

	return $.pop($$exports);
}