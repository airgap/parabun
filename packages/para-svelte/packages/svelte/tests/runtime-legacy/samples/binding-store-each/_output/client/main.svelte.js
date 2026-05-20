import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { derived, writable } from "svelte/store";

var root_1 = $.from_html(`<input type="checkbox"/>`);
var root = $.from_html(`<!> `, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $checks = () => $.store_get(checks, '$checks', $$stores);
	const $countChecked = () => $.store_get(countChecked, '$countChecked', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	const checks = writable([false, false, false]);
	const countChecked = derived(checks, ($checks) => $checks.filter(Boolean).length);

	$.init();

	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 1, $checks, $.index, ($$anchor, checked, $$index) => {
		var input = root_1();

		$.remove_input_defaults(input);

		$.bind_checked(input, () => $checks()[$$index], ($$value) => (
			$checks()[$$index] = $$value,
			$.invalidate_inner_signals(() => ($checks())),
			$.invalidate_store($$stores, '$checks')
		));

		$.append($$anchor, input);
	});

	var text = $.sibling(node);

	$.template_effect(() => $.set_text(text, ` ${$countChecked() ?? ''}`));
	$.append($$anchor, fragment);
	$.pop();
	$$cleanup();
}