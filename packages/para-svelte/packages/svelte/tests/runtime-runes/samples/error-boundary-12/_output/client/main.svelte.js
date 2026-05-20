import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>Error occurred</p>`);
var root = $.from_html(`<button>change</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let count = $.state(0);

	const d = $.derived(() => {
		if ($.get(count) === 1) {
			throw new Error('kaboom');
		}

		return $.get(count);
	});

	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	{
		const failed = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { failed }, ($$anchor) => {
			$.next();

			var text = $.text();

			$.template_effect(() => $.set_text(text, $.get(d)));
			$.append($$anchor, text);
		});
	}

	$.delegated('click', button, () => $.update(count));
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);