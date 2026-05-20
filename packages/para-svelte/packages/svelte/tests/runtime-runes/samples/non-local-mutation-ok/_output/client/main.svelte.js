import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Child from './child.svelte';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	class X {
		#y = $.tag($.state(1), 'X.y');

		get y() {
			return $.get(this.#y);
		}

		set y(value) {
			$.set(this.#y, value, true);
		}
	}

	const klass = new X();
	let y = $.tag($.state(1), 'y');

	const getter_setter = {
		get y() {
			return $.get(y);
		},

		set y(value) {
			$.set(y, value, true);
		}
	};

	var $$exports = { ...$.legacy_api() };

	$.add_svelte_meta(
		() => Child($$anchor, {
			get klass() {
				return klass;
			},

			get getter_setter() {
				return getter_setter;
			}
		}),
		'component',
		Main,
		21,
		0,
		{ componentTag: 'Child' }
	);

	return $.pop($$exports);
}