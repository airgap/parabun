import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { beforeUpdate } from 'svelte';

export default function Child($$anchor, $$props) {
	$.push($$props, false);

	let object = $.prop($$props, 'object', 12);

	beforeUpdate(() => {
		console.log('changed');
	});

	var $$exports = {
		get object() {
			return object();
		},

		set object($$value) {
			object($$value);
			$.flush();
		}
	};

	$.init();

	return $.pop($$exports);
}