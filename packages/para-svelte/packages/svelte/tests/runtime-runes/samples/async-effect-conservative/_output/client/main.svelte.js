import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>loading...</p>`);
var root_2 = $.from_html(`<button>increment</button> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let count = $.state(0);
	let two_or_larger = $.derived(() => $.get(count) >= 2);

	$.user_effect(() => {
		console.log($.get(two_or_larger));
	});

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var fragment_1 = root_2();
			var button = $.first_child(fragment_1);
			var p_1 = $.sibling(button, 2);
			var text = $.child(p_1, true);

			$.reset(p_1);
			$.template_effect(($0) => $.set_text(text, $0), void 0, [() => $.get(count)]);
			$.delegated('click', button, () => $.set(count, $.get(count) + 1));
			$.append($$anchor, fragment_1);
		});
	}

	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);