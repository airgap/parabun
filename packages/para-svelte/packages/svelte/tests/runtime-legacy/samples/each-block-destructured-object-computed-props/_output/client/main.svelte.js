import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p> <p> </p> <p> </p> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let objectsArray = $.prop($$props, 'objectsArray', 12);
	let firstString = $.prop($$props, 'firstString', 12);
	let secondString = $.prop($$props, 'secondString', 12);

	var $$exports = {
		get objectsArray() {
			return objectsArray();
		},

		set objectsArray($$value) {
			objectsArray($$value);
			$.flush();
		},

		get firstString() {
			return firstString();
		},

		set firstString($$value) {
			firstString($$value);
			$.flush();
		},

		get secondString() {
			return secondString();
		},

		set secondString($$value) {
			secondString($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, objectsArray, $.index, ($$anchor, $$item) => {
		let firstProp = () => $.get($$item)[firstString()];
		let secondProp = () => $.get($$item)[secondString()];
		let reverseFirst = () => $.get($$item)[firstString().split('').reverse().join('')];
		let upperSecond = () => $.get($$item)[secondString().toUpperCase()];
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
			($0, $1) => {
				$.set_text(text, `${firstString() ?? ''}: ${firstProp() ?? ''}`);
				$.set_text(text_1, `${secondString() ?? ''}: ${secondProp() ?? ''}`);
				$.set_text(text_2, `${$0 ?? ''}: ${reverseFirst() ?? ''}`);
				$.set_text(text_3, `${$1 ?? ''}: ${upperSecond() ?? ''}`);
			},
			[
				() => (
					$.deep_read_state(firstString()),
					$.untrack(() => firstString().split('').reverse().join(''))
				),

				() => (
					$.deep_read_state(secondString()),
					$.untrack(() => secondString().toUpperCase())
				)
			]
		);

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}