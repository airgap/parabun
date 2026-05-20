import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor) {
	const test = async () => "test";
	var $$promises = $.run([test, () => void 0]);

	$.next();

	var text = $.text('works');

	$.append($$anchor, text);
}