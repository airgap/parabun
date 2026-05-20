import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>pending</p>`);
var root_2 = $.from_html(`<p> </p> <button data-id="reset">reset</button>`, 1);
var root_3 = $.from_html(`<h1> </h1>`);
var root = $.from_html(`<button>step 1</button> <button>step 2</button> <button>step 3</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

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

		const failed = ($$anchor, error = $.noop, reset = $.noop) => {
			var fragment_1 = root_2();
			var p_1 = $.first_child(fragment_1);
			var text = $.child(p_1, true);

			$.reset(p_1);

			var button_3 = $.sibling(p_1, 2);

			$.template_effect(() => $.set_text(text, error().message));

			$.delegated('click', button_3, function (...$$args) {
				reset()?.apply(this, $$args);
			});

			$.append($$anchor, fragment_1);
		};

		$.boundary(node, { pending, failed }, ($$anchor) => {
			var h1 = root_3();
			var text_1 = $.child(h1, true);

			$.reset(h1);
			$.template_effect(($0) => $.set_text(text_1, $0), void 0, [() => $.get(deferred).promise]);
			$.append($$anchor, h1);
		});
	}

	$.delegated('click', button, () => $.get(deferred).reject(new Error('oops!')));
	$.delegated('click', button_1, () => $.set(deferred, Promise.withResolvers(), true));
	$.delegated('click', button_2, () => $.get(deferred).resolve('wheee'));
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);