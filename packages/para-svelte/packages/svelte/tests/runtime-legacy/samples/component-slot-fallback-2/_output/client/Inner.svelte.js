import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { model } from "./store.svelte";

var root = $.from_html(`<input/> `, 1);

export default function Inner($$anchor, $$props) {
	$.push($$props, false);

	const $model = () => $.store_get(model, '$model', $$stores);
	const [$$stores, $$cleanup] = $.setup_stores();
	let value = $.prop($$props, 'value', 12, '');

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		}
	};

	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);

	var text = $.sibling(input);

	$.template_effect(() => $.set_text(text, ` ${value() ?? ''}`));
	$.bind_value(input, $model, ($$value) => $.store_set(model, $$value));
	$.append($$anchor, fragment);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}