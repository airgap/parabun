import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root_1 = $.add_locations($.from_html(`<p>pending</p>`), Main[$.FILENAME], [[43, 2]]);
var root_2 = $.add_locations($.from_html(`<h1> </h1>`), Main[$.FILENAME], [[40, 1]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let values = $.tag_proxy($.proxy([0, 1, 2]), 'values');

	async function get_result() {
		const logs = [];

		const iterator = {
			index: 0,
			async next() {
				if (this.index > 2) {
					done: true;
				}

				return { done: false, value: values[this.index++] };
			},

			async return() {
				logs.push('return');
			},

			[Symbol.asyncIterator]() {
				return this;
			}
		};

		try {
			for await (const value of $.for_await_track_reactivity_loss(iterator)) {
				logs.push('number');

				// Read reactive state after async iterator await.
				if ($.strict_equals(values.length, 3) && $.strict_equals(value, 2)) {
					throw new Error('body failed');
				}
			}

			logs.push('done');
		} catch(error) {
			logs.push(error.message);
		}

		logs.push('ended');

		return logs.join(' -> ');
	}

	var $$exports = { ...$.legacy_api() };
	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		const pending = $.wrap_snippet(Main, function ($$anchor) {
			$.validate_snippet_args(...arguments);

			var p = root_1();

			$.append($$anchor, p);
		});

		$.boundary(node, { pending }, ($$anchor) => {
			var h1 = root_2();
			var text = $.child(h1, true);

			$.reset(h1);
			$.template_effect(($0) => $.set_text(text, $0), void 0, [async () => (await $.track_reactivity_loss(get_result()))()]);
			$.append($$anchor, h1);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}