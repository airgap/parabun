import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

var root = $.from_html(`<input class="input" type="text" placeholder="Type here"/> `, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const $validity = () => $.store_get(validity, '$validity', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();

	function createValidator() {
		const { subscribe, set } = writable({ dirty: false, valid: false });

		function action(node, binding) {
			return {
				update(value) {
					set({ dirty: true, valid: value !== '' });
				}
			};
		}

		return [{ subscribe }, action];
	}

	const [validity, validate] = createValidator();
	let email = $.mutable_source(null);
	var $$exports = { createValidator };

	$.init();

	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);
	$.effect(() => $.bind_value(input, () => $.get(email), ($$value) => $.set(email, $$value)));
	$.action(input, ($$node, $$action_arg) => validate?.($$node, $$action_arg), () => $.get(email));

	var text = $.sibling(input);

	$.template_effect(() => $.set_text(text, ` Dirty: ${($validity(), $.untrack(() => $validity().dirty)) ?? ''}
Valid: ${($validity(), $.untrack(() => $validity().valid)) ?? ''}`));

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'createValidator', createValidator);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}