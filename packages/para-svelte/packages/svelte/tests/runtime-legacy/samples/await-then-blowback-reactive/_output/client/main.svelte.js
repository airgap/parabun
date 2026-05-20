import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

var root_1 = $.from_html(`<!> <span> </span>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let promise = $.prop($$props, 'promise', 28, () => Promise.resolve(['a', 'b']));
	let value = $.mutable_source();

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
			var text_1 = $.text('Loading...');

			$.append($$anchor, text_1);
		},
		($$anchor, options) => {
			var fragment_1 = root_1();
			var node_1 = $.first_child(fragment_1);

			Widget(node_1, {
				get options() {
					return $.get(options);
				},

				get value() {
					return $.get(value);
				},

				set value($$value) {
					$.set(value, $$value);
				},
				$$legacy: true
			});

			var span = $.sibling(node_1, 2);
			var text = $.child(span, true);

			$.reset(span);
			$.template_effect(() => $.set_text(text, $.get(value)));
			$.append($$anchor, fragment_1);
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}