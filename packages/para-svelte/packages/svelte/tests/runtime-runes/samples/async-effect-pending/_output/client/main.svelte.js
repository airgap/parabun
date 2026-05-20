import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>loading...</p>`);
var root_2 = $.from_html(`<p> </p> <p> </p> <p> </p> <p> </p>`, 1);
var root = $.from_html(`<button>increment</button> <button>shift</button> <!>`, 1);

export default function Main($$anchor) {
	let value = $.state(0);
	let deferreds = [];

	function push(value) {
		const deferred = Promise.withResolvers();

		deferreds.push({ value, deferred });

		return deferred.promise;
	}

	function shift() {
		const d = deferreds.shift();

		d?.deferred.resolve(d.value);
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var node = $.sibling(button_1, 2);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var fragment_1 = root_2();
			var p_1 = $.first_child(fragment_1);
			var text = $.child(p_1, true);

			$.reset(p_1);

			var p_2 = $.sibling(p_1, 2);
			var text_1 = $.child(p_2, true);

			$.reset(p_2);

			var p_3 = $.sibling(p_2, 2);
			var text_2 = $.child(p_3, true);

			$.reset(p_3);

			var p_4 = $.sibling(p_3, 2);
			var text_3 = $.child(p_4);

			$.reset(p_4);

			$.template_effect(
				($0, $1, $2) => {
					$.set_text(text, $0);
					$.set_text(text_1, $1);
					$.set_text(text_2, $2);
					$.set_text(text_3, `pending: ${$.eager($.pending) ?? ''}`);
				},
				void 0,
				[
					() => push($.get(value)),
					() => push($.get(value)),
					() => push($.get(value))
				]
			);

			$.append($$anchor, fragment_1);
		});
	}

	$.delegated('click', button, () => $.update(value));
	$.delegated('click', button_1, () => shift());
	$.append($$anchor, fragment);
}

$.delegate(['click']);