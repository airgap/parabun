import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root = $.from_html(`<!> <button>close</button>`, 1);

export default function Main($$anchor) {
	var // This async derived in parent triggers the bug
		something,
		active;

	var $$promises = $.run([
		async () => something = await $.async_derived(() => Promise.resolve('test')),
		() => active = $.state('some-id')
	]);

	var fragment = root();
	var node = $.first_child(fragment);

	$.async(node, [$$promises[1]], void 0, (node) => {
		var consequent = ($$anchor) => {
			{
				$.async($$anchor, [$$promises[1]], void 0, ($$anchor) => {
					Child($$anchor, {
						get id() {
							return $.get(active);
						}
					});
				});

				$.next();
			}
		};

		$.if(node, ($$render) => {
			if ($.get(active)) $$render(consequent);
		});
	});

	var button = $.sibling(node, 2);

	$.delegated('click', button, () => $.set(active, undefined));
	$.append($$anchor, fragment);
}

$.delegate(['click']);