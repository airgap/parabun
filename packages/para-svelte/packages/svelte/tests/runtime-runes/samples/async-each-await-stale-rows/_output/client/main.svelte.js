import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>pending</p>`);
var root_3 = $.from_html(` <div> </div>`, 1);
var root = $.from_html(`<button class="spam">Spam</button> <button class="resolve">Resolve</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let value = $.proxy({ id: '0' });
	const resolvers = [];

	function wait() {
		const promise = Promise.withResolvers();

		resolvers.push(promise.resolve);

		return promise.promise;
	}

	function spam() {
		value.id = `${Number(value.id) + 1}`;
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
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.each(node_1, 16, () => [value.id], (s) => s, ($$anchor, s) => {
				$.next();

				var fragment_2 = root_3();
				var text = $.first_child(fragment_2);
				var div = $.sibling(text);
				var text_1 = $.child(div, true);

				$.reset(div);

				$.template_effect(
					($0) => {
						$.set_text(text, `${$0 ?? ''} `);
						$.set_text(text_1, s);
					},
					void 0,
					[() => wait()]
				);

				$.append($$anchor, fragment_2);
			});

			$.append($$anchor, fragment_1);
		});
	}

	$.delegated('click', button, spam);
	$.delegated('click', button_1, () => resolvers.shift()?.());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);