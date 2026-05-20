import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root_1 = $.from_html(`<p>pending</p>`);
var root = $.from_html(`<button>reset</button> <button>hello</button> <button>again</button> <!>`, 1);

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
			{
				$.async($$anchor, void 0, [() => $.get(deferred).promise], ($$anchor, $0) => {
					Child($$anchor, {
						get value() {
							return $.get($0);
						}
					});
				});

				$.next();
			}
		});
	}

	$.delegated('click', button, () => $.set(deferred, Promise.withResolvers(), true));
	$.delegated('click', button_1, () => $.get(deferred).resolve('hello'));
	$.delegated('click', button_2, () => $.get(deferred).resolve('hello again'));
	$.append($$anchor, fragment);
}

$.delegate(['click']);