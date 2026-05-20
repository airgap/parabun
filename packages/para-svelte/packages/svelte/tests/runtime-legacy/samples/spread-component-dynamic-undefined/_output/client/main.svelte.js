import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let props = $.prop($$props, 'props', 12);

	var $$exports = {
		get props() {
			return props();
		},

		set props($$value) {
			props($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.component(node, () => undefined, ($$anchor, $$component) => {
		$$component($$anchor, $.spread_props(props));
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}