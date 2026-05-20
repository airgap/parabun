import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Component from './Component.svelte';

var root = $.add_locations($.from_html(`<button>Set State</button> <!>`, 1), Main[$.FILENAME], [[7, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let s = $.tag($.state($.proxy({ a: { "1": "a", "2": "b" } })), 's');
	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.add_svelte_meta(
				() => $.each(node_1, 17, () => Object.entries($.get(s).a), $.index, ($$anchor, $$item) => {
					var $$array = $.derived(() => $.to_array($.get($$item), 2));
					let k = () => $.get($$array)[0];

					k();

					let v = () => $.get($$array)[1];

					v();
					$.validate_binding('bind:a={s.a[k]}', [], () => $.get(s).a, k, 11, 13);

					$.add_svelte_meta(
						() => Component($$anchor, {
							get a() {
								return $.get(s).a[k()];
							},

							set a($$value) {
								$.get(s).a[k()] = $$value;
							}
						}),
						'component',
						Main,
						11,
						2,
						{ componentTag: 'Component' }
					);
				}),
				'each',
				Main,
				10,
				1
			);

			$.append($$anchor, fragment_1);
		};

		$.add_svelte_meta(
			() => $.if(node, ($$render) => {
				if ($.get(s).a) $$render(consequent);
			}),
			'if',
			Main,
			9,
			0
		);
	}

	$.delegated('click', button, function click() {
		return $.set(s, {}, true);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);