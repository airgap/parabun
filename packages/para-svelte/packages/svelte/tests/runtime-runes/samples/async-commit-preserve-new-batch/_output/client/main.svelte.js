import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>pending</p>`);
var root = $.from_html(`<button>update</button> <p> </p> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let count = $.state(-1);
	let payload = $.state(false);
	let updated = $.state(false);

	$.user_effect(() => {
		if ($.get(payload)) {
			$.set(updated, true);
		}
	});

	function update() {
		$.set(count, 0);

		queueMicrotask(() => {
			$.set(payload, true);
		});
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var p = $.sibling(button, 2);
	var text = $.child(p, true);

	$.reset(p);

	var node = $.sibling(p, 2);

	{
		const pending = ($$anchor) => {
			var p_1 = root_1();

			$.append($$anchor, p_1);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			$.next();

			var text_1 = $.text();

			$.template_effect(($0) => $.set_text(text_1, $0), void 0, [() => new Promise(() => {})]);
			$.append($$anchor, text_1);
		});
	}

	$.template_effect(() => $.set_text(text, $.get(updated)));
	$.delegated('click', button, update);
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);