import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import One from './One.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let one = $.prop($$props, 'one', 12);

	var $$exports = {
		get one() {
			return one();
		},

		set one($$value) {
			one($$value);
			$.flush();
		}
	};

	$.bind_this(One($$anchor, { $$legacy: true }), ($$value) => one($$value), () => one());

	return $.pop($$exports);
}