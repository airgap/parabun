import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>pending</p>`);
var root_3 = $.from_html(`<p> </p>`);
var root = $.from_html(`<button>step 1</button> <button>step 2</button> <button>step 3</button> <!>`, 1);

export default function Main($$anchor) {
	let items = $.state($.proxy([
		Promise.withResolvers(),
		Promise.withResolvers(),
		Promise.withResolvers()
	]));

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var node = $.sibling(button_2, 2);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.each(node_1, 17, () => $.get(items), $.index, ($$anchor, deferred) => {
				var p_1 = root_3();
				var text = $.child(p_1, true);

				$.reset(p_1);
				$.template_effect(($0) => $.set_text(text, $0), void 0, [() => $.get(deferred).promise]);
				$.append($$anchor, p_1);
			});

			$.append($$anchor, fragment_1);
		});
	}

	$.delegated('click', button, () => {
		$.get(items)[0].resolve('a');
		$.get(items)[1].resolve('b');
		$.get(items)[2].resolve('c');
	});

	$.delegated('click', button_1, () => {
		$.set(
			items,
			[
				Promise.withResolvers(),
				Promise.withResolvers(),
				Promise.withResolvers(),
				Promise.withResolvers()
			],
			true
		);
	});

	$.delegated('click', button_2, () => {
		$.get(items)[0].resolve('b');
		$.get(items)[1].resolve('c');
		$.get(items)[2].resolve('d');
		$.get(items)[3].resolve('e');
	});

	$.append($$anchor, fragment);
}

$.delegate(['click']);