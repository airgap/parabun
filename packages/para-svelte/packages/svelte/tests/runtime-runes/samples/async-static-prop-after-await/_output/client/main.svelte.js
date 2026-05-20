import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root = $.from_html(`<!> <div></div>`, 1);

export default function Main($$anchor) {
	var value;
	var $$promises = $.run([() => Promise.resolve(), () => value = 'value']);
	var fragment = root();
	var node = $.first_child(fragment);

	$.async(node, [$$promises[1]], void 0, ($$anchor) => {
		Child(node, {
			get value() {
				return value;
			}
		});
	});

	var div = $.sibling(node, 2);

	$.template_effect(() => $.set_class(div, 1, $.clsx(value)), void 0, void 0, [$$promises[1]]);
	$.append($$anchor, fragment);
}