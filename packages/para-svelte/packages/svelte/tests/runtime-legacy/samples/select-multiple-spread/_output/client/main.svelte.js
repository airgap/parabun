import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Select from './select.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let attrs = $.prop($$props, 'attrs', 28, () => ({ value: ['1'] }));

	var $$exports = {
		get attrs() {
			return attrs();
		},

		set attrs($$value) {
			attrs($$value);
			$.flush();
		}
	};

	Select($$anchor, {
		get attrs() {
			return attrs();
		}
	});

	return $.pop($$exports);
}