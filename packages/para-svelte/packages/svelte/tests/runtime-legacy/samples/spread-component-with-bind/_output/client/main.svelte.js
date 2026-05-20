import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let props = $.prop($$props, 'props', 28, () => ({}));
	let x = $.prop($$props, 'x', 12, 'foo');

	var $$exports = {
		get props() {
			return props();
		},

		set props($$value) {
			props($$value);
			$.flush();
		},

		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.component(node, () => Widget, ($$anchor, $$component) => {
		$$component($$anchor, $.spread_props(props, {
			get value() {
				return x();
			},

			set value($$value) {
				x($$value);
			},
			$$legacy: true
		}));
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}