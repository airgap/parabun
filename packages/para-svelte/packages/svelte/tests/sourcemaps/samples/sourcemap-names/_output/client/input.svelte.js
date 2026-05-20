import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1>use-names</h1> <div class="svelte-f3mzam"> </div> <pre style="color: var(--baz)"></pre>`, 1);

export default function Input($$anchor, $$props) {
	$.push($$props, false);

	let new_name_1 = $.prop($$props, 'new_name_1', 24, () => ({ bar: 5 }));
	let new_name_2 = 'value_2';

	$.init();

	var fragment = root();
	var div = $.sibling($.first_child(fragment), 2);
	var text = $.child(div, true);

	$.reset(div);

	var pre = $.sibling(div, 2);

	pre.textContent = 'value_2';

	$.template_effect(() => $.set_text(text, (
		$.deep_read_state(new_name_1()),
		$.untrack(() => new_name_1().bar)
	)));

	$.append($$anchor, fragment);
	$.pop();
}