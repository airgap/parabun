import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Level1 from './Level1.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let l1 = $.prop($$props, 'l1', 12);

	var $$exports = {
		get l1() {
			return l1();
		},

		set l1($$value) {
			l1($$value);
			$.flush();
		}
	};

	$.bind_this(Level1($$anchor, { $$legacy: true }), ($$value) => l1($$value), () => l1());

	return $.pop($$exports);
}