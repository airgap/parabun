import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { spring } from 'svelte/motion';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $x = () => $.store_get(x, '$x', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	const x = spring(0);

	x.set(1);
	$.init();

	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, $x()));
	$.append($$anchor, p);
	$.pop();
	$$cleanup();
}