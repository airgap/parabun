import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { spread } from './spread.js';

var root = $.from_html(`<div><p>static stuff</p></div> <div><p> </p></div> <button>unused</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let dynamic = $.mutable_source('dynamic');

	$.init();

	var fragment = root();
	var div = $.first_child(fragment);
	var p = $.child(div);

	$.attribute_effect(p, ($0) => ({ ...$0 }), [() => spread()]);
	$.reset(div);

	var div_1 = $.sibling(div, 2);
	var p_1 = $.child(div_1);

	$.attribute_effect(p_1, ($0) => ({ ...$0 }), [() => spread()]);

	var text = $.child(p_1);

	$.reset(p_1);
	$.reset(div_1);

	var button = $.sibling(div_1, 2);

	$.template_effect(() => $.set_text(text, `${$.get(dynamic) ?? ''} stuff`));
	$.event('click', button, () => $.set(dynamic, ''));
	$.append($$anchor, fragment);
	$.pop();
}