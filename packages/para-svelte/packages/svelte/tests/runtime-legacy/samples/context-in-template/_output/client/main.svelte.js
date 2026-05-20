import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { getContext, setContext } from 'svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);
	setContext('val', 'hello world');

	const get_val = () => {
		return getContext('val');
	};

	$.init();
	$.next();

	var text = $.text();

	$.template_effect(($0) => $.set_text(text, $0), [() => ($.untrack(get_val))]);
	$.append($$anchor, text);
	$.pop();
}