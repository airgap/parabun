import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let flag = $.prop($$props, 'flag', 12, true);

	var $$exports = {
		get flag() {
			return flag();
		},

		set flag($$value) {
			flag($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.component(node, () => flag() && Widget, ($$anchor, $$component) => {
		$$component($$anchor, {});
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}