import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p> <p> </p> <p> </p> <p> </p>`, 1);
var root_3 = $.from_html(`<p> </p> <p> </p> <p> </p>`, 1);
var root = $.from_html(`<!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let object = $.prop($$props, 'object', 28, () => Promise.resolve({
		prop1: { prop4: 2, prop5: 3 },
		prop2: { prop6: 5, prop7: 6, prop8: 7 },
		prop3: { prop9: 9, prop10: 10 }
	}));

	const objectReject = Promise.reject({ propZ: 5, propY: 6, propX: 7, propW: 8 });
	let num = $.mutable_source(1);
	const prop = 'prop';

	var $$exports = {
		get object() {
			return object();
		},

		set object($$value) {
			object($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	$.await(node, object, null, ($$anchor, $$source) => {
		var $$value = $.derived_safe_equal(() => {
			var {
				[`prop${$.update(num)}`]: { [`prop${$.get(num) + 3}`]: propA },
				[`prop${$.update(num)}`]: { [`prop${$.get(num) + 5}`]: propB },
				...rest
			} = $.get($$source);

			return { propA, propB, rest };
		});

		var propA = $.derived_safe_equal(() => $.get($$value).propA);
		var propB = $.derived_safe_equal(() => $.get($$value).propB);
		var rest = $.derived_safe_equal(() => $.get($$value).rest);
		var fragment_1 = root_1();
		var p = $.first_child(fragment_1);
		var text = $.child(p);

		$.reset(p);

		var p_1 = $.sibling(p, 2);
		var text_1 = $.child(p_1);

		$.reset(p_1);

		var p_2 = $.sibling(p_1, 2);
		var text_2 = $.child(p_2);

		$.reset(p_2);

		var p_3 = $.sibling(p_2, 2);
		var text_3 = $.child(p_3);

		$.reset(p_3);

		$.template_effect(
			($0) => {
				$.set_text(text, `propA: ${$.get(propA) ?? ''}`);
				$.set_text(text_1, `propB: ${$.get(propB) ?? ''}`);
				$.set_text(text_2, `num: ${$.get(num) ?? ''}`);
				$.set_text(text_3, `rest: ${$0 ?? ''}`);
			},
			[
				() => (
					$.deep_read_state($.get(rest)),
					$.untrack(() => JSON.stringify($.get(rest)))
				)
			]
		);

		$.append($$anchor, fragment_1);
	});

	var node_1 = $.sibling(node, 2);

	$.await(
		node_1,
		() => objectReject,
		null,
		($$anchor, value) => {
			var text_4 = $.text('resolved');

			$.append($$anchor, text_4);
		},
		($$anchor, $$source) => {
			var $$value = $.derived_safe_equal(() => {
				var { [`${prop}Z`]: propZ, [`${prop}Y`]: propY, ...rest } = $.get($$source);

				return { propZ, propY, rest };
			});

			var propZ = $.derived_safe_equal(() => $.get($$value).propZ);
			var propY = $.derived_safe_equal(() => $.get($$value).propY);
			var rest = $.derived_safe_equal(() => $.get($$value).rest);
			var fragment_2 = root_3();
			var p_4 = $.first_child(fragment_2);
			var text_5 = $.child(p_4);

			$.reset(p_4);

			var p_5 = $.sibling(p_4, 2);
			var text_6 = $.child(p_5);

			$.reset(p_5);

			var p_6 = $.sibling(p_5, 2);
			var text_7 = $.child(p_6);

			$.reset(p_6);

			$.template_effect(
				($0) => {
					$.set_text(text_5, `propZ: ${$.get(propZ) ?? ''}`);
					$.set_text(text_6, `propY: ${$.get(propY) ?? ''}`);
					$.set_text(text_7, `rest: ${$0 ?? ''}`);
				},
				[
					() => (
						$.deep_read_state($.get(rest)),
						$.untrack(() => JSON.stringify($.get(rest)))
					)
				]
			);

			$.append($$anchor, fragment_2);
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}