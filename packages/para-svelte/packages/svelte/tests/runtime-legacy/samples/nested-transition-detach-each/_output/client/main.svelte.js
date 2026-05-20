import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

var root_3 = $.add_locations($.from_html(`<div class="cell"> </div>`), Main[$.FILENAME], [[18, 4]]);
var root_2 = $.add_locations($.from_html(`<div class="row"></div>`), Main[$.FILENAME], [[16, 2]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, Main);

	let visible = $.prop($$props, 'visible', 12);
	let rows = $.prop($$props, 'rows', 12);
	let cols = $.prop($$props, 'cols', 12);

	function foo(node) {
		return {
			duration: 100,
			tick: (t) => $.assign(node, 'foo', '=', t, 'main.svelte:9:14')
		};
	}

	var $$exports = {
		...$.legacy_api(),
		get visible() {
			return visible();
		},

		set visible($$value) {
			visible($$value);
			$.flush();
		},

		get rows() {
			return rows();
		},

		set rows($$value) {
			rows($$value);
			$.flush();
		},

		get cols() {
			return cols();
		},

		set cols($$value) {
			cols($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node_1 = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_2 = $.first_child(fragment_1);

			$.add_svelte_meta(
				() => $.each(node_2, 1, rows, $.index, ($$anchor, row) => {
					var div = root_2();

					$.add_svelte_meta(
						() => $.each(div, 5, cols, $.index, ($$anchor, col) => {
							var div_1 = root_3();
							var text = $.child(div_1);

							$.reset(div_1);
							$.template_effect(() => $.set_text(text, `${$.get(row) ?? ''}, ${$.get(col) ?? ''}`));
							$.transition(2, div_1, () => foo);
							$.append($$anchor, div_1);
						}),
						'each',
						Main,
						17,
						3
					);

					$.reset(div);
					$.transition(2, div, () => foo);
					$.append($$anchor, div);
				}),
				'each',
				Main,
				15,
				1
			);

			$.append($$anchor, fragment_1);
		};

		$.add_svelte_meta(
			() => $.if(node_1, ($$render) => {
				if (visible()) $$render(consequent);
			}),
			'if',
			Main,
			14,
			0
		);
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}