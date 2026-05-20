import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { SvelteSet } from 'svelte/reactivity';

var root_1 = $.from_html(`<div> </div>`);
var root = $.from_html(`<form><input name="name"/> <button>Add</button></form> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	const set = new SvelteSet();
	var fragment = root();
	var form = $.first_child(fragment);
	var node = $.sibling(form, 2);

	$.each(node, 17, () => set, $.index, ($$anchor, item) => {
		var div = root_1();
		var text = $.child(div, true);

		$.reset(div);
		$.template_effect(() => $.set_text(text, $.get(item).name));
		$.append($$anchor, div);
	});

	$.event('submit', form, (e) => {
		e.preventDefault();

		const data = new FormData(e.target);
		const state = $.proxy({ name: data.get('name') });

		set.add(state);
		e.target.reset();
	});

	$.append($$anchor, fragment);
	$.pop();
}