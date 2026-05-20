import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Parent[$.FILENAME] = 'Parent.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button></button> <button></button> `, 1), Parent[$.FILENAME], [[5, 0], [6, 0]]);

export default function Parent($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Parent);

	var $$ownership_validator = $.create_ownership_validator($$props);
	let test = $.prop($$props, 'test', 31, () => $.tag_proxy($.proxy({}), 'test'));
	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var text = $.sibling(button_1);

	$.template_effect(() => $.set_text(text, ` ${test() ?? ''}`));

	$.delegated('click', button, function click() {
		return test({});
	});

	$.delegated('click', button_1, function click_1() {
		return $$ownership_validator.mutation('test', ['test', 'test'], test(test().test = {}, true), 6, 21);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);