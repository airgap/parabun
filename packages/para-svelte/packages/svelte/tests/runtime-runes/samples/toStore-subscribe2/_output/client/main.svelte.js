import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { toStore } from "svelte/store";

var root = $.from_html(`<div> </div> <div> </div> <button>Add 1</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	const $count = () => $.store_get(count, '$count', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let counter = $.state(0);
	const count = toStore(() => $.get(counter), (value) => $.set(counter, value, true));
	var fragment = root();
	var div = $.first_child(fragment);
	var text = $.child(div);

	$.reset(div);

	var div_1 = $.sibling(div, 2);
	var text_1 = $.child(div_1);

	$.reset(div_1);

	var button = $.sibling(div_1, 2);

	$.template_effect(() => {
		$.set_text(text, `Count ${$.get(counter) ?? ''}!`);
		$.set_text(text_1, `Count from store ${$count() ?? ''}!`);
	});

	$.delegated('click', button, () => $.set(counter, $.get(counter) + 1));
	$.append($$anchor, fragment);
	$.pop();
	$$cleanup();
}

$.delegate(['click']);