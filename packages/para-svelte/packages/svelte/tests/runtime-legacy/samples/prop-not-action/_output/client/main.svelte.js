import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let currentUser = $.prop($$props, 'currentUser', 12);

	var $$exports = {
		get currentUser() {
			return currentUser();
		},

		set currentUser($$value) {
			currentUser($$value);
			$.flush();
		}
	};

	Nested($$anchor, {
		get user() {
			return currentUser();
		}
	});

	return $.pop($$exports);
}