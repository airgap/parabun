import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import A from './A.svelte';
import B from './B.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12, true);

	var $$exports = {
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

	$.component(node, () => x() ? A : B, ($$anchor, $$component) => {
		$$component($$anchor, {});
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}