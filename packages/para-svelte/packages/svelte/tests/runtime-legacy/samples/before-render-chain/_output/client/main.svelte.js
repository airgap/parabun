import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import List from './List.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let list = $.prop($$props, 'list', 12);

	var $$exports = {
		get list() {
			return list();
		},

		set list($$value) {
			list($$value);
			$.flush();
		}
	};

	$.bind_this(List($$anchor, { $$legacy: true }), ($$value) => list($$value), () => list());

	return $.pop($$exports);
}