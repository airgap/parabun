import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { setContext } from 'svelte';
import Child from './Child.svelte';

var root_2 = $.from_html(`<p>...waiting</p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);
	setContext('test', 123);

	let promise = $.prop($$props, 'promise', 28, () => Promise.resolve());

	var $$exports = {
		get promise() {
			return promise();
		},

		set promise($$value) {
			promise($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.await(
		node,
		promise,
		($$anchor) => {
			var p = root_2();

			$.append($$anchor, p);
		},
		($$anchor) => {
			Child($$anchor, {});
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}