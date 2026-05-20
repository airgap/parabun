import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

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

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.await(
		node,
		promise,
		($$anchor) => {
			Widget($$anchor, {});
		},
		($$anchor, result) => {
			Widget($$anchor, {
				get value() {
					return $.get(result);
				}
			});
		},
		($$anchor, err) => {
			Widget($$anchor, {
				get value() {
					return $.get(err);
				}
			});
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}