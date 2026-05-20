import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Level1 from './Level1.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let values = $.prop($$props, 'values', 12);

	var $$exports = {
		get values() {
			return values();
		},

		set values($$value) {
			values($$value);
			$.flush();
		}
	};

	Level1($$anchor, {
		get values() {
			return values();
		}
	});

	return $.pop($$exports);
}