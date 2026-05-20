import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button>Delete</button>`), Main[$.FILENAME], [[33, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	function createState(init) {
		let values = $.tag_proxy($.proxy(init), 'values');

		return {
			get value() {
				return $.snapshot(values);
			},

			get workedValues() {
				let newValue = [];

				for (const value of values) {
					if ($.strict_equals(value, undefined)) {
						throw new Error('undefined found');
					}

					newValue.push(value);
				}

				return newValue;
			},

			doSplice() {
				values.splice(0, 1);
			}
		};
	}

	const myState = createState([1, 2, 3, 7]);

	$.inspect(() => [myState.workedValues], (...$$args) => console.log(...$$args), true);

	var $$exports = { ...$.legacy_api() };
	var button = root();

	$.delegated('click', button, function click() {
		return myState.doSplice();
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}

$.delegate(['click']);