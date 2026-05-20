import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor) {
	const a = ($$anchor) => {
		$.next();

		var text = $.text();

		text.nodeValue = 'a';
		$.append($$anchor, text);
	};

	const b = ($$anchor) => {
		a($$anchor);
	};

	let abc = 'a';

	b($$anchor);
}