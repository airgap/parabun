import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input/> <div class="svelte-xyz">Should be red, when input is focused</div>`, 1);

export default function Input($$anchor) {
	const test = { placeholder: 'Text' };
	var fragment = root();
	var input = $.first_child(fragment);

	$.attribute_effect(input, () => ({ ...test }), void 0, void 0, void 0, 'svelte-xyz', true);
	$.next(2);
	$.append($$anchor, fragment);
}