import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>pending</p>`);
var root_2 = $.from_html(`<p>hello</p>`);
var root = $.from_html(`<button>cool</button> <button>neat</button> <button>reset</button> <!>`, 1);

export default function Main($$anchor) {
	let deferred = $.state($.proxy(Promise.withResolvers()));
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
			var p_1 = root_2();

			$.template_effect(($0) => $.set_class(p_1, 1, $0), void 0, [async () => $.clsx(await $.get(deferred).promise)]);
			$.append($$anchor, p_1);
		});
	}

	$.delegated('click', button, () => $.get(deferred).resolve('cool'));
	$.delegated('click', button_1, () => $.get(deferred).resolve('neat'));
	$.delegated('click', button_2, () => $.set(deferred, Promise.withResolvers(), true));
	$.append($$anchor, fragment);
}

$.delegate(['click']);